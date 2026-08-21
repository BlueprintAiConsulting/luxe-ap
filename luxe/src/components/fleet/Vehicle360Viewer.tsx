"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { 
  RotateCw, 
  Sparkles, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause,
  Sun,
  Moon,
  Zap,
  Maximize2,
  Check,
  Shield,
  Layers,
  Car,
  Compass,
  X
} from "lucide-react";
import { VehicleShowcaseData, VehicleAnglePhoto } from "@/lib/data/fleetShowcase";

interface Vehicle360ViewerProps {
  vehicle: VehicleShowcaseData;
}

const FINISH_PRESETS = [
  { id: "black", name: "Obsidian Onyx", ring: "#1a1d24", glow: "rgba(212, 175, 55, 0.25)" },
  { id: "midnight", name: "Caviar Sapphire", ring: "#14213d", glow: "rgba(59, 130, 246, 0.25)" },
  { id: "gold", name: "Imperial Champagne", ring: "#3d321d", glow: "rgba(212, 175, 55, 0.4)" },
  { id: "platinum", name: "Pearl Platinum", ring: "#384152", glow: "rgba(244, 244, 245, 0.25)" },
];

export default function Vehicle360Viewer({ vehicle }: Vehicle360ViewerProps) {
  const [activeAngleIndex, setActiveAngleIndex] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState<number | null>(null);
  const [selectedFinish, setSelectedFinish] = useState(FINISH_PRESETS[0]);
  const [studioLight, setStudioLight] = useState<"night" | "studio" | "neon">("night");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const angles = vehicle.angles || [
    {
      angleDeg: 45,
      label: "Hero Stance",
      imageUrl: vehicle.heroImage,
      tagline: vehicle.tagline,
    }
  ];

  const totalAngles = angles.length;
  const currentAngle = angles[activeAngleIndex] || angles[0];

  // Auto rotation loop cycling through realistic vehicle angles
  useEffect(() => {
    if (!isAutoRotating || totalAngles <= 1) return;
    const interval = setInterval(() => {
      setActiveAngleIndex((prev) => (prev + 1) % totalAngles);
    }, 2800);
    return () => clearInterval(interval);
  }, [isAutoRotating, totalAngles]);

  const handleNext = () => {
    setActiveAngleIndex((prev) => (prev + 1) % totalAngles);
    setIsAutoRotating(false);
  };

  const handlePrev = () => {
    setActiveAngleIndex((prev) => (prev - 1 + totalAngles) % totalAngles);
    setIsAutoRotating(false);
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-b from-[#0e111d] via-[#07090f] to-[#030406] border border-accent/30 shadow-2xl p-4 sm:p-8 select-none font-sans">
      
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-20 relative border-b border-neutral-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent font-mono text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 shadow-gold-sm">
              <RotateCw size={11} className={isAutoRotating ? "animate-spin" : ""} /> 360° Studio Turntable
            </span>
            <span className="text-[11px] font-mono text-white bg-[#0b0e18] px-3 py-1 rounded-full border border-neutral-700 font-bold">
              {currentAngle.angleDeg}° Perspective • {currentAngle.label}
            </span>
          </div>
          <h3 className="text-xl font-bold font-serif text-white mt-1.5">{vehicle.name}</h3>
        </div>

        {/* Orbit Toggle & Studio Lighting */}
        <div className="flex items-center gap-2 font-mono text-xs self-start sm:self-auto">
          <div className="flex bg-[#0b0e18] border border-neutral-800 p-1 rounded-xl">
            <button
              onClick={() => setStudioLight("night")}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                studioLight === "night" ? "bg-[#181d2e] text-accent font-bold" : "text-neutral-500 hover:text-white"
              }`}
            >
              <Moon size={12} />
              <span className="text-[10px]">Night</span>
            </button>
            <button
              onClick={() => setStudioLight("studio")}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                studioLight === "studio" ? "bg-[#181d2e] text-white font-bold" : "text-neutral-500 hover:text-white"
              }`}
            >
              <Sun size={12} />
              <span className="text-[10px]">Studio</span>
            </button>
          </div>

          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className="px-4 py-2 min-h-[40px] rounded-xl bg-gold-gradient text-neutral-950 font-bold flex items-center gap-1.5 shadow-gold-sm hover:brightness-110 active:scale-95 transition-all"
          >
            {isAutoRotating ? <Pause size={13} /> : <Play size={13} />}
            <span>{isAutoRotating ? "Pause Orbit" : "Auto Orbit"}</span>
          </button>
        </div>
      </div>

      {/* Main Photorealistic Vehicle Stage */}
      <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] flex items-center justify-center my-4 overflow-hidden rounded-2xl group">
        
        {/* Studio Floor Reflection & Lighting Sheen */}
        <div 
          className="absolute bottom-2 sm:bottom-6 w-4/5 h-28 rounded-[100%] blur-3xl pointer-events-none transition-all duration-700"
          style={{ backgroundColor: selectedFinish.glow }}
        />
        
        {/* Studio Turntable Ground Disc Grid */}
        <div className="absolute bottom-0 w-3/4 h-16 border-t border-accent/20 rounded-[100%] pointer-events-none opacity-40" />

        {/* Real Vehicle High-Resolution Image */}
        <div className="relative w-full h-full flex items-center justify-center">
          <Image
            src={currentAngle.imageUrl}
            alt={`${vehicle.name} - ${currentAngle.label}`}
            fill
            sizes="(max-width: 1200px) 100vw, 1200px"
            className="object-contain drop-shadow-[0_25px_45px_rgba(0,0,0,0.95)] transition-all duration-500 group-hover:scale-102"
            priority
          />
        </div>

        {/* Hotspot Pins Pinned on the Vehicle */}
        {vehicle.hotspots.map((hotspot, idx) => (
          <div
            key={idx}
            style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
            className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveHotspot(activeHotspot === idx ? null : idx);
              }}
              className="relative w-7 h-7 rounded-full bg-accent text-neutral-950 flex items-center justify-center shadow-gold-sm hover:scale-125 transition-transform"
            >
              <Sparkles size={13} className="animate-pulse" />
              <span className="absolute inset-0 rounded-full bg-accent/40 animate-ping" />
            </button>

            {/* Hotspot Info Popup */}
            {activeHotspot === idx && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 rounded-2xl bg-[#090b14]/98 backdrop-blur-2xl border border-accent/50 text-white shadow-2xl z-50 animate-in fade-in zoom-in-95">
                <div className="text-xs font-bold text-accent font-serif">{hotspot.title}</div>
                <p className="text-[11px] text-neutral-300 font-sans mt-1 leading-relaxed">{hotspot.detail}</p>
              </div>
            )}
          </div>
        ))}

        {/* Left & Right Step Buttons */}
        <button
          onClick={handlePrev}
          aria-label="Previous vehicle perspective"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-2xl bg-[#080b14]/80 backdrop-blur-md border border-neutral-700 text-white flex items-center justify-center hover:border-accent hover:scale-105 active:scale-95 transition-all shadow-xl z-20"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          onClick={handleNext}
          aria-label="Next vehicle perspective"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-2xl bg-[#080b14]/80 backdrop-blur-md border border-neutral-700 text-white flex items-center justify-center hover:border-accent hover:scale-105 active:scale-95 transition-all shadow-xl z-20"
        >
          <ChevronRight size={20} />
        </button>

        {/* Angle Tagline Overlay */}
        <div className="absolute bottom-3 left-4 right-4 sm:left-8 sm:right-8 p-3 rounded-2xl bg-[#05070c]/85 backdrop-blur-md border border-neutral-800 text-xs font-mono text-neutral-300 flex items-center justify-between pointer-events-none">
          <span className="truncate">{currentAngle.tagline}</span>
          <span className="text-accent font-bold shrink-0 ml-3">
            {activeAngleIndex + 1} / {totalAngles}
          </span>
        </div>

      </div>

      {/* Angle Selector Tabs & Custom Paint Swatches */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 border-t border-neutral-800/80 pt-5 font-mono text-xs items-center">
        
        {/* Angle Presets */}
        <div className="lg:col-span-8 flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-neutral-500 mr-1">Angles:</span>
          {angles.map((ang, idx) => (
            <button
              key={ang.label}
              onClick={() => {
                setActiveAngleIndex(idx);
                setIsAutoRotating(false);
              }}
              className={`px-3.5 py-2 min-h-[40px] rounded-xl border font-bold transition-all active:scale-95 flex items-center gap-1.5 ${
                activeAngleIndex === idx
                  ? "bg-accent/20 border-accent text-white shadow-gold-sm"
                  : "bg-[#0b0e18] border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <CameraIcon angle={ang.angleDeg} />
              <span>{ang.label} ({ang.angleDeg}°)</span>
            </button>
          ))}
        </div>

        {/* Paint Swatches */}
        <div className="lg:col-span-4 flex items-center justify-start lg:justify-end gap-2">
          <span className="text-[10px] uppercase font-bold text-neutral-500 mr-1">Finish:</span>
          {FINISH_PRESETS.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFinish(f)}
              title={f.name}
              className={`w-7 h-7 rounded-full border transition-all ${
                selectedFinish.id === f.id
                  ? "border-accent scale-110 shadow-gold-sm ring-2 ring-accent/30"
                  : "border-neutral-700 opacity-60 hover:opacity-100"
              }`}
              style={{ backgroundColor: f.ring }}
            />
          ))}
        </div>

      </div>

    </div>
  );
}

function CameraIcon({ angle }: { angle: number }) {
  return (
    <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
  );
}
