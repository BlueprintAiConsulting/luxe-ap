"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { PreferenceProfile } from "@/lib/types";
import { ArrowLeft, CheckCircle2, Loader2, Camera, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { uploadImage } from "@/lib/uploadImage";

// Utility to deeply count non-null fields
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateCompletion(prefs: any): number {
  if (!prefs) return 0;
  
  // Total tracked fields for completion
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Fetch preferences on mount
  useEffect(() => {
    if (!user) return;
    const fetchPrefs = async () => {
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
      setLoading(false);
    };
    fetchPrefs();
  }, [user]);

  // Autosave
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
          setSaveState("idle"); // Ideally show error
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  const completion = calculateCompletion(preferences);

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-20">
      <div className="px-4 py-4 bg-white border-b flex items-center justify-between sticky top-0 z-20">
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col items-center">
          <span className="font-semibold text-sm">Your Ride Preferences</span>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            {saveState === "saving" && <><Loader2 size={12} className="animate-spin" /> <span>Saving...</span></>}
            {saveState === "saved" && <><CheckCircle2 size={12} className="text-green-500" /> <span>Saved</span></>}
            {saveState === "idle" && <span>{completion}% Complete</span>}
          </div>
        </div>
        <div className="w-8" />
      </div>

      <div className="h-1 w-full bg-gray-200">
        <div className="h-1 bg-black transition-all" style={{ width: `${completion}%` }} />
      </div>

      <div className="p-4 space-y-6">
        <p className="text-sm text-gray-600 text-center px-4">
          Tell us how you like to ride. We&apos;ll automatically prepare your chauffeur and vehicle for every trip.
        </p>

        {/* PROFILE PICTURE */}
        <section className="bg-white p-5 rounded-2xl border flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border">
              {uploadingPhoto ? (
                <Loader2 className="animate-spin text-gray-400" />
              ) : photoUrl ? (
                <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={40} className="text-gray-400" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-black text-white p-2 rounded-full cursor-pointer hover:bg-gray-800 shadow-md">
              <Camera size={16} />
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
            </label>
          </div>
          <h2 className="font-bold text-lg text-center">Profile Picture</h2>
          <p className="text-sm text-gray-500 text-center">Your chauffeur will use this to identify you at pickup.</p>
        </section>

        {/* REFRESHMENTS */}
        <section className="bg-white p-5 rounded-2xl border space-y-4">
          <h2 className="font-bold text-lg">Refreshments</h2>
          
          <div>
            <label className="block text-sm font-medium mb-2">Would you like a beverage waiting for you?</label>
            <select 
              value={preferences.beverage.preference}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onChange={e => updatePreference(p => ({ ...p, beverage: { ...p.beverage, preference: e.target.value as any } }))}
              className="w-full border p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-black"
            >
              <option value="no_preference">No preference</option>
              <option value="none">No beverage needed</option>
              <option value="water_still">Still Water</option>
              <option value="water_sparkling">Sparkling Water</option>
              <option value="soda">Soda</option>
              <option value="coffee">Coffee</option>
              <option value="other">Other</option>
            </select>
          </div>

          {["water_still", "water_sparkling", "soda", "coffee", "other"].includes(preferences.beverage.preference) && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="block text-sm font-medium mb-2">Preferred brand or type</label>
                <input 
                  type="text" 
                  value={preferences.beverage.brand || ""}
                  onChange={e => updatePreference(p => ({ ...p, beverage: { ...p.beverage, brand: e.target.value } }))}
                  placeholder="e.g. Fiji, San Pellegrino, Diet Coke"
                  className="w-full border p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="flex space-x-3">
                <label className={`flex-1 p-3 text-center border rounded-xl cursor-pointer text-sm ${preferences.beverage.temperature === "chilled" ? "border-black bg-black text-white" : "bg-gray-50 text-gray-600"}`}>
                  <input type="radio" className="hidden" checked={preferences.beverage.temperature === "chilled"} onChange={() => updatePreference(p => ({ ...p, beverage: { ...p.beverage, temperature: "chilled" } }))} />
                  Chilled
                </label>
                <label className={`flex-1 p-3 text-center border rounded-xl cursor-pointer text-sm ${preferences.beverage.temperature === "room" ? "border-black bg-black text-white" : "bg-gray-50 text-gray-600"}`}>
                  <input type="radio" className="hidden" checked={preferences.beverage.temperature === "room"} onChange={() => updatePreference(p => ({ ...p, beverage: { ...p.beverage, temperature: "room" } }))} />
                  Room Temp
                </label>
              </div>
            </div>
          )}
        </section>

        {/* COMFORT */}
        <section className="bg-white p-5 rounded-2xl border space-y-4">
          <h2 className="font-bold text-lg">Comfort</h2>
          
          <div>
            <label className="block text-sm font-medium mb-2">Ideal cabin temperature</label>
            <div className="flex items-center space-x-4">
              <input 
                type="range" min="60" max="80" 
                value={preferences.cabinTempF || 70}
                onChange={e => updatePreference(p => ({ ...p, cabinTempF: parseInt(e.target.value) }))}
                className="flex-1 accent-black"
              />
              <span className="font-mono text-sm w-8">{preferences.cabinTempF || 70}°</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Preferred seat</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "rear_right", label: "Rear Right" },
                { id: "rear_left", label: "Rear Left" },
                { id: "rear_center", label: "Rear Center" },
                { id: "front", label: "Front" }
              ].map(s => (
                <label key={s.id} className={`p-3 text-center border rounded-xl cursor-pointer text-sm ${preferences.seating.preferredSeat === s.id ? "border-black bg-black text-white" : "bg-gray-50 text-gray-600"}`}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <input type="radio" className="hidden" checked={preferences.seating.preferredSeat === s.id} onChange={() => updatePreference(p => ({ ...p, seating: { ...p.seating, preferredSeat: s.id as any } }))} />
                  {s.label}
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Phone Charger</label>
            <select 
              value={preferences.chargerType}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onChange={e => updatePreference(p => ({ ...p, chargerType: e.target.value as any }))}
              className="w-full border p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-black"
            >
              <option value="none">No preference</option>
              <option value="usb_c">USB-C</option>
              <option value="lightning">Apple Lightning</option>
              <option value="wireless">Wireless Pad</option>
            </select>
          </div>
        </section>

        {/* ATMOSPHERE & MUSIC */}
        <section className="bg-white p-5 rounded-2xl border space-y-4">
          <h2 className="font-bold text-lg">Music & Atmosphere</h2>
          
          <div>
            <label className="block text-sm font-medium mb-2">How do you prefer the cabin environment?</label>
            <div className="space-y-2">
              {[
                { id: "silent", label: "Silent ride", desc: "No talking, no music" },
                { id: "greeting_only", label: "Greeting only", desc: "A quick hello, then quiet" },
                { id: "chatty", label: "Happy to chat", desc: "Driver's discretion" },
                { id: "no_preference", label: "No preference", desc: "" }
              ].map(c => (
                <label key={c.id} className={`block p-3 border rounded-xl cursor-pointer ${preferences.conversation === c.id ? "border-black bg-gray-50 ring-1 ring-black" : "border-gray-200"}`}>
                  <div className="flex items-center space-x-3">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <input type="radio" className="w-4 h-4 text-black accent-black" checked={preferences.conversation === c.id} onChange={() => updatePreference(p => ({ ...p, conversation: c.id as any }))} />
                    <div>
                      <div className="text-sm font-medium">{c.label}</div>
                      {c.desc && <div className="text-xs text-gray-500">{c.desc}</div>}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">What should we play?</label>
            <select 
              value={preferences.audio.mode}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onChange={e => updatePreference(p => ({ ...p, audio: { ...p.audio, mode: e.target.value as any } }))}
              className="w-full border p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-black"
            >
              <option value="no_preference">Driver&apos;s Discretion</option>
              <option value="off">Off (Silence)</option>
              <option value="genre">Specific Genre</option>
              <option value="station">Specific Station</option>
              <option value="my_phone">I will play from my phone</option>
            </select>
            
            {["genre", "station"].includes(preferences.audio.mode) && (
              <input 
                type="text" 
                value={preferences.audio.value || ""}
                onChange={e => updatePreference(p => ({ ...p, audio: { ...p.audio, value: e.target.value } }))}
                placeholder={preferences.audio.mode === "genre" ? "e.g. Jazz, Classical, 90s Hip Hop" : "e.g. SiriusXM 71, NPR"}
                className="w-full border p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-black mt-3"
              />
            )}
          </div>
        </section>

        {/* GREETING */}
        <section className="bg-white p-5 rounded-2xl border space-y-4">
          <h2 className="font-bold text-lg">Arrival & Greeting</h2>
          
          <div>
            <label className="block text-sm font-medium mb-2">How should your chauffeur greet you?</label>
            <select 
              value={preferences.greeting.style}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onChange={e => updatePreference(p => ({ ...p, greeting: { ...p.greeting, style: e.target.value as any } }))}
              className="w-full border p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-black"
            >
              <option value="no_preference">Standard</option>
              <option value="curbside">Curbside (Wait by vehicle)</option>
              <option value="meet_inside">Meet inside (Lobby/Baggage)</option>
            </select>
          </div>

          <label className="flex items-center space-x-3 p-3 border rounded-xl bg-gray-50 cursor-pointer">
            <input 
              type="checkbox" 
              checked={preferences.greeting.nameSign}
              onChange={e => updatePreference(p => ({ ...p, greeting: { ...p.greeting, nameSign: e.target.checked } }))}
              className="w-5 h-5 rounded border-gray-300 accent-black" 
            />
            <span className="text-sm font-medium">Use a name sign for pickups</span>
          </label>
          
          {preferences.greeting.nameSign && (
            <input 
              type="text" 
              value={preferences.greeting.signText || ""}
              onChange={e => updatePreference(p => ({ ...p, greeting: { ...p.greeting, signText: e.target.value } }))}
              placeholder="Text for sign (e.g. Mr. Smith, Company Name)"
              className="w-full border p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-black"
            />
          )}
        </section>

        {/* ACCESSIBILITY */}
        <section className="bg-white p-5 rounded-2xl border space-y-4">
          <h2 className="font-bold text-lg">Accessibility</h2>
          
          <label className="flex items-center space-x-3 p-3 border rounded-xl bg-gray-50 cursor-pointer">
            <input 
              type="checkbox" 
              checked={preferences.accessibility.mobilityAssist}
              onChange={e => updatePreference(p => ({ ...p, accessibility: { ...p.accessibility, mobilityAssist: e.target.checked } }))}
              className="w-5 h-5 rounded border-gray-300 accent-black" 
            />
            <span className="text-sm font-medium">I require mobility assistance</span>
          </label>

          <label className="flex items-center space-x-3 p-3 border rounded-xl bg-gray-50 cursor-pointer">
            <input 
              type="checkbox" 
              checked={preferences.accessibility.serviceAnimal}
              onChange={e => updatePreference(p => ({ ...p, accessibility: { ...p.accessibility, serviceAnimal: e.target.checked } }))}
              className="w-5 h-5 rounded border-gray-300 accent-black" 
            />
            <span className="text-sm font-medium">I travel with a service animal</span>
          </label>
        </section>

        {/* NOTES */}
        <section className="bg-white p-5 rounded-2xl border space-y-4">
          <h2 className="font-bold text-lg">Additional Notes</h2>
          
          <div>
            <label className="block text-sm font-medium mb-2">Any other instructions for your trips?</label>
            <textarea 
              value={preferences.freeText || ""}
              onChange={e => updatePreference(p => ({ ...p, freeText: e.target.value }))}
              placeholder="e.g. I prefer the front passenger seat forward to maximize legroom."
              rows={3}
              className="w-full border p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-black resize-none"
            />
          </div>
        </section>

      </div>
    </div>
  );
}
