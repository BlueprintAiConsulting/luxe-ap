"use client";

import { useState } from "react";
import { 
  decodeVinNumber, 
  DecodedVinResult, 
  SAMPLE_LUXURY_VINS 
} from "@/lib/services/vinDecoder";
import { Driver } from "@/lib/types/driver";
import { VehicleClass, VehicleAmenityTags } from "@/lib/types/vehicle";
import { 
  X, 
  Sparkles, 
  Car, 
  Check, 
  Loader2, 
  ShieldCheck, 
  UserCheck, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  Plus
} from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { vehicleConverter } from "@/lib/firebase/converters";

interface VinDecoderModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: VehicleClass[];
  drivers: Driver[];
  onVehicleAdded?: () => void;
}

export default function VinDecoderModal({
  isOpen,
  onClose,
  classes,
  drivers,
  onVehicleAdded,
}: VinDecoderModalProps) {
  const [vinInput, setVinInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decoded, setDecoded] = useState<DecodedVinResult | null>(null);

  // Form Fields for final fleet injection
  const [licensePlate, setLicensePlate] = useState("");
  const [color, setColor] = useState("Black");
  const [assignedDriverId, setAssignedDriverId] = useState<string | null>(null);
  const [amenities, setAmenities] = useState<VehicleAmenityTags>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDecode = async (vinToDecode?: string) => {
    const targetVin = (vinToDecode || vinInput).trim().toUpperCase();
    if (!targetVin || targetVin.length !== 17) {
      setError("Please enter a valid 17-character VIN.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await decodeVinNumber(targetVin);
      setDecoded(result);
      setVinInput(targetVin);
      setColor(result.color);
      setAmenities(result.suggestedAmenities);

      // Auto-generate realistic California livery TCP plate placeholder
      const randomPlateDigits = Math.floor(1000 + Math.random() * 9000);
      setLicensePlate(`9TCP${randomPlateDigits}`);
    } catch (err: any) {
      setError(err.message || "Failed to decode VIN from NHTSA database.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToFleet = async () => {
    if (!decoded) return;
    setSaving(true);
    setError(null);

    try {
      const vehicleId = `veh_${decoded.make.toLowerCase().replace(/[^a-z0-9]/g, "")}_${decoded.vin.slice(-6).toLowerCase()}`;
      
      const newVehicle = {
        vehicleId,
        classId: decoded.classId,
        year: decoded.year,
        make: decoded.make,
        model: decoded.model,
        trim: decoded.trim || undefined,
        vin: decoded.vin,
        color: color || "Black",
        licensePlate: licensePlate || `9TCP${Math.floor(1000 + Math.random() * 9000)}`,
        photoUrls: [
          decoded.classId === "suv"
            ? "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=800"
            : decoded.classId === "sedan"
            ? "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=800"
            : "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=800"
        ],
        maxPassengers: decoded.maxPassengers,
        maxLuggage: decoded.maxLuggage,
        active: true,
        assignedDriverId: assignedDriverId || null,
        amenityTags: amenities,
        outOfServiceUntil: null,
      };

      const ref = doc(db, "vehicles", vehicleId).withConverter(vehicleConverter);
      await setDoc(ref, newVehicle as any);

      setSuccess(true);
      if (onVehicleAdded) onVehicleAdded();

      setTimeout(() => {
        onClose();
        setSuccess(false);
        setDecoded(null);
        setVinInput("");
      }, 1400);
    } catch (err: any) {
      setError(err.message || "Failed to add vehicle to fleet.");
    } finally {
      setSaving(false);
    }
  };

  const toggleAmenity = (key: keyof VehicleAmenityTags) => {
    setAmenities((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b0e17] border border-neutral-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between bg-[#0e121e]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shadow-gold-sm">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-white">NHTSA VIN Fleet Provisioner</h2>
              <p className="text-xs text-neutral-400 font-mono">1-Tap Vehicle Specification &amp; Amenity Auto-Populate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 font-sans text-xs">
          
          {/* VIN Input & Sample Selectors */}
          <div className="space-y-3">
            <label className="block text-xs font-mono font-bold text-neutral-300 uppercase tracking-wider">
              Enter 17-Digit VIN Number
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={17}
                placeholder="e.g. 1GYS4HKL7RR123456"
                value={vinInput}
                onChange={(e) => setVinInput(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-3 min-h-[48px] rounded-xl bg-[#07090e] border border-neutral-700 text-white font-mono text-sm uppercase tracking-widest focus:border-accent focus:outline-none"
              />
              <button
                onClick={() => handleDecode()}
                disabled={loading || vinInput.length !== 17}
                className="px-6 min-h-[48px] rounded-xl bg-gold-gradient text-neutral-950 font-bold uppercase tracking-wider font-mono shadow-gold-sm hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span>{loading ? "Decoding..." : "Decode VIN"}</span>
              </button>
            </div>

            {/* Quick Demo VIN Selector Pills */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-mono text-neutral-500 uppercase">Quick Luxury Test VINs:</span>
              <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                {SAMPLE_LUXURY_VINS.map((sample) => (
                  <button
                    key={sample.vin}
                    type="button"
                    onClick={() => {
                      setVinInput(sample.vin);
                      handleDecode(sample.vin);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-[#141824] border border-neutral-700/80 text-neutral-300 hover:border-accent hover:text-white transition-all flex items-center gap-1"
                  >
                    <Car size={11} className="text-accent" />
                    <span>{sample.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 flex items-center gap-2 font-mono">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Decoded Vehicle Specification Card */}
          {decoded && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#121624] to-[#0a0c14] border border-accent/30 shadow-gold-sm space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-accent uppercase font-bold tracking-wider">
                      Verified Vehicle Specification
                    </span>
                    <h3 className="text-lg font-bold font-serif text-white">
                      {decoded.year} {decoded.make} {decoded.model}
                    </h3>
                    <div className="text-xs font-mono text-neutral-400">
                      {decoded.trim && <span className="text-accent font-bold">{decoded.trim} • </span>}
                      <span>{decoded.engine} • {decoded.plantCountry}</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-800 text-emerald-400 rounded-full font-mono text-xs font-bold">
                    ✓ NHTSA Verified
                  </span>
                </div>

                {/* Auto-Assigned Attributes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                  <div className="p-2.5 rounded-xl bg-[#07090e] border border-neutral-800">
                    <span className="text-neutral-500 text-[10px] uppercase">Class</span>
                    <div className="font-bold text-white uppercase">{decoded.classId}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#07090e] border border-neutral-800">
                    <span className="text-neutral-500 text-[10px] uppercase">Capacity</span>
                    <div className="font-bold text-white">{decoded.maxPassengers} Pax / {decoded.maxLuggage} Bags</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#07090e] border border-neutral-800">
                    <span className="text-neutral-500 text-[10px] uppercase">VIN</span>
                    <div className="font-bold text-neutral-300 truncate">{decoded.vin}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#07090e] border border-neutral-800">
                    <span className="text-neutral-500 text-[10px] uppercase">Mfg</span>
                    <div className="font-bold text-neutral-300 truncate">{decoded.manufacturer}</div>
                  </div>
                </div>
              </div>

              {/* Fleet Registration Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-neutral-300 uppercase">License Plate</label>
                  <input
                    type="text"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#07090e] border border-neutral-700 text-white font-bold uppercase tracking-wider focus:border-accent focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-neutral-300 uppercase">Assign Chauffeur</label>
                  <select
                    value={assignedDriverId || ""}
                    onChange={(e) => setAssignedDriverId(e.target.value || null)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#07090e] border border-neutral-700 text-white focus:border-accent focus:outline-none"
                  >
                    <option value="">-- Fleet Pool (Unassigned) --</option>
                    {drivers.map((d) => (
                      <option key={d.driverId} value={d.driverId}>
                        {d.displayName} ({(d as any).tier || d.driverType || "Tier 1"} • {d.rating}★)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Luxury Amenities Auto-Provision Checklist */}
              <div className="space-y-2 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neutral-300 uppercase">Luxury Amenity Tags</span>
                  <span className="text-[10px] text-accent">Auto-inferred from Trim Level</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {[
                    { key: "starlineHeadliner", label: "Starline Headliner" },
                    { key: "chilledSeats", label: "Chilled Seats" },
                    { key: "massageSeats", label: "Massage Seats" },
                    { key: "fijiWater", label: "Chilled Fiji Water" },
                    { key: "starlinkWifi", label: "Starlink WiFi" },
                    { key: "burmesterAudio", label: "Burmester / AKG Audio" },
                    { key: "rearEntertainment", label: "Rear Theatre Screens" },
                    { key: "executivePartition", label: "Cabin Partition" },
                  ].map((amenity) => {
                    const isChecked = !!amenities[amenity.key as keyof VehicleAmenityTags];
                    return (
                      <button
                        key={amenity.key}
                        type="button"
                        onClick={() => toggleAmenity(amenity.key as keyof VehicleAmenityTags)}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition-all ${
                          isChecked
                            ? "bg-accent/15 border-accent text-white font-bold shadow-gold-sm"
                            : "bg-[#07090e] border-neutral-800 text-neutral-400 hover:border-neutral-700"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center ${isChecked ? "bg-accent text-neutral-950 font-bold" : "border border-neutral-600"}`}>
                          {isChecked && <Check size={12} />}
                        </div>
                        <span className="text-[11px] truncate">{amenity.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-neutral-800 bg-[#0e121e] flex items-center justify-between font-mono text-xs">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-neutral-700 text-neutral-400 hover:text-white transition-colors"
          >
            Cancel
          </button>

          {decoded && (
            <button
              onClick={handleSaveToFleet}
              disabled={saving || success}
              className="px-6 py-3 min-h-[44px] rounded-xl bg-gold-gradient text-neutral-950 font-bold uppercase tracking-wider shadow-gold-sm hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : success ? (
                <CheckCircle2 size={16} className="text-emerald-950" />
              ) : (
                <Plus size={16} />
              )}
              <span>{saving ? "Provisioning Vehicle..." : success ? "Added to Fleet!" : "Add Vehicle to Fleet"}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
