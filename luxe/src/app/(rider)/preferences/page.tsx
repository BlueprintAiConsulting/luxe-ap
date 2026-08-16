"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { PreferenceProfile } from "@/lib/types";
import { ArrowLeft, CheckCircle2, Loader2, Camera, User as UserIcon, Sparkles, Sliders, Coffee, Volume2, ShieldCheck, HeartPulse } from "lucide-react";
import { useRouter } from "next/navigation";
import { uploadImage } from "@/lib/uploadImage";

function calculateCompletion(prefs: any): number {
  if (!prefs) return 0;
  
  const fields = [
    prefs.beverage?.preference,
    prefs.conversation,
    prefs.cabinTempF,
    prefs.audio?.mode,
    prefs.scent,
    prefs.chargerType,
    prefs.greeting?.style,
    prefs.seating?.preferredSeat,
    prefs.route?.preference,
  ];
  
  const filled = fields.filter(f => f && f !== "no_preference" && f !== "none").length;
  return Math.round((filled / fields.length) * 100);
}

const defaultPreferences: PreferenceProfile = {
  beverage: { preference: "no_preference" as any, brand: null, temperature: null, notes: null },
  conversation: "no_preference",
  cabinTempF: null,
  audio: { mode: "no_preference", value: null, volume: null },
  scent: "no_preference",
  scentAllergy: false,
  chargerType: "none",
  reading: null,
  greeting: { style: "no_preference", nameSign: false, signText: null },
  seating: { preferredSeat: null, partition: null, shades: null },
  accessibility: { mobilityAssist: false, serviceAnimal: false, notes: null },
  childSeats: [],
  route: { avoidHighways: false, avoidTolls: false, preference: "no_preference" },
  preferredDriverIds: [],
  blockedDriverIds: [],
  medicalNotes: null,
  freeText: null,
  updatedAt: new Date() as any,
};

