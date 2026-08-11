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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Driver Management</h1>
        <div className="flex space-x-2 bg-neutral-100 p-1 rounded-xl">
          <button
            onClick={() => setTab('profiles')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              tab === 'profiles' ? 'bg-white shadow-sm text-brand font-semibold' : 'text-neutral-500 hover:text-brand'
            }`}
          >
            Profiles
          </button>
          <button
            onClick={() => setTab('credentials')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              tab === 'credentials' ? 'bg-white shadow-sm text-brand font-semibold' : 'text-neutral-500 hover:text-brand'
            }`}
          >
            Credentials (Private)
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

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-neutral-400" /></div>;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setEditingDriver({
            driverId: '', userId: '', displayName: '', photoUrl: '', bio: '', languages: ['English'], yearsExperience: 1, rating: 5.0, ratingCount: 0, active: true, bookable: true, createdAt: Timestamp.now()
          })}
          className="flex items-center space-x-2 bg-brand text-white px-4 py-2 rounded-xl hover:bg-neutral-900 transition-colors"
        >
          <Plus size={18} />
          <span>Add Driver</span>
        </button>
      </div>

      {editingDriver ? (
        <DriverProfileForm initialData={editingDriver} onClose={() => setEditingDriver(null)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drivers.map(d => (
            <div key={d.driverId} className="bg-neutral-50 rounded-2xl text-brand font-semibold flex flex-col overflow-hidden">
              <div className="p-6 flex-1">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 rounded-full bg-neutral-200 flex-shrink-0 overflow-hidden relative">
                    {d.photoUrl ? <Image src={d.photoUrl} alt={d.displayName} fill sizes="64px" className="object-cover" /> : <ImageIcon className="w-full h-full text-neutral-400 p-4" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{d.displayName}</h3>
                    <p className="text-sm text-neutral-500 line-clamp-2 mt-1">{d.bio}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-neutral-600">
                  <div><span className="font-medium text-brand">Rating:</span> {d.rating.toFixed(1)} ({d.ratingCount})</div>
                  <div><span className="font-medium text-brand">Experience:</span> {d.yearsExperience} yrs</div>
                  <div className="col-span-2"><span className="font-medium text-brand">Languages:</span> {d.languages.join(', ')}</div>
                </div>
              </div>
              <div className="bg-neutral-100 p-4 border-t flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm font-medium">
                  {d.active ? <span className="text-brand">Active</span> : <span className="text-neutral-400">Inactive</span>}
                  <span className="text-neutral-200">|</span>
                  {d.bookable ? <span className="text-brand">Bookable</span> : <span className="text-neutral-500">Unbookable</span>}
                </div>
                <div className="flex space-x-2">
                  <a href={`/driver/portal?d=${d.driverId}`} target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-brand px-2 text-xs font-bold flex items-center">
                    View Portal
                  </a>
                  <button 
                    onClick={async () => {
                      if (confirm('Delete this driver?')) {
                        await deleteDoc(doc(db, 'drivers', d.driverId));
                      }
                    }} 
                    className="text-neutral-400 hover:text-brand"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button onClick={() => setEditingDriver(d)} className="text-neutral-400 hover:text-brand">
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {drivers.length === 0 && <div className="col-span-full text-center py-12 text-neutral-500">No drivers in the system.</div>}
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
    <div className="bg-neutral-50 rounded-2xl p-6">
      <h2 className="text-xl font-bold mb-6">{isNew ? 'New Driver Profile' : 'Edit Driver Profile'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Display Name</label>
            <input required type="text" value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} className="w-full border border-neutral-200 p-2 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">User ID</label>
            <input required disabled={!isNew} type="text" value={formData.userId} onChange={e => setFormData({...formData, userId: e.target.value})} className="w-full border border-neutral-200 p-2 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none bg-white bg-neutral-100" placeholder="Auth UID" />
            <p className="text-xs text-neutral-500 mt-1">Must match the Firebase Auth UID</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Bio</label>
          <textarea required value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="w-full border border-neutral-200 p-2 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none bg-white h-24" placeholder="Short, rider-facing bio..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Years of Experience</label>
            <input required type="number" value={formData.yearsExperience} onChange={e => setFormData({...formData, yearsExperience: parseInt(e.target.value)})} className="w-full border border-neutral-200 p-2 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Languages (comma separated)</label>
            <input required type="text" value={formData.languages.join(', ')} onChange={e => setFormData({...formData, languages: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} className="w-full border border-neutral-200 p-2 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none bg-white" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Headshot</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setImageFile(e.target.files?.[0] || null)} className="w-full border border-neutral-200 p-2 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none bg-white" />
          {formData.photoUrl && !imageFile && (
            <img src={formData.photoUrl} alt="Current headshot" className="mt-2 h-24 w-24 rounded-full object-cover border" />
          )}
        </div>

        <div className="flex items-center space-x-6 mt-4">
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} className="w-4 h-4" />
            <span className="font-medium">Active</span>
          </label>
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={formData.bookable} onChange={e => setFormData({...formData, bookable: e.target.checked})} className="w-4 h-4" />
            <span className="font-medium">Bookable (selectable by riders)</span>
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 border rounded-lg hover:bg-neutral-100">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-brand text-white rounded-xl hover:bg-neutral-900 transition-colors flex items-center">
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
    // We fetch all drivers to show a list, then we fetch credentials for each. 
    // In production with thousands of drivers, we'd paginate or load on demand. For Phase 1 this is fine.
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

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-neutral-400" /></div>;

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
        <div className="bg-neutral-50 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-white border-b border-neutral-100">
              <tr>
                <th className="p-4 font-medium text-neutral-500">Driver</th>
                <th className="p-4 font-medium text-neutral-500">License</th>
                <th className="p-4 font-medium text-neutral-500">Employment</th>
                <th className="p-4 font-medium text-neutral-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map(d => {
                const creds = credentials[d.driverId];
                const expSoon = isExpiringSoon(creds?.licenseExpiry);
                const expired = isExpired(creds?.licenseExpiry);

                return (
                  <tr key={d.driverId} className="border-b last:border-0">
                    <td className="p-4 font-medium">{d.displayName}</td>
                    <td className="p-4">
                      {creds ? (
                        <div>
                          <div className="font-mono text-sm">{creds.licenseNumber}</div>
                          <div className={`text-xs mt-1 flex items-center ${expired ? 'text-neutral-400 font-bold' : expSoon ? 'text-accent font-bold' : 'text-neutral-500'}`}>
                            {(expired || expSoon) && <AlertTriangle size={12} className="mr-1" />}
                            Exp: {toDateString(creds.licenseExpiry)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic">No credentials</span>
                      )}
                    </td>
                    <td className="p-4 text-sm font-medium">{creds?.employmentType || '—'}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => setEditingCredsFor(d.driverId)} className="text-neutral-400 hover:text-brand p-2">
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
    <div className="bg-neutral-50 rounded-2xl p-6">
      <h2 className="text-xl font-bold mb-6">Edit Credentials</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">License Number</label>
            <input required type="text" value={formData.licenseNumber} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} className="w-full border border-neutral-200 p-2 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none bg-white font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">License Expiry</label>
            <input required type="date" value={toDateString(formData.licenseExpiry)} onChange={e => setFormData({...formData, licenseExpiry: fromDateString(e.target.value) as Timestamp})} className="w-full border border-neutral-200 p-2 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none bg-white" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Medical Cert Expiry (Optional)</label>
            <input type="date" value={toDateString(formData.medicalCertExpiry)} onChange={e => setFormData({...formData, medicalCertExpiry: fromDateString(e.target.value)})} className="w-full border border-neutral-200 p-2 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Background Check Date (Optional)</label>
            <input type="date" value={toDateString(formData.backgroundCheckDate)} onChange={e => setFormData({...formData, backgroundCheckDate: fromDateString(e.target.value)})} className="w-full border border-neutral-200 p-2 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none bg-white" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-neutral-200 p-2 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Employment Type</label>
            <select required value={formData.employmentType} onChange={e => setFormData({...formData, employmentType: e.target.value as 'w2' | '1099'})} className="w-full border border-neutral-200 p-2 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none bg-white">
              <option value="1099">1099 (Independent Contractor)</option>
              <option value="w2">W2 (Employee)</option>
            </select>
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium text-brand mb-4">Emergency Contact</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input required type="text" value={formData.emergencyContact.name} onChange={e => setFormData({...formData, emergencyContact: {...formData.emergencyContact, name: e.target.value}})} className="w-full border border-neutral-200 p-2 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input required type="tel" value={formData.emergencyContact.phone} onChange={e => setFormData({...formData, emergencyContact: {...formData.emergencyContact, phone: e.target.value}})} className="w-full border border-neutral-200 p-2 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none bg-white" />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 border rounded-lg hover:bg-neutral-100">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-brand text-white rounded-xl hover:bg-neutral-900 transition-colors flex items-center">
            {saving && <Loader2 className="animate-spin mr-2" size={16} />}
            Save Credentials
          </button>
        </div>
      </form>
    </div>
  );
}
