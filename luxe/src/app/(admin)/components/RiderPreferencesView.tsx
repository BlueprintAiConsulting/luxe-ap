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
      <div className={`p-4 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs text-neutral-500 text-center ${className}`}>
        No concierge preferences specified.
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
      <div className="flex items-center space-x-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <Sparkles size={16} className="text-accent" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
          Concierge Preferences
        </h4>
      </div>

      {/* Grid of quick attributes */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Temperature */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center space-x-3">
          <Thermometer size={18} className="text-neutral-500 shrink-0" />
          <div>
            <div className="text-[10px] text-neutral-400 font-semibold uppercase">Cabin Temp</div>
            <div className="font-bold text-neutral-900 dark:text-neutral-100">
              {cabinTempF ? `${cabinTempF}°F` : "Standard"}
            </div>
          </div>
        </div>

        {/* Conversation */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center space-x-3">
          <MessageSquare size={18} className="text-neutral-500 shrink-0" />
          <div>
            <div className="text-[10px] text-neutral-400 font-semibold uppercase">Conversation</div>
            <div className="font-bold text-neutral-900 dark:text-neutral-100">
              {conversationLabels[conversation] || conversation}
            </div>
          </div>
        </div>

        {/* Beverage */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center space-x-3">
          <Coffee size={18} className="text-neutral-500 shrink-0" />
          <div>
            <div className="text-[10px] text-neutral-400 font-semibold uppercase">Beverage</div>
            <div className="font-bold text-neutral-900 dark:text-neutral-100 capitalize">
              {beverage?.preference && beverage.preference !== "no_preference"
                ? `${beverage.brand || beverage.preference.replace(/_/g, " ")} ${beverage.temperature ? `(${beverage.temperature})` : ""}`
                : "Standard Water"}
            </div>
          </div>
        </div>

        {/* Audio */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center space-x-3">
          <Volume2 size={18} className="text-neutral-500 shrink-0" />
          <div>
            <div className="text-[10px] text-neutral-400 font-semibold uppercase">Audio / Music</div>
            <div className="font-bold text-neutral-900 dark:text-neutral-100 capitalize">
              {audio?.value ? `${audio.value} ${audio.volume ? `(${audio.volume})` : ""}` : audio?.mode || "Driver Choice"}
            </div>
          </div>
        </div>

        {/* Charger */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center space-x-3">
          <Smartphone size={18} className="text-neutral-500 shrink-0" />
          <div>
            <div className="text-[10px] text-neutral-400 font-semibold uppercase">Device Charger</div>
            <div className="font-bold text-neutral-900 dark:text-neutral-100">
              {chargerLabels[chargerType] || chargerType}
            </div>
          </div>
        </div>

        {/* Seating */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center space-x-3">
          <UserCheck size={18} className="text-neutral-500 shrink-0" />
          <div>
            <div className="text-[10px] text-neutral-400 font-semibold uppercase">Seating & Partition</div>
            <div className="font-bold text-neutral-900 dark:text-neutral-100 capitalize">
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
            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold flex items-center">
              <ShieldAlert size={13} className="mr-1" /> Scent Allergy / Fragrance-Free
            </span>
          )}
          {greeting?.nameSign && (
            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-semibold">
              Sign: "{greeting.signText || "Name Sign"}"
            </span>
          )}
          {route?.avoidTolls && (
            <span className="px-2.5 py-1 bg-neutral-100 text-neutral-700 border border-neutral-200 rounded-lg text-[11px] font-semibold flex items-center">
              <Navigation size={13} className="mr-1" /> Avoid Tolls
            </span>
          )}
        </div>
      )}

      {/* Free text / Notes */}
      {freeText && (
        <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/30 rounded-xl text-xs">
          <span className="font-bold text-amber-900 dark:text-amber-400 block mb-1">Rider Instructions:</span>
          <span className="text-neutral-700 dark:text-neutral-300 italic">"{freeText}"</span>
        </div>
      )}

      {medicalNotes && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 text-xs text-rose-900 dark:text-rose-300 rounded-xl">
          <span className="font-bold block mb-1">Medical / Mobility Notes:</span>
          <span>{medicalNotes}</span>
        </div>
      )}
    </div>
  );
}