export default function PreferencesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [preferences, setPreferences] = useState<PreferenceProfile>(defaultPreferences);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchPrefs = async () => {
      try {
        const d = await getDoc(doc(db, "users", user.uid));
        if (d.exists()) {
          const data = d.data();
          if (data.preferences) {
            setPreferences({ ...defaultPreferences, ...data.preferences });
          }
          if (data.photoUrl) {
            setPhotoUrl(data.photoUrl);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();
  }, [user]);

  const updatePreference = (updateFn: (prev: PreferenceProfile) => PreferenceProfile) => {
    setPreferences(prev => {
      const next = updateFn(prev);
      
      setSaveState("saving");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      timeoutRef.current = setTimeout(async () => {
        if (!user) return;
        try {
          await updateDoc(doc(db, "users", user.uid), {
            preferences: { ...next, updatedAt: new Date() }
          });
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 2000);
        } catch (e) {
          console.error("Failed to save preferences", e);
          setSaveState("idle");
        }
      }, 1000);

      return next;
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingPhoto(true);
    try {
      const result = await uploadImage(file, `users/${user.uid}/profile-${Date.now()}.jpg`);
      await updateDoc(doc(db, "users", user.uid), {
        photoUrl: result.url,
        updatedAt: new Date()
      });
      setPhotoUrl(result.url);
    } catch (error) {
      console.error("Failed to upload photo", error);
      alert("Failed to upload profile picture.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium tracking-wider uppercase text-neutral-400">Loading Preferences...</span>
        </div>
      </div>
    );
  }

  const completion = calculateCompletion(preferences);

  return (
    <div className="max-w-md mx-auto bg-neutral-950 text-white min-h-screen pb-28 pt-2 px-4 selection:bg-accent selection:text-neutral-950">
      
      {/* Sticky Top Bar */}
      <div className="py-3 bg-neutral-950/90 backdrop-blur-xl flex items-center justify-between sticky top-0 z-20 border-b border-neutral-800/80 mb-4">
        <button 
          onClick={() => router.back()} 
          className="w-10 h-10 -ml-1 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white active:scale-95 transition-all"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex flex-col items-center">
          <span className="font-bold text-sm text-white font-serif uppercase tracking-wider">Ride Preferences</span>
          <div className="flex items-center gap-1.5 text-[10px] font-mono mt-0.5">
            {saveState === "saving" && <><Loader2 size={10} className="animate-spin text-accent" /> <span className="text-accent">Saving...</span></>}
            {saveState === "saved" && <><CheckCircle2 size={10} className="text-emerald-400" /> <span className="text-emerald-400">Saved</span></>}
            {saveState === "idle" && <span className="text-neutral-400">{completion}% Profile Tailored</span>}
          </div>
        </div>
        <div className="w-10" />
      </div>

      {/* Linear Gold Progress */}
      <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden mb-6">
        <div className="h-full bg-gold-gradient transition-all duration-500 shadow-gold-sm" style={{ width: `${completion}%` }} />
      </div>

      <div className="space-y-4">
        
        {/* Profile Picture */}
        <section className="bg-[#0e0e13]/90 backdrop-blur-xl p-5 rounded-3xl border border-neutral-800 hover:border-amber-400/30 flex flex-col items-center space-y-3 shadow-xl transition-all">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center overflow-hidden">
              {uploadingPhoto ? (
                <Loader2 className="animate-spin text-accent" />
              ) : photoUrl ? (
                <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={32} className="text-neutral-500" />
              )}
            </div>
            <label className="absolute -bottom-1.5 -right-1.5 bg-accent text-neutral-950 p-2 rounded-xl cursor-pointer hover:bg-accent/90 shadow-md active:scale-90 transition-all">
              <Camera size={14} />
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
            </label>
          </div>
          <div className="text-center">
            <h2 className="font-bold text-sm text-white">VIP Identification Photo</h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">Used by your assigned chauffeur to identify you curbside.</p>
          </div>
        </section>

        {/* Refreshments */}
        <section className="bg-neutral-900/90 backdrop-blur-xl p-5 rounded-3xl border border-neutral-800 space-y-3 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent font-mono">
            <Coffee size={14} /> In-Cabin Refreshments
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Preferred Beverage</label>
            <select 
              value={preferences.beverage.preference}
              onChange={e => updatePreference(p => ({ ...p, beverage: { ...p.beverage, preference: e.target.value as any } }))}
              className="w-full p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-accent font-medium"
            >
              <option value="no_preference">No preference</option>
              <option value="water_sparkling">San Pellegrino (Sparkling)</option>
              <option value="water_still">Fiji Water (Still)</option>
              <option value="coffee">Hot Artisan Coffee</option>
              <option value="soda">Cold Soda / Tonic</option>
              <option value="none">No beverage requested</option>
            </select>
          </div>

          {["water_still", "water_sparkling", "soda", "coffee"].includes(preferences.beverage.preference) && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button 
                type="button"
                onClick={() => updatePreference(p => ({ ...p, beverage: { ...p.beverage, temperature: "chilled" } }))}
                className={`py-2.5 px-3 text-center border rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  preferences.beverage.temperature === "chilled" ? "border-accent bg-accent/20 text-accent" : "bg-neutral-950 border-neutral-800 text-neutral-400"
                }`}
              >
                Chilled
              </button>
              <button 
                type="button"
                onClick={() => updatePreference(p => ({ ...p, beverage: { ...p.beverage, temperature: "room" } }))}
                className={`py-2.5 px-3 text-center border rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  preferences.beverage.temperature === "room" ? "border-accent bg-accent/20 text-accent" : "bg-neutral-950 border-neutral-800 text-neutral-400"
                }`}
              >
                Room Temp
              </button>
            </div>
          )}
        </section>

        {/* Climate & Seating */}
        <section className="bg-neutral-900/90 backdrop-blur-xl p-5 rounded-3xl border border-neutral-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent font-mono">
            <Sliders size={14} /> Cabin Climate & Seating
          </div>
          
          <div>
            <div className="flex justify-between items-center text-xs font-semibold text-neutral-300 mb-2">
              <span>Ideal Cabin Temperature</span>
              <span className="font-mono text-accent text-sm font-bold">{preferences.cabinTempF || 70}°F</span>
            </div>
            <input 
              type="range" min="65" max="76" 
              value={preferences.cabinTempF || 70}
              onChange={e => updatePreference(p => ({ ...p, cabinTempF: parseInt(e.target.value) }))}
              className="w-full accent-accent bg-neutral-800 rounded-lg h-2"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">Preferred Seating Position</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "rear_right", label: "Rear Right (VIP)" },
                { id: "rear_left", label: "Rear Left" },
                { id: "rear_center", label: "Rear Center" },
                { id: "front", label: "Front Passenger" }
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => updatePreference(p => ({ ...p, seating: { ...p.seating, preferredSeat: s.id as any } }))}
                  className={`py-2.5 px-3 text-center border rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    preferences.seating?.preferredSeat === s.id 
                      ? "border-accent bg-accent/20 text-accent" 
                      : "bg-neutral-950 border-neutral-800 text-neutral-400"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Music & Atmosphere */}
        <section className="bg-neutral-900/90 backdrop-blur-xl p-5 rounded-3xl border border-neutral-800 space-y-3 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent font-mono">
            <Volume2 size={14} /> Atmosphere & Etiquette
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Conversation Protocol</label>
            <select 
              value={preferences.conversation} 
              onChange={e => updatePreference(p => ({ ...p, conversation: e.target.value as any }))}
              className="w-full p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-accent font-medium"
            >
              <option value="silent">Silent Ride (No music / conversation)</option>
              <option value="greeting_only">Greeting Only (Quick check-in, then silence)</option>
              <option value="chatty">Happy to Chat / Local Insights</option>
              <option value="no_preference">Chauffeur's Discretion</option>
            </select>
          </div>
        </section>

      </div>
    </div>
  );
}
