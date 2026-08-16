
'use client';

import { useState, useEffect } from 'react';
import { collection, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { pricingRuleSetConverter, globalSettingsConverter, airportConverter } from '@/lib/firebase/converters';
import { PricingRuleSet, QuoteInput } from '@/lib/types/pricing';
import { GlobalSettings } from '@/lib/types/settings';
import { Airport } from '@/lib/types/airport';
import { Loader2, Plus, Trash2, Edit2, CheckCircle2 } from 'lucide-react';
import { formatMoney } from '@/lib/format';

import { calculatePrice } from '../../../../functions/src/pricing/index';
import { Timestamp } from 'firebase/firestore';

export default function PricingAdminPage() {
  const [tab, setTab] = useState<'rules' | 'airports' | 'test'>('rules');

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto min-h-screen bg-[#060608] text-white font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-[10px] font-bold uppercase tracking-widest mb-1.5 font-mono shadow-gold-sm">
            Revenue Architecture
          </div>
          <h1 className="text-3xl font-bold font-serif text-white tracking-tight">Pricing & Fare Rules</h1>
          <p className="text-neutral-400 text-xs sm:text-sm mt-0.5 font-medium">Configure vehicle class rates, airport surcharges, and wait-time algorithms.</p>
        </div>
        <div className="flex space-x-1.5 bg-[#0e0e13] border border-neutral-800 p-1.5 rounded-2xl shadow-gold-sm self-start sm:self-auto">
          <button 
            onClick={() => setTab('rules')} 
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'rules' ? 'bg-gold-gradient text-neutral-950 shadow-gold-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Rule Set Editor
          </button>
          <button 
            onClick={() => setTab('airports')} 
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'airports' ? 'bg-gold-gradient text-neutral-950 shadow-gold-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Airports & Zones
          </button>
          <button 
            onClick={() => setTab('test')} 
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'test' ? 'bg-gold-gradient text-neutral-950 shadow-gold-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Test Panel
          </button>
        </div>
      </div>

      {tab === 'rules' && <RuleSetEditorTab />}
      {tab === 'airports' && <AirportsTab />}
      {tab === 'test' && <TestPanelTab />}
    </div>
  );
}

function RuleSetEditorTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ruleSet, setRuleSet] = useState<PricingRuleSet | null>(null);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);

  useEffect(() => {
    const fetchActiveRuleSet = async () => {
      const gsSnap = await getDoc(doc(db, 'settings', 'global').withConverter(globalSettingsConverter));
      if (gsSnap.exists()) {
        const gs = gsSnap.data();
        setGlobalSettings(gs);
        if (gs.activePricingRuleSetId) {
          const rsSnap = await getDoc(doc(db, 'pricingRuleSets', gs.activePricingRuleSetId).withConverter(pricingRuleSetConverter));
          if (rsSnap.exists()) {
            setRuleSet(rsSnap.data());
          }
        }
      }
      setLoading(false);
    };
    fetchActiveRuleSet();
  }, []);

  const handlePublish = async () => {
    if (!ruleSet || !globalSettings) return;
    if (!confirm('Publish new pricing version? This will become immediately active.')) return;
    setSaving(true);
    try {
      const newVersion = ruleSet.version + 1;
      const newRuleSetId = `rule_set_v${newVersion}`;
      const newRuleSet: PricingRuleSet = {
        ...ruleSet,
        ruleSetId: newRuleSetId,
        version: newVersion,
        effectiveFrom: Timestamp.now() as any
      };

      await setDoc(doc(db, 'pricingRuleSets', newRuleSetId).withConverter(pricingRuleSetConverter), newRuleSet);
      await setDoc(doc(db, 'settings', 'global'), { activePricingRuleSetId: newRuleSetId }, { merge: true });
      
      setRuleSet(newRuleSet);
      alert(`Published v${newVersion} successfully!`);
    } catch (e) {
      console.error(e);
      alert('Failed to publish');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-accent" /></div>;

  if (!ruleSet) {
    return <div className="p-8 text-center rounded-2xl bg-[#0e0e13] border border-neutral-800 text-neutral-400">No active rule set found. Please run the seed script.</div>;
  }

  const updateRates = (classId: string, field: string, value: number) => {
    setRuleSet(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        classRates: {
          ...prev.classRates,
          [classId]: {
            ...prev.classRates[classId],
            [field]: value
          }
        }
      };
    });
  };

  return (
    <div className="bg-[#0e0e13] rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl">
      <div className="bg-[#0a0a0e] border-b border-neutral-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif text-white">Active Rules: v{ruleSet.version}</h2>
          <p className="text-xs text-neutral-400 mb-1">Publishing will create and activate v{ruleSet.version + 1} instantly.</p>
          <div className="text-[11px] bg-accent/15 text-accent px-2.5 py-1 rounded-lg border border-accent/30 inline-block font-mono">
            <strong>Active Rule Set:</strong> Synchronized with live booking engine
          </div>
        </div>
        <button 
          onClick={handlePublish} 
          disabled={saving} 
          className="min-h-[44px] bg-gold-gradient text-neutral-950 px-6 py-2.5 rounded-xl font-bold hover:brightness-110 flex items-center justify-center shadow-gold-sm transition-all text-xs uppercase tracking-wider"
        >
          {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle2 className="mr-2" size={16} />}
          Publish New Version
        </button>
      </div>

      <div className="p-6 space-y-12">
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider text-accent font-mono mb-4 border-b border-neutral-800 pb-2">Base Rates by Class</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.keys(ruleSet.classRates).map(classId => {
              const rates = ruleSet.classRates[classId];
              return (
                <div key={classId} className="p-5 rounded-2xl bg-[#060608] border border-neutral-800 shadow-md">
                  <h4 className="font-bold text-base capitalize mb-3 text-white font-serif">{classId.replace(/_/g, " ")}</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-neutral-500 font-mono mb-1">Base Fare ($)</label>
                      <input type="number" value={rates.baseFareCents / 100} onChange={e => updateRates(classId, 'baseFareCents', parseFloat(e.target.value) * 100)} className="w-full border border-neutral-700 p-2.5 rounded-xl focus:border-accent text-white outline-none transition-all bg-[#181822] text-xs font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-neutral-500 font-mono mb-1">Per Mile ($)</label>
                      <input type="number" value={rates.perMileCents / 100} onChange={e => updateRates(classId, 'perMileCents', parseFloat(e.target.value) * 100)} className="w-full border border-neutral-700 p-2.5 rounded-xl focus:border-accent text-white outline-none transition-all bg-[#181822] text-xs font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-neutral-500 font-mono mb-1">Per Minute ($)</label>
                      <input type="number" value={rates.perMinuteCents / 100} onChange={e => updateRates(classId, 'perMinuteCents', parseFloat(e.target.value) * 100)} className="w-full border border-neutral-700 p-2.5 rounded-xl focus:border-accent text-white outline-none transition-all bg-[#181822] text-xs font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-neutral-500 font-mono mb-1">Minimum Fare ($)</label>
                      <input type="number" value={rates.minimumFareCents / 100} onChange={e => updateRates(classId, 'minimumFareCents', parseFloat(e.target.value) * 100)} className="w-full border border-neutral-700 p-2.5 rounded-xl focus:border-accent text-white outline-none transition-all bg-[#181822] text-xs font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-neutral-500 font-mono mb-1">Hourly Rate ($)</label>
                      <input type="number" value={rates.hourlyRateCents / 100} onChange={e => updateRates(classId, 'hourlyRateCents', parseFloat(e.target.value) * 100)} className="w-full border border-neutral-700 p-2.5 rounded-xl focus:border-accent text-white outline-none transition-all bg-[#181822] text-xs font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-neutral-500 font-mono mb-1">Hourly Min (Hours)</label>
                      <input type="number" value={rates.hourlyMinimumHours} onChange={e => updateRates(classId, 'hourlyMinimumHours', parseInt(e.target.value))} className="w-full border border-neutral-700 p-2.5 rounded-xl focus:border-accent text-white outline-none transition-all bg-[#181822] text-xs font-mono" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-5 rounded-2xl bg-[#060608] border border-neutral-800 shadow-md">
            <h3 className="text-xs font-bold uppercase tracking-wider text-accent font-mono mb-4 border-b border-neutral-800 pb-2">Gratuity Rules</h3>
            <div className="space-y-4 text-xs font-mono">
              <div className="flex items-center space-x-2">
                <input type="checkbox" checked={ruleSet.gratuity.autoAdd} onChange={e => setRuleSet({...ruleSet, gratuity: {...ruleSet.gratuity, autoAdd: e.target.checked}})} id="autoAdd" className="rounded accent-[#d4af37]" />
                <label htmlFor="autoAdd" className="text-neutral-300 font-bold">Auto-add Gratuity to Reservations</label>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1">Percent (%)</label>
                <input type="number" value={ruleSet.gratuity.percent} onChange={e => setRuleSet({...ruleSet, gratuity: {...ruleSet.gratuity, percent: parseFloat(e.target.value)}})} className="border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent w-full" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1">Applies To</label>
                <select value={ruleSet.gratuity.appliesTo} onChange={e => setRuleSet({...ruleSet, gratuity: {...ruleSet.gratuity, appliesTo: e.target.value as any}})} className="border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent w-full">
                  <option value="subtotal">Subtotal (incl surcharges)</option>
                  <option value="base_only">Base Fare Only</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#060608] border border-neutral-800 shadow-md">
            <h3 className="text-xs font-bold uppercase tracking-wider text-accent font-mono mb-4 border-b border-neutral-800 pb-2">Wait Time Grace & Rates</h3>
            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1">Free Minutes (Standard)</label>
                <input type="number" value={ruleSet.waitTime.freeMinutesStandard} onChange={e => setRuleSet({...ruleSet, waitTime: {...ruleSet.waitTime, freeMinutesStandard: parseInt(e.target.value)}})} className="border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent w-full" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1">Free Minutes (Airport Arrivals)</label>
                <input type="number" value={ruleSet.waitTime.freeMinutesAirport} onChange={e => setRuleSet({...ruleSet, waitTime: {...ruleSet.waitTime, freeMinutesAirport: parseInt(e.target.value)}})} className="border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent w-full" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1">Per Minute Charge ($)</label>
                <input type="number" value={ruleSet.waitTime.perMinuteCents / 100} onChange={e => setRuleSet({...ruleSet, waitTime: {...ruleSet.waitTime, perMinuteCents: parseFloat(e.target.value) * 100}})} className="border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent w-full" />
              </div>
            </div>
          </div>
        </section>

        <section className="p-5 rounded-2xl bg-[#060608] border border-neutral-800 shadow-md">
          <h3 className="text-xs font-bold uppercase tracking-wider text-accent font-mono mb-4 border-b border-neutral-800 pb-2">Surcharges & Taxes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-xs font-mono">
            <div>
              <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1">Extra Stop Fee ($)</label>
              <input type="number" value={ruleSet.surcharges.extraStopCents / 100} onChange={e => setRuleSet({...ruleSet, surcharges: {...ruleSet.surcharges, extraStopCents: parseFloat(e.target.value) * 100}})} className="border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent w-full" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1">Meet & Greet Fee ($)</label>
              <input type="number" value={ruleSet.surcharges.meetGreetCents / 100} onChange={e => setRuleSet({...ruleSet, surcharges: {...ruleSet.surcharges, meetGreetCents: parseFloat(e.target.value) * 100}})} className="border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent w-full" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1">Child Seat Fee ($)</label>
              <input type="number" value={ruleSet.surcharges.childSeatCents / 100} onChange={e => setRuleSet({...ruleSet, surcharges: {...ruleSet.surcharges, childSeatCents: parseFloat(e.target.value) * 100}})} className="border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent w-full" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1">Tax Percent (%)</label>
              <input type="number" value={ruleSet.taxPercent} onChange={e => setRuleSet({...ruleSet, taxPercent: parseFloat(e.target.value)})} className="border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent w-full" />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-5 rounded-2xl bg-[#060608] border border-neutral-800 shadow-md">
            <h3 className="text-xs font-bold uppercase tracking-wider text-accent font-mono mb-4 border-b border-neutral-800 pb-2">Holiday Surcharges</h3>
            <div className="space-y-4 text-xs font-mono">
              {ruleSet.surcharges.holidays.map((h, i) => (
                <div key={i} className="flex space-x-2 items-center bg-[#181822] p-2 rounded-xl border border-neutral-700">
                  <input type="date" value={h.date} onChange={e => {
                    const hols = [...ruleSet.surcharges.holidays];
                    hols[i].date = e.target.value;
                    setRuleSet({...ruleSet, surcharges: { ...ruleSet.surcharges, holidays: hols } });
                  }} className="border border-neutral-700 p-2 rounded-lg text-white outline-none bg-[#0e0e13]" />
                  <input type="text" placeholder="Name" value={h.name} onChange={e => {
                    const hols = [...ruleSet.surcharges.holidays];
                    hols[i].name = e.target.value;
                    setRuleSet({...ruleSet, surcharges: { ...ruleSet.surcharges, holidays: hols } });
                  }} className="border border-neutral-700 p-2 rounded-lg text-white outline-none bg-[#0e0e13] w-full" />
                  <input type="number" step="0.1" placeholder="Multiplier" value={h.percent} onChange={e => {
                    const hols = [...ruleSet.surcharges.holidays];
                    hols[i].percent = parseFloat(e.target.value);
                    setRuleSet({...ruleSet, surcharges: { ...ruleSet.surcharges, holidays: hols } });
                  }} className="border border-neutral-700 p-2 rounded-lg text-white outline-none bg-[#0e0e13] w-20" />
                  <button onClick={() => {
                    const hols = [...ruleSet.surcharges.holidays];
                    hols.splice(i, 1);
                    setRuleSet({...ruleSet, surcharges: { ...ruleSet.surcharges, holidays: hols } });
                  }} className="text-rose-400 hover:text-rose-300 px-2 font-bold">X</button>
                </div>
              ))}
              <button onClick={() => setRuleSet({...ruleSet, surcharges: { ...ruleSet.surcharges, holidays: [...ruleSet.surcharges.holidays, {date: '', name: '', percent: 1.5, flatCents: 0}] } })} className="text-xs text-accent font-bold hover:underline">+ Add Holiday</button>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#060608] border border-neutral-800 shadow-md">
            <h3 className="text-xs font-bold uppercase tracking-wider text-accent font-mono mb-4 border-b border-neutral-800 pb-2">Cancellation Windows</h3>
            <div className="space-y-4 text-xs font-mono">
              {ruleSet.cancellation.map((cw: any, i: number) => (
                <div key={i} className="flex space-x-2 items-center bg-[#181822] p-2 rounded-xl border border-neutral-700">
                  <div className="flex-1">
                    <label className="text-[10px] text-neutral-500 block uppercase mb-1">Hours Before</label>
                    <input type="number" value={cw.hoursBeforePickup} onChange={e => {
                      const cws = [...ruleSet.cancellation];
                      cws[i].hoursBeforePickup = parseInt(e.target.value);
                      setRuleSet({...ruleSet, cancellation: cws});
                    }} className="border border-neutral-700 p-2 rounded-lg text-white outline-none bg-[#0e0e13] w-full" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-neutral-500 block uppercase mb-1">Fee %</label>
                    <input type="number" value={cw.feePercent} onChange={e => {
                      const cws = [...ruleSet.cancellation];
                      cws[i].feePercent = parseFloat(e.target.value);
                      setRuleSet({...ruleSet, cancellation: cws});
                    }} className="border border-neutral-700 p-2 rounded-lg text-white outline-none bg-[#0e0e13] w-full" />
                  </div>
                  <button onClick={() => {
                    const cws = [...ruleSet.cancellation];
                    cws.splice(i, 1);
                    setRuleSet({...ruleSet, cancellation: cws});
                  }} className="text-rose-400 hover:text-rose-300 px-2 mt-4 font-bold">X</button>
                </div>
              ))}
              <button onClick={() => setRuleSet({...ruleSet, cancellation: [...ruleSet.cancellation, {hoursBeforePickup: 24, feePercent: 50, feeFlatCents: 0, appliesToClasses: "all"}]})} className="text-xs text-accent font-bold hover:underline">+ Add Window</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function AirportsTab() {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'airports').withConverter(airportConverter), snap => {
      const data: Airport[] = [];
      snap.forEach(d => data.push(d.data()));
      setAirports(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-accent" /></div>;

  return (
    <div className="bg-[#0e0e13] rounded-3xl border border-neutral-800 overflow-hidden p-6 shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold font-serif text-white">Airport Aviation Zones</h2>
          <p className="text-xs text-neutral-400 mt-0.5">Commercial terminals and private FBO airfield flat rates.</p>
        </div>
        <button className="min-h-[44px] bg-gold-gradient text-neutral-950 px-4 py-2 rounded-xl text-xs font-bold flex items-center shadow-gold-sm hover:brightness-110">
          <Plus size={16} className="mr-1.5"/> Add Airport
        </button>
      </div>

      <div className="space-y-6">
        {airports.map(apt => (
          <div key={apt.code} className="rounded-2xl overflow-hidden border border-neutral-800 bg-[#060608]">
            <div className="bg-[#0a0a0e] p-4 border-b border-neutral-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-white font-mono">{apt.code} — {apt.name}</h3>
                <p className="text-xs text-neutral-400">Timezone: {apt.timezone}</p>
              </div>
              <button className="text-accent hover:text-white p-2"><Edit2 size={16}/></button>
            </div>
            <div className="p-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-accent font-mono mb-3">Zone Flat Rates</h4>
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0a0a0e] text-neutral-400 uppercase text-[10px] border-b border-neutral-800">
                  <tr>
                    <th className="p-3">Zone</th>
                    <th className="p-3">Class</th>
                    <th className="p-3">Arrival $</th>
                    <th className="p-3">Departure $</th>
                  </tr>
                </thead>
                <tbody>
                  {apt.zones.map(z => (
                    Object.keys(z.flatRates).map(classId => (
                      <tr key={`${z.zoneId}-${classId}`} className="border-b border-neutral-800/60 hover:bg-[#14141c]">
                        <td className="p-3 font-medium text-white">{z.name}</td>
                        <td className="p-3 capitalize text-neutral-300">{classId}</td>
                        <td className="p-3 text-accent">${(z.flatRates[classId].arrivalCents / 100).toFixed(2)}</td>
                        <td className="p-3 text-accent">${(z.flatRates[classId].departureCents / 100).toFixed(2)}</td>
                      </tr>
                    ))
                  ))}
                  {apt.zones.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-neutral-500">No zones defined.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {airports.length === 0 && <div className="text-center p-8 text-neutral-500 border border-neutral-800 rounded-2xl">No airports defined. Run seed script.</div>}
      </div>
    </div>
  );
}

function TestPanelTab() {
  const [ruleSet, setRuleSet] = useState<PricingRuleSet | null>(null);
  const [airport, setAirport] = useState<Airport | null>(null);
  const [input, setInput] = useState<QuoteInput>({
    tripType: 'point_to_point',
    pickupAt: Timestamp.now() as any,
    timezone: 'America/Los_Angeles',
    classId: 'sedan',
    estimatedDistanceMiles: 15.5,
    estimatedDurationMinutes: 30,
    hours: null,
    airportCode: null,
    airportZoneId: null,
    extraStopCount: 0,
    greetingStyle: 'curbside',
    childSeatCount: 0,
    waitMinutes: 0,
    tollsCents: 0,
    parkingCents: 0,
    outOfAreaMiles: 0
  });

  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDeps = async () => {
      const gsSnap = await getDoc(doc(db, 'settings', 'global').withConverter(globalSettingsConverter));
      if (gsSnap.exists() && gsSnap.data().activePricingRuleSetId) {
        const rsSnap = await getDoc(doc(db, 'pricingRuleSets', gsSnap.data().activePricingRuleSetId).withConverter(pricingRuleSetConverter));
        if (rsSnap.exists()) setRuleSet(rsSnap.data());
      }
      
      const aptSnap = await getDoc(doc(db, 'airports', 'LAX').withConverter(airportConverter));
      if (aptSnap.exists()) setAirport(aptSnap.data());
    };
    fetchDeps();
  }, []);

  const handleTest = () => {
    if (!ruleSet) return setError('Rule set not loaded');
    try {
      const res = calculatePrice(input, ruleSet, new Date(), airport || undefined);
      setResult(res);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Error calculating price');
      setResult(null);
    }
  };

  if (!ruleSet) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-accent" /></div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-[#0e0e13] rounded-3xl border border-neutral-800 p-6 shadow-2xl">
        <h2 className="text-lg font-bold font-serif text-white mb-6">Quote Simulation Inputs</h2>
        <div className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Trip Type</label>
            <select value={input.tripType} onChange={e => setInput({...input, tripType: e.target.value as any})} className="border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent w-full">
              <option value="point_to_point">Point to Point</option>
              <option value="hourly">Hourly As-Directed</option>
              <option value="airport_arrival">Airport Arrival</option>
              <option value="airport_departure">Airport Departure</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Vehicle Class</label>
            <select value={input.classId} onChange={e => setInput({...input, classId: e.target.value})} className="border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent w-full capitalize">
              {Object.keys(ruleSet.classRates).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Distance (Miles)</label>
              <input type="number" step="0.1" value={input.estimatedDistanceMiles} onChange={e => setInput({...input, estimatedDistanceMiles: parseFloat(e.target.value)})} className="border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent w-full" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Duration (Minutes)</label>
              <input type="number" value={input.estimatedDurationMinutes} onChange={e => setInput({...input, estimatedDurationMinutes: parseInt(e.target.value)})} className="border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent w-full" />
            </div>
          </div>
          {input.tripType === 'hourly' && (
            <div>
              <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Hours</label>
              <input type="number" value={input.hours || 0} onChange={e => setInput({...input, hours: parseInt(e.target.value)})} className="border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent w-full" />
            </div>
          )}
          {(input.tripType === 'airport_arrival' || input.tripType === 'airport_departure') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Airport Code</label>
                <input type="text" value={input.airportCode || ''} onChange={e => setInput({...input, airportCode: e.target.value})} className="border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent w-full uppercase" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Zone ID</label>
                <input type="text" value={input.airportZoneId || ''} onChange={e => setInput({...input, airportZoneId: e.target.value})} className="border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent w-full" />
              </div>
            </div>
          )}
          <button onClick={handleTest} className="w-full min-h-[44px] bg-gold-gradient text-neutral-950 py-3 rounded-xl font-bold uppercase tracking-wider hover:brightness-110 shadow-gold-sm transition-all mt-2">
            Calculate Quote Breakdown
          </button>
        </div>
      </div>

      <div className="bg-[#0e0e13] rounded-3xl border border-neutral-800 p-6 shadow-2xl">
        <h2 className="text-lg font-bold font-serif text-white mb-6">Calculated Fare Breakdown</h2>
        {error && <div className="p-4 bg-rose-950/40 border border-rose-800/60 text-rose-300 rounded-2xl text-xs font-mono">{error}</div>}
        {result && (
          <div className="space-y-4">
            <div className="bg-[#060608] p-5 rounded-2xl border border-neutral-800 font-mono text-xs">
              <h3 className="font-bold text-accent uppercase text-[10px] tracking-wider mb-3">Line Items</h3>
              <div className="space-y-2">
                {result.lineItems.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <div>
                      <span className="font-medium text-white">{item.label}</span>
                      {item.detail && <span className="text-neutral-500 ml-2 text-[10px]">({item.detail})</span>}
                    </div>
                    <span className="text-neutral-300">{formatMoney(item.amountCents)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-neutral-800 mt-4 pt-4 space-y-2 text-xs">
                <div className="flex justify-between font-bold text-white">
                  <span>Subtotal</span>
                  <span>${(result.subtotalCents / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Gratuity ({result.gratuityPercent}%)</span>
                  <span>${(result.gratuityCents / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Taxes</span>
                  <span>${(result.taxCents / 100).toFixed(2)}</span>
                </div>
              </div>
              <div className="border-t border-neutral-800 mt-4 pt-4 flex justify-between text-base font-bold text-accent">
                <span>Estimated Total</span>
                <span>${(result.estimatedTotalCents / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
