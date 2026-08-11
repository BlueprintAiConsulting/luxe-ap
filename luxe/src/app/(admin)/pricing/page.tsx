
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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Pricing & Rules</h1>
        <div className="flex space-x-2 bg-neutral-100 p-1 rounded-lg">
          <button onClick={() => setTab('rules')} className={`px-4 py-2 rounded-md font-medium transition-colors ${tab === 'rules' ? 'bg-white shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}>Rule Set Editor</button>
          <button onClick={() => setTab('airports')} className={`px-4 py-2 rounded-md font-medium transition-colors ${tab === 'airports' ? 'bg-white shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}>Airports & Zones</button>
          <button onClick={() => setTab('test')} className={`px-4 py-2 rounded-md font-medium transition-colors ${tab === 'test' ? 'bg-white shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}>Test Panel</button>
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

      // Write new rule set
      await setDoc(doc(db, 'pricingRuleSets', newRuleSetId).withConverter(pricingRuleSetConverter), newRuleSet);
      
      // Update global settings
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

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-neutral-400" /></div>;

  if (!ruleSet) {
    return <div className="p-8 text-center border rounded-xl bg-neutral-50 text-neutral-500">No active rule set found. Please run the seed script.</div>;
  }

  // Helper for deeply nested updates
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
    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
      <div className="bg-neutral-50 border-b p-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Active Rules: v{ruleSet.version}</h2>
          <p className="text-sm text-neutral-500 mb-1">Editing this will create v{ruleSet.version + 1} upon publishing.</p>
          <div className="text-xs bg-yellow-100 text-yellow-800 p-2 rounded border border-yellow-200 inline-block">
            <strong>Note:</strong> These values come from the client's discovery answers and should not be guessed.
          </div>
        </div>
        <button onClick={handlePublish} disabled={saving} className="bg-brand text-white px-6 py-2 rounded-lg font-medium hover:bg-neutral-800 flex items-center">
          {saving ? <Loader2 className="animate-spin mr-2" size={18} /> : <CheckCircle2 className="mr-2" size={18} />}
          Publish New Version
        </button>
      </div>

      <div className="p-6 space-y-12">
        <section>
          <h3 className="text-lg font-bold mb-4 border-b pb-2">Base Rates by Class</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.keys(ruleSet.classRates).map(classId => {
              const rates = ruleSet.classRates[classId];
              return (
                <div key={classId} className="border p-4 rounded-lg bg-neutral-50">
                  <h4 className="font-bold text-md capitalize mb-3">{classId}</h4>
                  <div className="space-y-3">
                    <div><label className="block text-xs text-neutral-500">Base Fare ($)</label><input type="number" value={rates.baseFareCents / 100} onChange={e => updateRates(classId, 'baseFareCents', parseFloat(e.target.value) * 100)} className="w-full border p-1 rounded" /></div>
                    <div><label className="block text-xs text-neutral-500">Per Mile ($)</label><input type="number" value={rates.perMileCents / 100} onChange={e => updateRates(classId, 'perMileCents', parseFloat(e.target.value) * 100)} className="w-full border p-1 rounded" /></div>
                    <div><label className="block text-xs text-neutral-500">Per Minute ($)</label><input type="number" value={rates.perMinuteCents / 100} onChange={e => updateRates(classId, 'perMinuteCents', parseFloat(e.target.value) * 100)} className="w-full border p-1 rounded" /></div>
                    <div><label className="block text-xs text-neutral-500">Minimum Fare ($)</label><input type="number" value={rates.minimumFareCents / 100} onChange={e => updateRates(classId, 'minimumFareCents', parseFloat(e.target.value) * 100)} className="w-full border p-1 rounded" /></div>
                    <div><label className="block text-xs text-neutral-500">Hourly Rate ($)</label><input type="number" value={rates.hourlyRateCents / 100} onChange={e => updateRates(classId, 'hourlyRateCents', parseFloat(e.target.value) * 100)} className="w-full border p-1 rounded" /></div>
                    <div><label className="block text-xs text-neutral-500">Hourly Min (Hours)</label><input type="number" value={rates.hourlyMinimumHours} onChange={e => updateRates(classId, 'hourlyMinimumHours', parseInt(e.target.value))} className="w-full border p-1 rounded" /></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4 border-b pb-2">Gratuity</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input type="checkbox" checked={ruleSet.gratuity.autoAdd} onChange={e => setRuleSet({...ruleSet, gratuity: {...ruleSet.gratuity, autoAdd: e.target.checked}})} id="autoAdd" />
                <label htmlFor="autoAdd">Auto-add Gratuity</label>
              </div>
              <div>
                <label className="block text-sm font-medium">Percent (%)</label>
                <input type="number" value={ruleSet.gratuity.percent} onChange={e => setRuleSet({...ruleSet, gratuity: {...ruleSet.gratuity, percent: parseFloat(e.target.value)}})} className="border p-2 rounded w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium">Applies To</label>
                <select value={ruleSet.gratuity.appliesTo} onChange={e => setRuleSet({...ruleSet, gratuity: {...ruleSet.gratuity, appliesTo: e.target.value as any}})} className="border p-2 rounded w-full">
                  <option value="subtotal">Subtotal (incl surcharges)</option>
                  <option value="base_only">Base Fare Only</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4 border-b pb-2">Wait Time</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Free Minutes (Standard)</label>
                <input type="number" value={ruleSet.waitTime.freeMinutesStandard} onChange={e => setRuleSet({...ruleSet, waitTime: {...ruleSet.waitTime, freeMinutesStandard: parseInt(e.target.value)}})} className="border p-2 rounded w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium">Free Minutes (Airport)</label>
                <input type="number" value={ruleSet.waitTime.freeMinutesAirport} onChange={e => setRuleSet({...ruleSet, waitTime: {...ruleSet.waitTime, freeMinutesAirport: parseInt(e.target.value)}})} className="border p-2 rounded w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium">Per Minute Charge ($)</label>
                <input type="number" value={ruleSet.waitTime.perMinuteCents / 100} onChange={e => setRuleSet({...ruleSet, waitTime: {...ruleSet.waitTime, perMinuteCents: parseFloat(e.target.value) * 100}})} className="border p-2 rounded w-full" />
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-bold mb-4 border-b pb-2">Surcharges</h3>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium">Extra Stop Fee ($)</label>
              <input type="number" value={ruleSet.surcharges.extraStopCents / 100} onChange={e => setRuleSet({...ruleSet, surcharges: {...ruleSet.surcharges, extraStopCents: parseFloat(e.target.value) * 100}})} className="border p-2 rounded w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium">Meet & Greet Fee ($)</label>
              <input type="number" value={ruleSet.surcharges.meetGreetCents / 100} onChange={e => setRuleSet({...ruleSet, surcharges: {...ruleSet.surcharges, meetGreetCents: parseFloat(e.target.value) * 100}})} className="border p-2 rounded w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium">Child Seat Fee ($)</label>
              <input type="number" value={ruleSet.surcharges.childSeatCents / 100} onChange={e => setRuleSet({...ruleSet, surcharges: {...ruleSet.surcharges, childSeatCents: parseFloat(e.target.value) * 100}})} className="border p-2 rounded w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium">Tax Percent (%)</label>
              <input type="number" value={ruleSet.taxPercent} onChange={e => setRuleSet({...ruleSet, taxPercent: parseFloat(e.target.value)})} className="border p-2 rounded w-full" />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4 border-b pb-2">Holidays</h3>
            <div className="space-y-4">
              {ruleSet.surcharges.holidays.map((h, i) => (
                <div key={i} className="flex space-x-2 items-center bg-neutral-50 p-2 border rounded">
                  <input type="date" value={h.date} onChange={e => {
                    const hols = [...ruleSet.surcharges.holidays];
                    hols[i].date = e.target.value;
                    setRuleSet({...ruleSet, surcharges: { ...ruleSet.surcharges, holidays: hols } });
                  }} className="border p-1 rounded" />
                  <input type="text" placeholder="Name" value={h.name} onChange={e => {
                    const hols = [...ruleSet.surcharges.holidays];
                    hols[i].name = e.target.value;
                    setRuleSet({...ruleSet, surcharges: { ...ruleSet.surcharges, holidays: hols } });
                  }} className="border p-1 rounded w-full" />
                  <input type="number" step="0.1" placeholder="Percent" value={h.percent} onChange={e => {
                    const hols = [...ruleSet.surcharges.holidays];
                    hols[i].percent = parseFloat(e.target.value);
                    setRuleSet({...ruleSet, surcharges: { ...ruleSet.surcharges, holidays: hols } });
                  }} className="border p-1 rounded w-24" />
                  <button onClick={() => {
                    const hols = [...ruleSet.surcharges.holidays];
                    hols.splice(i, 1);
                    setRuleSet({...ruleSet, surcharges: { ...ruleSet.surcharges, holidays: hols } });
                  }} className="text-red-500 px-2">X</button>
                </div>
              ))}
              <button onClick={() => setRuleSet({...ruleSet, surcharges: { ...ruleSet.surcharges, holidays: [...ruleSet.surcharges.holidays, {date: '', name: '', percent: 1.5, flatCents: 0}] } })} className="text-sm text-blue-600 font-medium">+ Add Holiday</button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4 border-b pb-2">Cancellation Windows</h3>
            <div className="space-y-4">
              {ruleSet.cancellation.map((cw: any, i: number) => (
                <div key={i} className="flex space-x-2 items-center bg-neutral-50 p-2 border rounded">
                  <div className="flex-1">
                    <label className="text-xs text-neutral-500 block">Hours Before</label>
                    <input type="number" value={cw.hoursBeforePickup} onChange={e => {
                      const cws = [...ruleSet.cancellation];
                      cws[i].hoursBeforePickup = parseInt(e.target.value);
                      setRuleSet({...ruleSet, cancellation: cws});
                    }} className="border p-1 rounded w-full" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-neutral-500 block">Fee %</label>
                    <input type="number" value={cw.feePercent} onChange={e => {
                      const cws = [...ruleSet.cancellation];
                      cws[i].feePercent = parseFloat(e.target.value);
                      setRuleSet({...ruleSet, cancellation: cws});
                    }} className="border p-1 rounded w-full" />
                  </div>
                  <button onClick={() => {
                    const cws = [...ruleSet.cancellation];
                    cws.splice(i, 1);
                    setRuleSet({...ruleSet, cancellation: cws});
                  }} className="text-red-500 px-2 mt-4">X</button>
                </div>
              ))}
              <button onClick={() => setRuleSet({...ruleSet, cancellation: [...ruleSet.cancellation, {hoursBeforePickup: 24, feePercent: 50, feeFlatCents: 0, appliesToClasses: "all"}]})} className="text-sm text-blue-600 font-medium">+ Add Window</button>
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

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-neutral-400" /></div>;

  return (
    <div className="bg-white border rounded-xl overflow-hidden shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Airport Zones</h2>
        <button className="bg-brand text-white px-4 py-2 rounded-lg flex items-center"><Plus size={16} className="mr-2"/> Add Airport</button>
      </div>

      <div className="space-y-6">
        {airports.map(apt => (
          <div key={apt.code} className="border rounded-lg overflow-hidden">
            <div className="bg-neutral-50 p-4 border-b flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">{apt.code} - {apt.name}</h3>
                <p className="text-sm text-neutral-500">TZ: {apt.timezone}</p>
              </div>
              <button className="text-blue-600 hover:text-blue-800"><Edit2 size={16}/></button>
            </div>
            <div className="p-4">
              <h4 className="font-medium mb-3">Zones</h4>
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-100">
                  <tr>
                    <th className="p-2">Zone</th>
                    <th className="p-2">Class</th>
                    <th className="p-2">Arrival $</th>
                    <th className="p-2">Departure $</th>
                  </tr>
                </thead>
                <tbody>
                  {apt.zones.map(z => (
                    Object.keys(z.flatRates).map(classId => (
                      <tr key={`${z.zoneId}-${classId}`} className="border-b last:border-0">
                        <td className="p-2 font-medium">{z.name}</td>
                        <td className="p-2 capitalize">{classId}</td>
                        <td className="p-2">${z.flatRates[classId].arrivalCents / 100}</td>
                        <td className="p-2">${z.flatRates[classId].departureCents / 100}</td>
                      </tr>
                    ))
                  ))}
                  {apt.zones.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-neutral-500">No zones defined.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {airports.length === 0 && <div className="text-center p-8 text-neutral-500 border rounded-lg">No airports defined. Run seed script.</div>}
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

  if (!ruleSet) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="grid grid-cols-2 gap-8">
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Quote Inputs</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Trip Type</label>
            <select value={input.tripType} onChange={e => setInput({...input, tripType: e.target.value as any})} className="border p-2 w-full rounded">
              <option value="point_to_point">Point to Point</option>
              <option value="hourly">Hourly</option>
              <option value="airport_arrival">Airport Arrival</option>
              <option value="airport_departure">Airport Departure</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Vehicle Class</label>
            <select value={input.classId} onChange={e => setInput({...input, classId: e.target.value})} className="border p-2 w-full rounded">
              {Object.keys(ruleSet.classRates).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Distance (Miles)</label>
              <input type="number" step="0.1" value={input.estimatedDistanceMiles} onChange={e => setInput({...input, estimatedDistanceMiles: parseFloat(e.target.value)})} className="border p-2 w-full rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium">Duration (Minutes)</label>
              <input type="number" value={input.estimatedDurationMinutes} onChange={e => setInput({...input, estimatedDurationMinutes: parseInt(e.target.value)})} className="border p-2 w-full rounded" />
            </div>
          </div>
          {input.tripType === 'hourly' && (
            <div>
              <label className="block text-sm font-medium">Hours</label>
              <input type="number" value={input.hours || 0} onChange={e => setInput({...input, hours: parseInt(e.target.value)})} className="border p-2 w-full rounded" />
            </div>
          )}
          {(input.tripType === 'airport_arrival' || input.tripType === 'airport_departure') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Airport Code</label>
                <input type="text" value={input.airportCode || ''} onChange={e => setInput({...input, airportCode: e.target.value})} className="border p-2 w-full rounded uppercase" />
              </div>
              <div>
                <label className="block text-sm font-medium">Zone ID (e.g. downtown_la)</label>
                <input type="text" value={input.airportZoneId || ''} onChange={e => setInput({...input, airportZoneId: e.target.value})} className="border p-2 w-full rounded" />
              </div>
            </div>
          )}
          <button onClick={handleTest} className="w-full bg-brand text-white py-3 rounded-lg font-bold hover:bg-neutral-800">
            Calculate Quote
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Price Breakdown</h2>
        {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}
        {result && (
          <div className="space-y-4">
            <div className="bg-neutral-50 p-4 rounded-lg border">
              <h3 className="font-bold text-neutral-500 text-sm r mb-3">Line Items</h3>
              <div className="space-y-2">
                {result.lineItems.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium">{item.label}</span>
                      {item.detail && <span className="text-neutral-500 ml-2 text-xs">({item.detail})</span>}
                    </div>
                    <span>{formatMoney(item.amountCents)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t mt-4 pt-4 space-y-2 text-sm">
                <div className="flex justify-between font-bold">
                  <span>Subtotal</span>
                  <span>${(result.subtotalCents / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Gratuity ({result.gratuityPercent}%)</span>
                  <span>${(result.gratuityCents / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Taxes</span>
                  <span>${(result.taxCents / 100).toFixed(2)}</span>
                </div>
              </div>
              <div className="border-t mt-4 pt-4 flex justify-between text-xl font-bold">
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
