"use client";

import { PreferenceProfile } from "@/lib/types/preferences";
import { Coffee, Thermometer, Volume2, MessageSquare, ShieldAlert, Sparkles, Navigation, UserCheck, Smartphone } from "lucide-react";

interface RiderPreferencesViewProps {
  preferences?: PreferenceProfile | null;
  className?: string;
}

export default function RiderPreferencesView({ preferences, className = "" }: RiderPreferencesViewProps) {
  if (!preferences) {
    return (
      <div className={`p-4 bg-[#0e0e13] border border-neutral-800 rounded-2xl text-xs text-neutral-400 text-center ${className}`}>
        No concierge preferences specified. Default VIP protocols apply.
      </div>
    );
  }

  const {
    beverage,
    conversation,
    cabinTempF,
    audio,
    scent,
    scentAllergy,
    chargerType,
    greeting,
    seating,
    route,
    freeText,
    medicalNotes,
  } = preferences;

  const conversationLabels: Record<string, string> = {
    silent: "Silent Ride",
    greeting_only: "Greeting Only",
    chatty: "Friendly / Chatty",
    no_preference: "No Preference",
  };

  const chargerLabels: Record<string, string> = {
    usb_c: "USB-C",
    lightning: "Apple Lightning",
    wireless: "Wireless Pad",
    none: "None Needed",
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center space-x-2 border-b border-neutral-800 pb-2">
        <Sparkles size={16} className="text-accent" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-accent font-mono">
          Concierge Preferences
        </h4>
      </div>

      {/* Grid of quick attributes */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Temperature */}
        <div className="p-3 bg-[#0e0e13] border border-neutral-800 rounded-xl flex items-center space-x-3">
          <Thermometer size={18} className="text-accent shrink-0" />
          <div>
            <div className="text-[10px] text-neutral-500 font-semibold uppercase font-mono">Cabin Temp</div>
            <div className="font-bold text-white">
              {cabinTempF ? `${cabinTempF}°F` : "Standard (70°F)"}
            </div>
          </div>
        </div>

        {/* Conversation */}
        <div className="p-3 bg-[#0e0e13] border border-neutral-800 rounded-xl flex items-center space-x-3">
          <MessageSquare size={18} className="text-accent shrink-0" />
          <div>
            <div className="text-[10px] text-neutral-500 font-semibold uppercase font-mono">Conversation</div>
            <div className="font-bold text-white">
              {conversationLabels[conversation] || conversation}
            </div>
          </div>
        </div>

        {/* Beverage */}
        <div className="p-3 bg-[#0e0e13] border border-neutral-800 rounded-xl flex items-center space-x-3">
          <Coffee size={18} className="text-accent shrink-0" />
          <div>
            <div className="text-[10px] text-neutral-500 font-semibold uppercase font-mono">Beverage</div>
            <div className="font-bold text-white capitalize">
              {beverage?.preference && beverage.preference !== "no_preference"
                ? `${beverage.brand || beverage.preference.replace(/_/g, " ")} ${beverage.temperature ? `(${beverage.temperature})` : ""}`
                : "Standard Water"}
            </div>
          </div>
        </div>

        {/* Audio */}
        <div className="p-3 bg-[#0e0e13] border border-neutral-800 rounded-xl flex items-center space-x-3">
          <Volume2 size={18} className="text-accent shrink-0" />
          <div>
            <div className="text-[10px] text-neutral-500 font-semibold uppercase font-mono">Audio / Music</div>
            <div className="font-bold text-white capitalize">
              {audio?.value ? `${audio.value} ${audio.volume ? `(${audio.volume})` : ""}` : audio?.mode || "Chauffeur Choice"}
            </div>
          </div>
        </div>

        {/* Charger */}
        <div className="p-3 bg-[#0e0e13] border border-neutral-800 rounded-xl flex items-center space-x-3">
          <Smartphone size={18} className="text-accent shrink-0" />
          <div>
            <div className="text-[10px] text-neutral-500 font-semibold uppercase font-mono">Device Charger</div>
            <div className="font-bold text-white">
              {chargerLabels[chargerType] || chargerType}
            </div>
          </div>
        </div>

        {/* Seating */}
        <div className="p-3 bg-[#0e0e13] border border-neutral-800 rounded-xl flex items-center space-x-3">
          <UserCheck size={18} className="text-accent shrink-0" />
          <div>
            <div className="text-[10px] text-neutral-500 font-semibold uppercase font-mono">Seating & Privacy</div>
            <div className="font-bold text-white capitalize">
              {seating?.preferredSeat ? seating.preferredSeat.replace(/_/g, " ") : "Rear Right"}
              {seating?.shades === "down" ? " • Shades Down" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Badges / Warnings */}
      {(scentAllergy || greeting?.nameSign || route?.avoidTolls) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {scentAllergy && (
            <span className="px-2.5 py-1 bg-rose-950/60 text-rose-300 border border-rose-800/60 rounded-lg text-[11px] font-semibold flex items-center font-mono">
              <ShieldAlert size={13} className="mr-1" /> Scent Allergy / Fragrance-Free
            </span>
          )}
          {greeting?.nameSign && (
            <span className="px-2.5 py-1 bg-accent/15 text-accent border border-accent/30 rounded-lg text-[11px] font-semibold font-mono">
              Sign: "{greeting.signText || "Name Sign"}"
            </span>
          )}
          {route?.avoidTolls && (
            <span className="px-2.5 py-1 bg-neutral-900 text-neutral-300 border border-neutral-800 rounded-lg text-[11px] font-semibold flex items-center font-mono">
              <Navigation size={13} className="mr-1 text-accent" /> Avoid Tolls
            </span>
          )}
        </div>
      )}

      {/* Free text custom requests */}
      {freeText && (
        <div className="p-3 bg-[#0e0e13] border border-neutral-800 rounded-xl text-xs">
          <div className="text-[10px] font-bold text-accent uppercase font-mono mb-1">Bespoke Instructions</div>
          <p className="text-neutral-300 italic">"{freeText}"</p>
        </div>
      )}

      {/* Medical / Mobility notes */}
      {medicalNotes && (
        <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl text-xs text-rose-300">
          <div className="text-[10px] font-bold text-rose-400 uppercase font-mono mb-1 flex items-center">
            <ShieldAlert size={13} className="mr-1" /> Mobility / Medical Alert
          </div>
          <p>{medicalNotes}</p>
        </div>
      )}
    </div>
  );
}
