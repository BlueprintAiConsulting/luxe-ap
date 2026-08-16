'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { driverConverter, driverCredentialsConverter } from '@/lib/firebase/converters';
import { Driver, DriverCredentials } from '@/lib/types/driver';
import { Plus, Edit2, Loader2, Image as ImageIcon, AlertTriangle, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { uploadImage } from '@/lib/uploadImage';

// Helper for date inputs
const toDateString = (ts: Timestamp | null | undefined): string => {
  if (!ts) return '';
  const d = ts.toDate();
  return d.toISOString().split('T')[0];
};

const fromDateString = (str: string): Timestamp | null => {
  if (!str) return null;
  // create date at noon UTC to avoid timezone shift issues parsing YYYY-MM-DD
  const [y, m, d] = str.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return Timestamp.fromDate(date);
};

export default function DriversAdminPage() {
  const [tab, setTab] = useState<'profiles' | 'credentials'>('profiles');

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto min-h-screen bg-[#060608] text-white font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-[10px] font-bold uppercase tracking-widest mb-1.5 font-mono shadow-gold-sm">
            Chauffeur Roster
          </div>
          <h1 className="text-3xl font-bold font-serif text-white tracking-tight">Driver Management</h1>
          <p className="text-neutral-400 text-xs sm:text-sm mt-0.5 font-medium">Manage certified executive chauffeurs, bios, ratings, and compliance credentials.</p>
        </div>
        <div className="flex space-x-1.5 bg-[#0e0e13] border border-neutral-800 p-1.5 rounded-2xl shadow-gold-sm self-start sm:self-auto">
          <button
            onClick={() => setTab('profiles')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'profiles' ? 'bg-gold-gradient text-neutral-950 shadow-gold-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Chauffeur Profiles
          </button>
          <button
            onClick={() => setTab('credentials')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'credentials' ? 'bg-gold-gradient text-neutral-950 shadow-gold-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Credentials (Private Vault)
          </button>
        </div>
      </div>

      {tab === 'profiles' ? <DriverProfilesTab /> : <DriverCredentialsTab />}
    </div>
  );
}

function DriverProfilesTab() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'drivers').withConverter(driverConverter), (snap) => {
      const results: Driver[] = [];
      snap.forEach(d => results.push(d.data()));
      setDrivers(results);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-accent" /></div>;

  return (
    <div>
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setEditingDriver({
            driverId: '', userId: '', displayName: '', photoUrl: '', bio: '', languages: ['English'], yearsExperience: 1, rating: 5.0, ratingCount: 0, active: true, bookable: true, createdAt: Timestamp.now()
          })}
          className="min-h-[44px] flex items-center space-x-2 bg-gold-gradient text-neutral-950 px-5 py-2.5 rounded-xl font-bold hover:brightness-110 transition-all shadow-gold-sm text-xs uppercase tracking-wider"
        >
          <Plus size={16} />
          <span>Add New Chauffeur</span>
        </button>
      </div>

      {editingDriver ? (
        <DriverProfileForm initialData={editingDriver} onClose={() => setEditingDriver(null)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drivers.map(d => (
            <div key={d.driverId} className="bg-[#0e0e13] border border-neutral-800 rounded-3xl text-white font-medium flex flex-col overflow-hidden shadow-xl hover:border-accent/40 transition-all">
              <div className="p-6 flex-1">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#181822] border-2 border-accent flex-shrink-0 overflow-hidden relative shadow-gold-sm">
                    {d.photoUrl ? <Image src={d.photoUrl} alt={d.displayName} fill sizes="64px" className="object-cover" /> : <ImageIcon className="w-full h-full text-neutral-500 p-4" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white font-serif">{d.displayName}</h3>
                    <p className="text-xs text-neutral-400 line-clamp-2 mt-1 leading-relaxed">{d.bio}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-mono text-neutral-400 bg-[#060608] p-3 rounded-2xl border border-neutral-800/80">
                  <div><span className="font-bold text-accent">Rating:</span> {d.rating.toFixed(1)} ★</div>
                  <div><span className="font-bold text-accent">Experience:</span> {d.yearsExperience} yrs</div>
                  <div className="col-span-2 truncate"><span className="font-bold text-accent">Languages:</span> {d.languages.join(', ')}</div>
                </div>
              </div>
              <div className="bg-[#0a0a0e] p-4 border-t border-neutral-800 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-mono">
                  {d.active ? <span className="text-emerald-400 font-bold">● Active</span> : <span className="text-neutral-500">○ Inactive</span>}
                  <span className="text-neutral-700">|</span>
                  {d.bookable ? <span className="text-accent font-bold">Bookable</span> : <span className="text-neutral-500">Unbookable</span>}
                </div>
                <div className="flex space-x-2 items-center">
                  <a href={`/portal?d=${d.driverId}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline px-2 text-xs font-bold">
                    HUD →
                  </a>
                  <button 
                    onClick={async () => {
                      if (confirm('Delete this driver?')) {
                        await deleteDoc(doc(db, 'drivers', d.driverId));
                      }
                    }} 
                    className="text-neutral-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 size={15} />
                  </button>
                  <button onClick={() => setEditingDriver(d)} className="text-neutral-500 hover:text-accent p-1">
                    <Edit2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {drivers.length === 0 && <div className="col-span-full text-center py-12 text-neutral-500 font-mono text-xs">No drivers registered in the system.</div>}
        </div>
      )}
    </div>
  );
}

function DriverProfileForm({ initialData, onClose }: { initialData: Driver, onClose: () => void }) {
  const [formData, setFormData] = useState<Driver>(initialData);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const isNew = !initialData.driverId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const finalData = { ...formData };
      
      if (isNew) {
        // Simple generation; usually linked to Firebase Auth UID, but we are entering it manually here for MVP
        if (!finalData.userId) {
          finalData.userId = `user_${Date.now()}`;
        }
        finalData.driverId = finalData.userId;
      }

      if (imageFile) {
        const result = await uploadImage(imageFile, `drivers/${finalData.driverId}/headshot-${Date.now()}.jpg`);
        finalData.photoUrl = result.url;
      }

      await setDoc(doc(db, 'drivers', finalData.driverId).withConverter(driverConverter), finalData);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save driver profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#0e0e13] rounded-3xl border border-neutral-800 p-6 shadow-2xl">
      <h2 className="text-xl font-bold font-serif text-white mb-6">{isNew ? 'New Chauffeur Profile' : 'Edit Chauffeur Profile'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl text-xs font-mono">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Display Name</label>
            <input required type="text" value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">User ID</label>
            <input required disabled={!isNew} type="text" value={formData.userId} onChange={e => setFormData({...formData, userId: e.target.value})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent disabled:opacity-50" placeholder="Auth UID" />
            <p className="text-[10px] text-neutral-500 mt-1">Must match the Firebase Auth UID</p>
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Bio</label>
          <textarea required value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent h-24 resize-none" placeholder="Executive credentials and customer care philosophy..." />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Years of Experience</label>
            <input required type="number" value={formData.yearsExperience} onChange={e => setFormData({...formData, yearsExperience: parseInt(e.target.value)})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Languages (comma separated)</label>
            <input required type="text" value={formData.languages.join(', ')} onChange={e => setFormData({...formData, languages: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Headshot</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setImageFile(e.target.files?.[0] || null)} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent" />
          {formData.photoUrl && !imageFile && (
            <img src={formData.photoUrl} alt="Current headshot" className="mt-2 h-20 w-20 rounded-2xl object-cover border border-accent shadow-gold-sm" />
          )}
        </div>

        <div className="flex items-center space-x-6 mt-4">
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} className="rounded accent-[#d4af37]" />
            <span className="font-bold text-white">Active Duty</span>
          </label>
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={formData.bookable} onChange={e => setFormData({...formData, bookable: e.target.checked})} className="rounded accent-[#d4af37]" />
            <span className="font-bold text-white">Bookable by Clients</span>
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-neutral-800">
          <button type="button" onClick={onClose} disabled={saving} className="min-h-[44px] px-5 py-2.5 border border-neutral-700 rounded-xl text-neutral-300 hover:bg-neutral-800 font-bold">Cancel</button>
          <button type="submit" disabled={saving} className="min-h-[44px] px-6 py-2.5 bg-gold-gradient text-neutral-950 rounded-xl font-bold hover:brightness-110 shadow-gold-sm flex items-center uppercase tracking-wider">
            {saving && <Loader2 className="animate-spin mr-2" size={16} />}
            Save Profile
          </button>
        </div>
      </form>
    </div>
  );
}

function DriverCredentialsTab() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [credentials, setCredentials] = useState<Record<string, DriverCredentials | null>>({});
  const [editingCredsFor, setEditingCredsFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'drivers'), (snap) => {
      const results: Driver[] = [];
      snap.forEach(d => results.push(d.data() as Driver));
      setDrivers(results);
      setLoading(false);

      results.forEach(d => {
        onSnapshot(doc(db, 'drivers', d.driverId, 'private', 'credentials').withConverter(driverCredentialsConverter), (cSnap) => {
          setCredentials(prev => ({ ...prev, [d.driverId]: cSnap.exists() ? cSnap.data() : null }));
        });
      });
    });

    return unsub;
  }, []);

  const [now] = useState(() => Date.now());

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-accent" /></div>;

  const isExpiringSoon = (ts: Timestamp | null | undefined) => {
    if (!ts) return false;
    const daysLeft = (ts.toMillis() - now) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= 30;
  };
  const isExpired = (ts: Timestamp | null | undefined) => {
    if (!ts) return false;
    return ts.toMillis() < now;
  };

  return (
    <div>
      {editingCredsFor ? (
        <DriverCredentialsForm 
          driverId={editingCredsFor} 
          initialData={credentials[editingCredsFor]} 
          onClose={() => setEditingCredsFor(null)} 
        />
      ) : (
        <div className="bg-[#0e0e13] rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[600px] text-xs font-mono">
            <thead className="bg-[#0a0a0e] border-b border-neutral-800 text-neutral-400 uppercase text-[10px]">
              <tr>
                <th className="p-4 font-semibold">Chauffeur</th>
                <th className="p-4 font-semibold">Commercial License</th>
                <th className="p-4 font-semibold">Classification</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map(d => {
                const creds = credentials[d.driverId];
                const expSoon = isExpiringSoon(creds?.licenseExpiry);
                const expired = isExpired(creds?.licenseExpiry);

                return (
                  <tr key={d.driverId} className="border-b border-neutral-800/60 hover:bg-[#14141c]">
                    <td className="p-4 font-bold text-white">{d.displayName}</td>
                    <td className="p-4">
                      {creds ? (
                        <div>
                          <div className="font-mono text-xs text-white">{creds.licenseNumber}</div>
                          <div className={`text-[10px] mt-1 flex items-center ${expired ? 'text-rose-400 font-bold' : expSoon ? 'text-accent font-bold' : 'text-neutral-500'}`}>
                            {(expired || expSoon) && <AlertTriangle size={12} className="mr-1" />}
                            Exp: {toDateString(creds.licenseExpiry)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-neutral-500 italic">No credentials</span>
                      )}
                    </td>
                    <td className="p-4 text-neutral-300 font-bold">{creds?.employmentType ? creds.employmentType.toUpperCase() : '—'}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => setEditingCredsFor(d.driverId)} className="text-accent hover:text-white p-2">
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DriverCredentialsForm({ driverId, initialData, onClose }: { driverId: string, initialData: DriverCredentials | null, onClose: () => void }) {
  const [formData, setFormData] = useState<DriverCredentials>(initialData || {
    licenseNumber: '', licenseExpiry: Timestamp.now(), medicalCertExpiry: null, backgroundCheckDate: null, employmentType: '1099', phone: '', emergencyContact: { name: '', phone: '' }
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'drivers', driverId, 'private', 'credentials').withConverter(driverCredentialsConverter), formData);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save credentials');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#0e0e13] rounded-3xl border border-neutral-800 p-6 shadow-2xl">
      <h2 className="text-xl font-bold font-serif text-white mb-6">Edit Compliance Credentials</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl text-xs font-mono">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Commercial License Number</label>
            <input required type="text" value={formData.licenseNumber} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent font-mono" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">License Expiry Date</label>
            <input required type="date" value={toDateString(formData.licenseExpiry)} onChange={e => setFormData({...formData, licenseExpiry: fromDateString(e.target.value) as Timestamp})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">DOT Medical Cert Expiry</label>
            <input type="date" value={toDateString(formData.medicalCertExpiry)} onChange={e => setFormData({...formData, medicalCertExpiry: fromDateString(e.target.value)})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Background Check Date</label>
            <input type="date" value={toDateString(formData.backgroundCheckDate)} onChange={e => setFormData({...formData, backgroundCheckDate: fromDateString(e.target.value)})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Direct Contact Phone</label>
            <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Employment Classification</label>
            <select required value={formData.employmentType} onChange={e => setFormData({...formData, employmentType: e.target.value as 'w2' | '1099'})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent">
              <option value="1099">1099 (Independent Executive Contractor)</option>
              <option value="w2">W2 (Full Chauffeur Employee)</option>
            </select>
          </div>
        </div>

        <div className="border-t border-neutral-800 pt-4 mt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-accent font-mono mb-4">Emergency Dispatch Contact</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Contact Name</label>
              <input required type="text" value={formData.emergencyContact.name} onChange={e => setFormData({...formData, emergencyContact: {...formData.emergencyContact, name: e.target.value}})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Emergency Phone</label>
              <input required type="tel" value={formData.emergencyContact.phone} onChange={e => setFormData({...formData, emergencyContact: {...formData.emergencyContact, phone: e.target.value}})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent" />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-neutral-800">
          <button type="button" onClick={onClose} disabled={saving} className="min-h-[44px] px-5 py-2.5 border border-neutral-700 rounded-xl text-neutral-300 hover:bg-neutral-800 font-bold">Cancel</button>
          <button type="submit" disabled={saving} className="min-h-[44px] px-6 py-2.5 bg-gold-gradient text-neutral-950 rounded-xl font-bold hover:brightness-110 shadow-gold-sm flex items-center uppercase tracking-wider">
            {saving && <Loader2 className="animate-spin mr-2" size={16} />}
            Save Credentials
          </button>
        </div>
      </form>
    </div>
  );
}
