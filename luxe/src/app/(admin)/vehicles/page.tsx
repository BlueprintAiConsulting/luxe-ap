'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { vehicleClassConverter, vehicleConverter, driverConverter } from '@/lib/firebase/converters';
import { VehicleClass, Vehicle, VehicleAmenityTags } from '@/lib/types/vehicle';
import { Driver } from '@/lib/types/driver';
import { uploadImage } from '@/lib/uploadImage';
import { Plus, Trash2, Edit2, Loader2, Image as ImageIcon, Sparkles, ShieldCheck, UserCheck } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import Image from 'next/image';

const toDateString = (ts: Timestamp | null | undefined): string => {
  if (!ts) return '';
  const d = ts.toDate();
  return d.toISOString().split('T')[0];
};

const fromDateString = (str: string): Timestamp | null => {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return Timestamp.fromDate(date);
};

export default function VehiclesAdminPage() {
  const [tab, setTab] = useState<'classes' | 'vehicles'>('vehicles');

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto min-h-screen bg-[#060608] text-white font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-[10px] font-bold uppercase tracking-widest mb-1.5 font-mono shadow-gold-sm">
            Automotive Fleet Operations
          </div>
          <h1 className="text-3xl font-bold font-serif text-white tracking-tight">Fleet Management</h1>
          <p className="text-neutral-400 text-xs sm:text-sm mt-0.5 font-medium">Manage Joe's flagship vehicles, VINs, luxury amenity tags, and assigned chauffeurs.</p>
        </div>
        <div className="flex space-x-1.5 bg-[#0e0e13] border border-neutral-800 p-1.5 rounded-2xl shadow-gold-sm self-start sm:self-auto">
          <button
            onClick={() => setTab('vehicles')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'vehicles' ? 'bg-gold-gradient text-neutral-950 shadow-gold-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Physical Flagship Fleet
          </button>
          <button
            onClick={() => setTab('classes')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'classes' ? 'bg-gold-gradient text-neutral-950 shadow-gold-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Vehicle Classes
          </button>
        </div>
      </div>

      {tab === 'classes' ? <VehicleClassesTab /> : <VehiclesTab />}
    </div>
  );
}

function VehicleClassesTab() {
  const [classes, setClasses] = useState<VehicleClass[]>([]);
  const [editingClass, setEditingClass] = useState<VehicleClass | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = collection(db, 'vehicleClasses').withConverter(vehicleClassConverter);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: VehicleClass[] = [];
      snapshot.forEach((doc) => results.push(doc.data()));
      results.sort((a, b) => a.sortOrder - b.sortOrder);
      setClasses(results);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-accent" /></div>;

  return (
    <div>
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setEditingClass({
            classId: '', name: '', description: '', maxPassengers: 4, maxLuggage: 2, heroImageUrl: '', sortOrder: 0, active: true
          })}
          className="min-h-[44px] flex items-center space-x-2 bg-gold-gradient text-neutral-950 px-5 py-2.5 rounded-xl font-bold hover:brightness-110 shadow-gold-sm text-xs uppercase tracking-wider transition-all"
        >
          <Plus size={16} />
          <span>Add Vehicle Class</span>
        </button>
      </div>

      {editingClass ? (
        <VehicleClassForm 
          initialData={editingClass} 
          onClose={() => setEditingClass(null)} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <div key={cls.classId} className="bg-[#0e0e13] rounded-3xl border border-neutral-800 p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden">
              <div>
                {cls.heroImageUrl && (
                  <div className="relative h-44 -mx-6 -mt-6 mb-4 overflow-hidden rounded-t-3xl border-b border-neutral-800">
                    <img src={cls.heroImageUrl} alt={cls.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold font-serif text-white">{cls.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${cls.active ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' : 'bg-neutral-900 text-neutral-500'}`}>
                    {cls.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 font-mono mt-2 leading-relaxed">{cls.description}</p>
                <div className="flex gap-4 mt-4 pt-3 border-t border-neutral-800/80 text-xs font-mono text-neutral-300">
                  <span>Capacity: {cls.maxPassengers} Pax</span>
                  <span>Luggage: {cls.maxLuggage} Bags</span>
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-neutral-800">
                <button onClick={() => setEditingClass(cls)} className="p-2 text-accent hover:text-white">
                  <Edit2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VehicleClassForm({ initialData, onClose }: { initialData: VehicleClass, onClose: () => void }) {
  const [formData, setFormData] = useState<VehicleClass>(initialData);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const isNew = !initialData.classId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let heroImageUrl = formData.heroImageUrl;
      if (imageFile) {
        const uploadResult = await uploadImage(imageFile, `vehicleClasses/${formData.classId || 'new'}-${Date.now()}.jpg`);
        heroImageUrl = uploadResult.url;
      }
      const finalData = { ...formData, heroImageUrl };
      if (isNew) {
        finalData.classId = finalData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      }
      await setDoc(doc(db, 'vehicleClasses', finalData.classId).withConverter(vehicleClassConverter), finalData);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save vehicle class');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#0e0e13] rounded-3xl border border-neutral-800 p-6 shadow-2xl">
      <h2 className="text-xl font-bold font-serif text-white mb-6">{isNew ? 'New Vehicle Class' : 'Edit Vehicle Class'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl text-xs font-mono">
        <div>
          <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Class Name</label>
          <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent" />
        </div>
        <div>
          <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Description & Amenities</label>
          <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent h-24 resize-none" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Max Passengers</label>
            <input required type="number" value={formData.maxPassengers} onChange={e => setFormData({...formData, maxPassengers: parseInt(e.target.value)})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Max Luggage</label>
            <input required type="number" value={formData.maxLuggage} onChange={e => setFormData({...formData, maxLuggage: parseInt(e.target.value)})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Showcase Photo</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setImageFile(e.target.files?.[0] || null)} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent" />
          {formData.heroImageUrl && !imageFile && (
            <img src={formData.heroImageUrl} alt="Current hero" className="mt-3 h-32 rounded-2xl object-cover border border-accent shadow-gold-sm" />
          )}
        </div>
        <div className="flex items-center space-x-2 mt-4">
          <input type="checkbox" id="active" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} className="rounded accent-[#d4af37]" />
          <label htmlFor="active" className="text-xs font-bold text-white">Active in Client Booking Flow</label>
        </div>
        <div className="flex justify-end space-x-3 pt-6 border-t border-neutral-800">
          <button type="button" onClick={onClose} disabled={saving} className="min-h-[44px] px-5 py-2.5 border border-neutral-700 rounded-xl text-neutral-300 hover:bg-neutral-800 font-bold">Cancel</button>
          <button type="submit" disabled={saving} className="min-h-[44px] px-6 py-2.5 bg-gold-gradient text-neutral-950 rounded-xl font-bold hover:brightness-110 shadow-gold-sm flex items-center uppercase tracking-wider">
            {saving && <Loader2 className="animate-spin mr-2" size={16} />}
            Save Class
          </button>
        </div>
      </form>
    </div>
  );
}

function VehiclesTab() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [classes, setClasses] = useState<VehicleClass[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubClasses = onSnapshot(collection(db, 'vehicleClasses').withConverter(vehicleClassConverter), (snap) => {
      const cls: VehicleClass[] = [];
      snap.forEach(d => cls.push(d.data()));
      setClasses(cls);
    });

    const unsubDrivers = onSnapshot(collection(db, 'drivers').withConverter(driverConverter), (snap) => {
      const drvs: Driver[] = [];
      snap.forEach(d => drvs.push(d.data()));
      setDrivers(drvs);
    });

    const unsubVehicles = onSnapshot(collection(db, 'vehicles').withConverter(vehicleConverter), (snap) => {
      const vehs: Vehicle[] = [];
      snap.forEach(d => vehs.push(d.data()));
      setVehicles(vehs);
      setLoading(false);
    });

    return () => { unsubClasses(); unsubDrivers(); unsubVehicles(); };
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-accent" /></div>;

  return (
    <div>
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setEditingVehicle({
            vehicleId: '', classId: classes[0]?.classId || 'suv', year: new Date().getFullYear(), make: '', model: '', trim: '', vin: '', color: 'Black', licensePlate: '', photoUrls: [], maxPassengers: 6, maxLuggage: 6, active: true, assignedDriverId: null, amenityTags: {}, outOfServiceUntil: null
          })}
          className="min-h-[44px] flex items-center space-x-2 bg-gold-gradient text-neutral-950 px-5 py-2.5 rounded-xl font-bold hover:brightness-110 shadow-gold-sm text-xs uppercase tracking-wider transition-all"
        >
          <Plus size={16} />
          <span>Add Flagship Vehicle</span>
        </button>
      </div>

      {editingVehicle ? (
        <VehicleForm 
          initialData={editingVehicle} 
          classes={classes}
          drivers={drivers}
          onClose={() => setEditingVehicle(null)} 
        />
      ) : (
        <div className="bg-[#0e0e13] rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[850px] text-xs font-mono">
            <thead className="bg-[#0a0a0e] border-b border-neutral-800 text-neutral-400 uppercase text-[10px]">
              <tr>
                <th className="p-4 font-semibold">Photo</th>
                <th className="p-4 font-semibold">Vehicle Spec & VIN</th>
                <th className="p-4 font-semibold">Assigned Chauffeur</th>
                <th className="p-4 font-semibold">Luxury Amenities</th>
                <th className="p-4 font-semibold">Plate</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => {
                const assignedDriver = drivers.find(d => d.driverId === v.assignedDriverId);
                const amenities = v.amenityTags || {};

                return (
                  <tr key={v.vehicleId} className="border-b border-neutral-800/60 hover:bg-[#14141c]">
                    <td className="p-4 w-16">
                      {v.photoUrls && v.photoUrls.length > 0 ? (
                        <Image src={v.photoUrls[0]} alt={`${v.make} ${v.model}`} width={48} height={48} className="w-12 h-12 object-cover rounded-xl border border-neutral-700" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#181822] flex items-center justify-center text-neutral-600">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-white text-sm">
                        {v.year} {v.make} {v.model} {v.trim && <span className="text-accent text-xs font-normal">({v.trim})</span>}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                        VIN: <span className="text-neutral-300 font-bold">{v.vin || 'Pending'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {assignedDriver ? (
                        <div className="flex items-center gap-1.5 text-xs text-white font-bold">
                          <UserCheck size={14} className="text-accent" />
                          <span>{assignedDriver.displayName}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-500 text-[11px] italic">Unassigned (Pool)</span>
                      )}
                    </td>
                    <td className="p-4 max-w-[200px]">
                      <div className="flex flex-wrap gap-1">
                        {amenities.starlineHeadliner && <span className="px-1.5 py-0.5 bg-purple-950/80 border border-purple-800 text-purple-300 text-[9px] rounded">Starline</span>}
                        {amenities.chilledSeats && <span className="px-1.5 py-0.5 bg-blue-950/80 border border-blue-800 text-blue-300 text-[9px] rounded">Chilled</span>}
                        {amenities.fijiWater && <span className="px-1.5 py-0.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[9px] rounded">Fiji</span>}
                        {amenities.starlinkWifi && <span className="px-1.5 py-0.5 bg-amber-950/80 border border-amber-800 text-amber-300 text-[9px] rounded">WiFi</span>}
                        {amenities.massageSeats && <span className="px-1.5 py-0.5 bg-rose-950/80 border border-rose-800 text-rose-300 text-[9px] rounded">Massage</span>}
                        {amenities.burmesterAudio && <span className="px-1.5 py-0.5 bg-indigo-950/80 border border-indigo-800 text-indigo-300 text-[9px] rounded">Burmester</span>}
                        {!Object.values(amenities).some(Boolean) && <span className="text-neutral-500 text-[10px]">Standard Livery</span>}
                      </div>
                    </td>
                    <td className="p-4 font-mono text-xs font-bold text-white tracking-wider">{v.licensePlate}</td>
                    <td className="p-4">
                      {v.active ? (
                        <span className="text-emerald-400 font-bold flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span> Active</span>
                      ) : (
                        <span className="text-neutral-500 flex items-center"><span className="w-2 h-2 rounded-full bg-neutral-600 mr-2"></span> Out of Service</span>
                      )}
                    </td>
                    <td className="p-4 text-right flex justify-end space-x-2">
                      <button onClick={() => setEditingVehicle(v)} className="text-accent hover:text-white p-2">
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={async () => {
                          if (confirm('Delete this vehicle?')) {
                            await deleteDoc(doc(db, 'vehicles', v.vehicleId));
                          }
                        }} 
                        className="text-neutral-500 hover:text-rose-400 p-2"
                      >
                        <Trash2 size={16} />
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

function VehicleForm({ initialData, classes, drivers, onClose }: { initialData: Vehicle, classes: VehicleClass[], drivers: Driver[], onClose: () => void }) {
  const [formData, setFormData] = useState<Vehicle>(initialData);
  const [amenities, setAmenities] = useState<VehicleAmenityTags>(initialData.amenityTags || {});
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);

  const isNew = !initialData.vehicleId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const finalData: Vehicle = { 
        ...formData, 
        amenityTags: amenities 
      };
      
      if (isNew) {
        finalData.vehicleId = `veh_${Date.now()}`;
      }

      if (photos.length > 0) {
        const uploadPromises = photos.map((file, i) => 
          uploadImage(file, `vehicles/${finalData.vehicleId}/photo-${Date.now()}-${i}.jpg`)
        );
        const results = await Promise.all(uploadPromises);
        finalData.photoUrls = [...finalData.photoUrls, ...results.map(r => r.url)];
      }

      await setDoc(doc(db, 'vehicles', finalData.vehicleId).withConverter(vehicleConverter), finalData);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save vehicle');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#0e0e13] rounded-3xl border border-neutral-800 p-6 shadow-2xl">
      <h2 className="text-xl font-bold font-serif text-white mb-6">{isNew ? 'New Flagship Vehicle' : 'Edit Flagship Vehicle'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl text-xs font-mono">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Year</label>
            <input required type="number" value={formData.year} onChange={e => setFormData({...formData, year: parseInt(e.target.value)})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Make</label>
            <input required type="text" placeholder="Cadillac" value={formData.make} onChange={e => setFormData({...formData, make: e.target.value})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Model & Trim</label>
            <input required type="text" placeholder="Escalade ESV Sport Platinum" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">VIN (17 Digits)</label>
            <input type="text" placeholder="1GYS4HKL8RR104829" value={formData.vin || ''} onChange={e => setFormData({...formData, vin: e.target.value.toUpperCase()})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent uppercase font-mono" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Exterior Color</label>
            <input required type="text" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">License Plate</label>
            <input required type="text" value={formData.licensePlate} onChange={e => setFormData({...formData, licensePlate: e.target.value.toUpperCase()})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent uppercase font-mono tracking-wider" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Class Category</label>
            <select required value={formData.classId} onChange={e => setFormData({...formData, classId: e.target.value})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent capitalize">
              {classes.map(c => (
                <option key={c.classId} value={c.classId}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Assigned Lead Chauffeur</label>
            <select value={formData.assignedDriverId || ''} onChange={e => setFormData({...formData, assignedDriverId: e.target.value || null})} className="w-full border border-neutral-700 p-2.5 rounded-xl text-white outline-none bg-[#181822] focus:border-accent">
              <option value="">Unassigned (Fleet Pool)</option>
              {drivers.map(d => (
                <option key={d.driverId} value={d.driverId}>{d.displayName} ({d.rating}★)</option>
              ))}
            </select>
          </div>
        </div>

        {/* Luxury Amenity Tags Checkboxes */}
        <div className="p-4 rounded-2xl bg-[#14141c] border border-neutral-800 space-y-2">
          <label className="block text-[10px] uppercase font-bold text-accent mb-2">Luxury Amenity Tags (VIP Matching)</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!amenities.starlineHeadliner} onChange={e => setAmenities({...amenities, starlineHeadliner: e.target.checked})} className="rounded accent-[#d4af37]" />
              <span className="text-white">Starline Headliner</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!amenities.chilledSeats} onChange={e => setAmenities({...amenities, chilledSeats: e.target.checked})} className="rounded accent-[#d4af37]" />
              <span className="text-white">Chilled Seats</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!amenities.fijiWater} onChange={e => setAmenities({...amenities, fijiWater: e.target.checked})} className="rounded accent-[#d4af37]" />
              <span className="text-white">Fiji Water</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!amenities.starlinkWifi} onChange={e => setAmenities({...amenities, starlinkWifi: e.target.checked})} className="rounded accent-[#d4af37]" />
              <span className="text-white">Starlink WiFi</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!amenities.massageSeats} onChange={e => setAmenities({...amenities, massageSeats: e.target.checked})} className="rounded accent-[#d4af37]" />
              <span className="text-white">Massage Seats</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!amenities.burmesterAudio} onChange={e => setAmenities({...amenities, burmesterAudio: e.target.checked})} className="rounded accent-[#d4af37]" />
              <span className="text-white">Burmester Audio</span>
            </label>
          </div>
        </div>

        <div className="flex items-center space-x-2 mt-4">
          <input type="checkbox" id="activeVeh" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} className="rounded accent-[#d4af37]" />
          <label htmlFor="activeVeh" className="text-xs font-bold text-white">Active in Physical Fleet</label>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-neutral-800">
          <button type="button" onClick={onClose} disabled={saving} className="min-h-[44px] px-5 py-2.5 border border-neutral-700 rounded-xl text-neutral-300 hover:bg-neutral-800 font-bold">Cancel</button>
          <button type="submit" disabled={saving} className="min-h-[44px] px-6 py-2.5 bg-gold-gradient text-neutral-950 rounded-xl font-bold hover:brightness-110 shadow-gold-sm flex items-center uppercase tracking-wider">
            {saving && <Loader2 className="animate-spin mr-2" size={16} />}
            Save Vehicle
          </button>
        </div>
      </form>
    </div>
  );
}
