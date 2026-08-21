"use client";

import { 
  Volume2, 
  Luggage, 
  Wifi, 
  ThermometerSnowflake, 
  Gauge, 
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";

interface VehicleSpecHudProps {
  passengers: number;
  luggage: number;
  classId: "suv" | "sedan" | "sprinter";
  specs?: { label: string; value: string; detail: string }[];
}

export default function VehicleSpecHud({
  passengers,
  luggage,
  classId,
  specs,
}: VehicleSpecHudProps) {
  const defaultSpecs = [
    {
      icon: Volume2,
      label: "Cabin Decibel",
      value: classId === "sedan" ? "52 dB" : "54 dB",
      detail: "Double-Pane Acoustic Laminated Glass (Whisper Quiet)",
      highlight: true,
    },
    {
      icon: Luggage,
      label: "Luggage Capacity",
      value: `${luggage} Full-Size`,
      detail: "Tested for Rimowa & Tumi Checked Hard-Shell Trunks",
      highlight: false,
    },
    {
      icon: Wifi,
      label: "Starlink Satellite Link",
      value: "< 24 ms",
      detail: "Encrypted High-Speed Wi-Fi for Zoom & Confidential Work",
      highlight: true,
    },
    {
      icon: ThermometerSnowflake,
      label: "Multi-Zone Climate",
      value: "Tri-Zone HVAC",
      detail: "Individual Rear Passenger Temperature Control (64°F - 78°F)",
      highlight: false,
    },
    {
      icon: Users,
      label: "Seating Capacity",
      value: `${passengers} VIP Guests`,
      detail: "16-Way Motorized Captain Recliners with Heated/Chilled Massage",
      highlight: false,
    },
    {
      icon: ShieldCheck,
      label: "Safety & Insurance",
      value: "$10M Commercial",
      detail: "Exceeds TCP standards with certified defensive-piloting chauffeurs",
      highlight: false,
    },
  ];

  return (
    <div className="bg-[#0b0e17] rounded-3xl border border-neutral-800 p-6 sm:p-8 shadow-2xl space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-4">
        <div>
          <span className="text-[10px] font-mono text-accent uppercase font-bold tracking-widest flex items-center gap-1">
            <Sparkles size={11} /> Aviation-Grade Telemetry
          </span>
          <h3 className="text-xl font-bold font-serif text-white">Technical &amp; Cabin Specifications</h3>
        </div>
        <span className="text-xs font-mono text-neutral-400">Standard Across KLS Luxe Owned Fleet</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {defaultSpecs.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-2xl border transition-all ${
                item.highlight
                  ? "bg-gradient-to-br from-[#121726] to-[#080a10] border-accent/30 shadow-gold-sm"
                  : "bg-[#07090f] border-neutral-800/80"
              }`}
            >
              <div className="flex items-center justify-between text-neutral-400 font-mono text-xs mb-2">
                <span className="text-[10px] uppercase font-bold">{item.label}</span>
                <Icon size={16} className={item.highlight ? "text-accent" : "text-neutral-500"} />
              </div>
              <div className="text-2xl font-bold font-serif text-white tracking-tight">
                {item.value}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1 font-mono leading-tight">
                {item.detail}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
