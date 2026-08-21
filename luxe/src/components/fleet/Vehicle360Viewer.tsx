"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { 
  RotateCw, 
  Sparkles, 
  Eye, 
  Play, 
  Pause,
  Sun,
  Moon,
  Zap,
  Check,
  Shield,
  Layers,
  Compass,
  Search,
  Scan,
  Maximize2,
  ChevronRight,
  Radio
} from "lucide-react";
import { VehicleShowcaseData } from "@/lib/data/fleetShowcase";

interface Vehicle360ViewerProps {
  vehicle: VehicleShowcaseData;
}

const FINISH_PRESETS = [
  { id: "black", name: "Obsidian Onyx", hex: "#0b0c10", glow: "rgba(212, 175, 55, 0.35)", tintClass: "brightness-100 contrast-105" },
  { id: "midnight", name: "Caviar Sapphire", hex: "#0a1128", glow: "rgba(59, 130, 246, 0.35)", tintClass: "hue-rotate-[190deg] brightness-95" },
  { id: "gold", name: "Imperial Champagne", hex: "#262013", glow: "rgba(212, 175, 55, 0.5)", tintClass: "hue-rotate-[30deg] brightness-105" },
  { id: "platinum", name: "Pearl Platinum", hex: "#222730", glow: "rgba(244, 244, 245, 0.35)", tintClass: "brightness-125 contrast-95" },
];

export interface CameraInspectionZone {
  id: string;
  name: string;
  label: string;
  panX: number; // percentage offset
  panY: number;
  zoom: number; // scale factor
  description: string;
  specDetail: string;
}

