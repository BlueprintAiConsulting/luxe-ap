'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { vehicleClassConverter, vehicleConverter } from '@/lib/firebase/converters';
import { VehicleClass, Vehicle } from '@/lib/types/vehicle';
import { uploadImage } from '@/lib/uploadImage';
import { Plus, Trash2, Edit2, Loader2, Image as ImageIcon } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

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
  const [tab, setTab] = useState<'classes' | 'vehicles'>('classes');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Fleet Management</h1>
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setTab('classes')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              tab === 'classes' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Vehicle Classes
          </button>
          <button
            onClick={() => setTab('vehicles')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              tab === 'vehicles' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Vehicles
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
      // Sort by sortOrder
      results.sort((a, b) => a.sortOrder - b.sortOrder);
      setClasses(results);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400" /></div>;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setEditingClass({
            classId: '', name: '', description: '', maxPassengers: 4, maxLuggage: 2, heroImageUrl: '', sortOrder: 0, active: true
          })}
          className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
        >
          <Plus size={18} />
          <span>Add Class</span>
        </button>
      </div>

      {editingClass ? (
        <VehicleClassForm 
          initialData={editingClass} 
          onClose={() => setEditingClass(null)} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((vc) => (
            <div key={vc.classId} className="border rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="h-48 bg-gray-100 relative">
                {vc.heroImageUrl ? (
                  <img src={vc.heroImageUrl} alt={vc.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ImageIcon size={48} />
                  </div>
                )}
                {!vc.active && (
                  <div className="absolute top-2 right-2 bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded">Inactive</div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg">{vc.name}</h3>
                <p className="text-gray-500 text-sm mt-1">{vc.description}</p>
                <div className="flex items-center space-x-4 mt-4 text-sm text-gray-600">
                  <span>{vc.maxPassengers} Passengers</span>
                  <span>{vc.maxLuggage} Luggage</span>
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between">
                  <button 
                    onClick={async () => {
                      if (confirm('Delete this class?')) {
                        await deleteDoc(doc(db, 'vehicleClasses', vc.classId));
                      }
                    }} 
                    className="text-red-600 hover:text-red-800 flex items-center"
                  >
                    <Trash2 size={16} className="mr-1" /> Delete
                  </button>
                  <button onClick={() => setEditingClass(vc)} className="text-blue-600 hover:text-blue-800 flex items-center">
                    <Edit2 size={16} className="mr-1" /> Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
          {classes.length === 0 && <div className="col-span-full text-center py-12 text-gray-500">No vehicle classes defined.</div>}
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
      const finalData = { ...formData };
      
      if (isNew && !finalData.classId) {
        finalData.classId = finalData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      }

      if (imageFile) {
        const result = await uploadImage(imageFile, `vehicleClasses/${finalData.classId}/hero-${Date.now()}.jpg`);
        finalData.heroImageUrl = result.url;
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
    <div className="bg-white border rounded-xl p-6 shadow-sm">
      <h2 className="text-xl font-bold mb-6">{isNew ? 'New Vehicle Class' : 'Edit Vehicle Class'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sort Order</label>
            <input required type="number" value={formData.sortOrder} onChange={e => setFormData({...formData, sortOrder: parseInt(e.target.value)})} className="w-full border p-2 rounded" />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border p-2 rounded h-24" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Max Passengers</label>
            <input required type="number" value={formData.maxPassengers} onChange={e => setFormData({...formData, maxPassengers: parseInt(e.target.value)})} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Luggage</label>
            <input required type="number" value={formData.maxLuggage} onChange={e => setFormData({...formData, maxLuggage: parseInt(e.target.value)})} className="w-full border p-2 rounded" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Hero Image</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setImageFile(e.target.files?.[0] || null)} className="w-full border p-2 rounded" />
          {formData.heroImageUrl && !imageFile && (
            <img src={formData.heroImageUrl} alt="Current hero" className="mt-2 h-32 rounded object-cover" />
          )}
        </div>

        <div className="flex items-center space-x-2 mt-4">
          <input type="checkbox" id="active" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} className="w-4 h-4" />
          <label htmlFor="active" className="font-medium">Active (visible to riders)</label>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center">
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
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubClasses = onSnapshot(collection(db, 'vehicleClasses').withConverter(vehicleClassConverter), (snap) => {
      const cls: VehicleClass[] = [];
      snap.forEach(d => cls.push(d.data()));
      setClasses(cls);
    });

    const unsubVehicles = onSnapshot(collection(db, 'vehicles').withConverter(vehicleConverter), (snap) => {
      const vehs: Vehicle[] = [];
      snap.forEach(d => vehs.push(d.data()));
      setVehicles(vehs);
      setLoading(false);
    });

    return () => { unsubClasses(); unsubVehicles(); };
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400" /></div>;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setEditingVehicle({
            vehicleId: '', classId: classes[0]?.classId || '', year: new Date().getFullYear(), make: '', model: '', color: '', licensePlate: '', photoUrls: [], maxPassengers: 4, maxLuggage: 2, active: true, outOfServiceUntil: null
          })}
          className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
        >
          <Plus size={18} />
          <span>Add Vehicle</span>
        </button>
      </div>

      {editingVehicle ? (
        <VehicleForm 
          initialData={editingVehicle} 
          classes={classes}
          onClose={() => setEditingVehicle(null)} 
        />
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-medium text-gray-500">Vehicle</th>
                <th className="p-4 font-medium text-gray-500">Class</th>
                <th className="p-4 font-medium text-gray-500">Plate</th>
                <th className="p-4 font-medium text-gray-500">Status</th>
                <th className="p-4 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.vehicleId} className="border-b last:border-0">
                  <td className="p-4">
                    <div className="font-medium">{v.year} {v.make} {v.model}</div>
                    <div className="text-sm text-gray-500">{v.color}</div>
                  </td>
                  <td className="p-4">
                    <span className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {classes.find(c => c.classId === v.classId)?.name || v.classId}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-sm">{v.licensePlate}</td>
                  <td className="p-4">
                    {v.active ? (
                      <span className="text-green-600 flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span> Active</span>
                    ) : (
                      <span className="text-red-600 flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span> Out of Service</span>
                    )}
                  </td>
                  <td className="p-4 text-right flex justify-end space-x-2">
                    <button onClick={() => setEditingVehicle(v)} className="text-blue-600 hover:text-blue-800 p-2">
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={async () => {
                        if (confirm('Delete this vehicle?')) {
                          await deleteDoc(doc(db, 'vehicles', v.vehicleId));
                        }
                      }} 
                      className="text-red-600 hover:text-red-800 p-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">No vehicles in fleet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function VehicleForm({ initialData, classes, onClose }: { initialData: Vehicle, classes: VehicleClass[], onClose: () => void }) {
  const [formData, setFormData] = useState<Vehicle>(initialData);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);

  const isNew = !initialData.vehicleId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const finalData = { ...formData };
      
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

  const removePhoto = (index: number) => {
    const newPhotos = [...formData.photoUrls];
    newPhotos.splice(index, 1);
    setFormData({...formData, photoUrls: newPhotos});
  };

  return (
    <div className="bg-white border rounded-xl p-6 shadow-sm">
      <h2 className="text-xl font-bold mb-6">{isNew ? 'New Vehicle' : 'Edit Vehicle'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Year</label>
            <input required type="number" value={formData.year} onChange={e => setFormData({...formData, year: parseInt(e.target.value)})} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Make</label>
            <input required type="text" placeholder="Cadillac" value={formData.make} onChange={e => setFormData({...formData, make: e.target.value})} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Model</label>
            <input required type="text" placeholder="Escalade" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full border p-2 rounded" />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Color</label>
            <input required type="text" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">License Plate</label>
            <input required type="text" value={formData.licensePlate} onChange={e => setFormData({...formData, licensePlate: e.target.value.toUpperCase()})} className="w-full border p-2 rounded uppercase font-mono" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Vehicle Class</label>
            <select required value={formData.classId} onChange={e => setFormData({...formData, classId: e.target.value})} className="w-full border p-2 rounded">
              {classes.map(c => (
                <option key={c.classId} value={c.classId}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Passengers</label>
            <input required type="number" value={formData.maxPassengers} onChange={e => setFormData({...formData, maxPassengers: parseInt(e.target.value)})} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Luggage</label>
            <input required type="number" value={formData.maxLuggage} onChange={e => setFormData({...formData, maxLuggage: parseInt(e.target.value)})} className="w-full border p-2 rounded" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Photos</label>
          <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={e => setPhotos(Array.from(e.target.files || []))} className="w-full border p-2 rounded" />
          
          {formData.photoUrls.length > 0 && (
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {formData.photoUrls.map((url, idx) => (
                <div key={idx} className="relative w-24 h-24 flex-shrink-0">
                  <img src={url} alt={`Vehicle ${idx}`} className="w-full h-full object-cover rounded border" />
                  <button type="button" onClick={() => removePhoto(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pb-4">
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="active" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} className="w-4 h-4" />
            <label htmlFor="active" className="font-medium">Active (in fleet)</label>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Out of Service Until:</label>
            <input type="date" value={toDateString(formData.outOfServiceUntil)} onChange={e => setFormData({...formData, outOfServiceUntil: fromDateString(e.target.value)})} className="border p-1 rounded text-sm" />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center">
            {saving && <Loader2 className="animate-spin mr-2" size={16} />}
            Save Vehicle
          </button>
        </div>
      </form>
    </div>
  );
}