export default function Vehicle360Viewer({ vehicle }: Vehicle360ViewerProps) {
  // 3D Parallax Tilt Angles (-25 to +25 deg)
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);
  const [isAutoOrbit, setIsAutoOrbit] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [activeZone, setActiveZone] = useState<string>("full");
  const [selectedFinish, setSelectedFinish] = useState(FINISH_PRESETS[0]);
  const [studioLight, setStudioLight] = useState<"night" | "studio">("night");
  const [activeHotspot, setActiveHotspot] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Define Cinematic Camera Inspection Zones for the Exact Vehicle
  const inspectionZones: CameraInspectionZone[] = [
    {
      id: "full",
      name: "Full Stance",
      label: "Complete Vehicle",
      panX: 0,
      panY: 0,
      zoom: 1.0,
      description: "Full exterior studio perspective with ground mirror reflections and aerodynamic stance.",
      specDetail: `${vehicle.passengers} VIP Guests • ${vehicle.luggage} Luggage Trunks`,
    },
    {
      id: "grille",
      name: "Front Optics & Grille",
      label: "Front Grille",
      panX: -22,
      panY: 8,
      zoom: 1.6,
      description: "Galvano gloss-black mesh grille with illuminated crest and LED blade headlights.",
      specDetail: "DIGITAL LIGHT Matrix • Active Aero Cooling Shutters",
    },
    {
      id: "cabin",
      name: "Executive VIP Salon",
      label: "VIP Cabin",
      panX: 18,
      panY: -5,
      zoom: 1.55,
      description: "Double-laminated acoustic privacy glass, soft-close doors, and Starline ceiling.",
      specDetail: "54 dB Whisper Quiet • Starlink 5G Satellite Link",
    },
    {
      id: "wheelbase",
      name: "Extended Wheelbase & Alloys",
      label: "Alloys & Stance",
      panX: 10,
      panY: 22,
      zoom: 1.65,
      description: "Extended chassis stretch with 22-inch dark finish alloy wheels and adaptive air suspension.",
      specDetail: "AIRMATIC Suspension • Soft-Close Power Steps",
    },
  ];

  const currentZone = inspectionZones.find((z) => z.id === activeZone) || inspectionZones[0];

  // Smooth sinusoidal camera orbit
  useEffect(() => {
    if (!isAutoOrbit || activeZone !== "full") return;
    let startTime = performance.now();

    let animationFrame: number;
    const loop = (time: number) => {
      const elapsed = (time - startTime) / 1000;
      // Gentle horizontal orbital sway
      const newTiltX = Math.sin(elapsed * 0.8) * 16;
      const newTiltY = Math.cos(elapsed * 0.8) * 4;
      setTiltX(newTiltX);
      setTiltY(newTiltY);
      animationFrame = requestAnimationFrame(loop);
    };

    animationFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrame);
  }, [isAutoOrbit, activeZone]);

  // Pointer drag controls for 3D manual rotation
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setIsAutoOrbit(false);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    setTiltX((prev) => {
      const next = prev + deltaX * 0.35;
      return Math.max(-28, Math.min(28, next));
    });
    setStartX(e.clientX);
  }, [isDragging, startX]);

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-b from-[#0e111d] via-[#07090f] to-[#030406] border border-accent/30 shadow-2xl p-4 sm:p-8 select-none font-sans">
      
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-20 relative border-b border-neutral-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent font-mono text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 shadow-gold-sm">
              <RotateCw size={11} className={isAutoOrbit ? "animate-spin" : ""} /> 3D Studio Visualizer
            </span>
            <span className="text-[11px] font-mono text-white bg-[#0b0e18] px-3 py-1 rounded-full border border-neutral-700 font-bold">
              {currentZone.name}
            </span>
          </div>
          <h3 className="text-xl font-bold font-serif text-white mt-1.5">{vehicle.name}</h3>
        </div>

        {/* Studio Lighting & Orbit Controls */}
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
            onClick={() => {
              setIsAutoOrbit(!isAutoOrbit);
              if (!isAutoOrbit) setActiveZone("full");
            }}
            className="px-4 py-2 min-h-[40px] rounded-xl bg-gold-gradient text-neutral-950 font-bold flex items-center gap-1.5 shadow-gold-sm hover:brightness-110 active:scale-95 transition-all"
          >
            {isAutoOrbit ? <Pause size={13} /> : <Play size={13} />}
            <span>{isAutoOrbit ? "Pause Orbit" : "Auto Orbit"}</span>
          </button>
        </div>
      </div>

      {/* Main 3D Studio Stage */}
      <div 
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="relative w-full aspect-[16/9] sm:aspect-[21/9] flex items-center justify-center my-4 overflow-hidden rounded-2xl cursor-grab active:cursor-grabbing group bg-[#04060a]"
        style={{ perspective: "1000px" }}
      >
        
        {/* Studio Floor Ambient Glow & Mirror Disc */}
        <div 
          className="absolute bottom-2 sm:bottom-4 w-4/5 h-24 rounded-[100%] blur-3xl pointer-events-none transition-all duration-700"
          style={{ 
            backgroundColor: selectedFinish.glow,
            transform: `translateX(${tiltX * 2}px)`
          }}
        />
        
        {/* Mirror Reflection Turntable Disc */}
        <div className="absolute bottom-0 w-3/4 h-16 border-t border-accent/25 rounded-[100%] pointer-events-none opacity-40" />

        {/* 3D Perspective Vehicle Canvas Container */}
        <div 
          className="relative w-full h-full flex items-center justify-center transition-transform duration-500 ease-out pointer-events-none"
          style={{
            transform: `
              scale(${currentZone.zoom}) 
              translate(${currentZone.panX + tiltX * 0.2}%, ${currentZone.panY + tiltY * 0.2}%) 
              rotateY(${tiltX}deg) 
              rotateX(${-tiltY}deg)
            `,
            transformStyle: "preserve-3d",
          }}
        >
          <Image
            src={vehicle.heroImage}
            alt={vehicle.name}
            fill
            sizes="(max-width: 1200px) 100vw, 1200px"
            className={`object-contain drop-shadow-[0_25px_45px_rgba(0,0,0,0.95)] transition-all duration-500 ${selectedFinish.tintClass}`}
            priority
          />
        </div>

        {/* Hotspots (pinned when in full stance) */}
        {activeZone === "full" && vehicle.hotspots.map((hotspot, idx) => (
          <div
            key={idx}
            style={{ 
              left: `${hotspot.x + (tiltX * 0.15)}%`, 
              top: `${hotspot.y}%` 
            }}
            className="absolute z-30 -translate-x-1/2 -translate-y-1/2 transition-transform duration-100"
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

            {/* Hotspot Popup */}
            {activeHotspot === idx && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 rounded-2xl bg-[#090b14]/98 backdrop-blur-2xl border border-accent/50 text-white shadow-2xl z-50 animate-in fade-in zoom-in-95">
                <div className="text-xs font-bold text-accent font-serif">{hotspot.title}</div>
                <p className="text-[11px] text-neutral-300 font-sans mt-1 leading-relaxed">{hotspot.detail}</p>
              </div>
            )}
          </div>
        ))}

        {/* Dynamic Studio Telemetry HUD Bar */}
        <div className="absolute bottom-3 left-4 right-4 sm:left-8 sm:right-8 p-3.5 rounded-2xl bg-[#05070c]/85 backdrop-blur-md border border-neutral-800 text-xs font-mono text-neutral-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-accent animate-pulse shrink-0" />
            <span className="font-bold text-white">{currentZone.name}:</span>
            <span className="truncate text-neutral-300">{currentZone.description}</span>
          </div>
          <span className="text-accent font-bold shrink-0 self-end sm:self-auto">
            {currentZone.specDetail}
          </span>
        </div>

        {/* Drag Hint (only in full mode) */}
        {activeZone === "full" && (
          <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-[#05070c]/70 backdrop-blur-md border border-neutral-800 text-[10px] font-mono text-neutral-400 pointer-events-none opacity-80 flex items-center gap-1.5">
            <Compass size={11} className="text-accent" />
            <span>Drag to Tilt Camera 3D</span>
          </div>
        )}

      </div>

      {/* Cinematic Inspection Zones & Bespoke Paint Swatches */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 border-t border-neutral-800/80 pt-5 font-mono text-xs items-center">
        
        {/* Camera Inspection Focus Buttons */}
        <div className="lg:col-span-8 flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-neutral-500 mr-1 flex items-center gap-1">
            <Scan size={12} className="text-accent" /> Camera Focus:
          </span>
          {inspectionZones.map((zone) => (
            <button
              key={zone.id}
              onClick={() => {
                setActiveZone(zone.id);
                setIsAutoOrbit(false);
                if (zone.id === "full") {
                  setTiltX(0);
                  setTiltY(0);
                }
              }}
              className={`px-3.5 py-2 min-h-[40px] rounded-xl border font-bold transition-all active:scale-95 flex items-center gap-1.5 ${
                activeZone === zone.id
                  ? "bg-accent/20 border-accent text-white shadow-gold-sm"
                  : "bg-[#0b0e18] border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <span>{zone.label}</span>
            </button>
          ))}
        </div>

        {/* Bespoke Finish Swatches */}
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
              style={{ backgroundColor: f.hex }}
            />
          ))}
        </div>

      </div>

    </div>
  );
}
