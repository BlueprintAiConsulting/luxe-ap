"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { 
  RotateCw, 
  Sparkles, 
  Layers, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause,
  Maximize2
} from "lucide-react";
import Image from "next/image";

export interface VehicleShowcaseData {
  id: string;
  classId: "suv" | "sedan" | "sprinter";
  name: string;
  model: string;
  tagline: string;
  priceEstimate: string;
  passengers: number;
  luggage: number;
  exterior360Images: string[];
  interiorSnapshots: {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    tag: string;
  }[];
  hotspots: {
    x: number; // percentage
    y: number; // percentage
    title: string;
    detail: string;
  }[];
  specs: {
    label: string;
    value: string;
    detail: string;
  }[];
}

interface Vehicle360ViewerProps {
  vehicle: VehicleShowcaseData;
}

export default function Vehicle360Viewer({ vehicle }: Vehicle360ViewerProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [activeHotspot, setActiveHotspot] = useState<number | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const frameCount = vehicle.exterior360Images.length || 8;

  // Auto rotation interval
  useEffect(() => {
    if (!isAutoRotating) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frameCount);
    }, 140);
    return () => clearInterval(interval);
  }, [isAutoRotating, frameCount]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setIsAutoRotating(false);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    if (Math.abs(deltaX) > 15) {
      const step = deltaX > 0 ? -1 : 1;
      setCurrentFrame((prev) => (prev + step + frameCount) % frameCount);
      setStartX(e.clientX);
    }
  }, [isDragging, startX, frameCount]);

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const currentImage = vehicle.exterior360Images[currentFrame] || vehicle.exterior360Images[0];
  const angleDegrees = Math.round((currentFrame / frameCount) * 360);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-b from-[#101320] via-[#090b12] to-[#040508] border border-accent/25 shadow-2xl p-4 sm:p-8 select-none">
      
      {/* Top HUD Controls */}
      <div className="flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent font-mono text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 shadow-gold-sm">
            <RotateCw size={11} className={isAutoRotating ? "animate-spin" : ""} /> 360° Virtual Turntable
          </span>
          <span className="text-[11px] font-mono text-neutral-400 bg-[#07090e] px-2.5 py-1 rounded-full border border-neutral-800">
            {angleDegrees}° View
          </span>
        </div>

        <button
          onClick={() => setIsAutoRotating(!isAutoRotating)}
          className="px-3.5 py-1.5 rounded-full bg-[#161a28] hover:bg-[#1e2438] border border-neutral-700 text-white font-mono text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
        >
          {isAutoRotating ? <Pause size={12} className="text-amber-400" /> : <Play size={12} className="text-emerald-400" />}
          <span>{isAutoRotating ? "Pause Orbit" : "Auto Orbit"}</span>
        </button>
      </div>

      {/* 360 Virtual Interactive Stage */}
      <div 
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="relative w-full aspect-[16/9] sm:aspect-[21/9] flex items-center justify-center cursor-grab active:cursor-grabbing my-4 group overflow-hidden"
      >
        {/* Studio Lighting Glow Floor Ring */}
        <div className="absolute bottom-2 sm:bottom-6 w-3/4 h-24 bg-accent/10 rounded-[100%] blur-3xl pointer-events-none" />
        <div className="absolute bottom-4 sm:bottom-8 w-2/3 h-12 bg-blue-500/10 rounded-[100%] blur-2xl pointer-events-none" />
        
        {/* Vehicle Image */}
        <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
          <Image
            src={currentImage}
            alt={`${vehicle.name} 360 View Frame ${currentFrame}`}
            fill
            sizes="(max-width: 1200px) 100vw, 1200px"
            className="object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.9)] transition-transform duration-75 group-hover:scale-102"
            priority
          />
        </div>

        {/* Hotspot Markers */}
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
              className="relative w-6 h-6 rounded-full bg-accent text-neutral-950 flex items-center justify-center shadow-gold-sm hover:scale-125 transition-transform group/hotspot"
            >
              <Sparkles size={12} className="animate-pulse" />
              <span className="absolute inset-0 rounded-full bg-accent/40 animate-ping" />
            </button>

            {/* Hotspot Popover */}
            {activeHotspot === idx && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 p-3 rounded-2xl bg-[#090b14]/95 backdrop-blur-xl border border-accent/40 text-white shadow-2xl z-40 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[11px] font-bold text-accent font-serif">{hotspot.title}</div>
                <p className="text-[10px] text-neutral-300 font-sans mt-0.5 leading-tight">{hotspot.detail}</p>
              </div>
            )}
          </div>
        ))}

        {/* Drag To Rotate Subtle Overlay Cue */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-[#05070c]/80 backdrop-blur-md border border-neutral-800 text-[10px] font-mono text-neutral-400 flex items-center gap-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <span>⟵ Drag to Rotate 360° ⟶</span>
        </div>
      </div>

      {/* Angle Quick-Jump Preset Buttons */}
      <div className="flex items-center justify-between border-t border-neutral-800/80 pt-4 font-mono text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="text-neutral-500 uppercase mr-1 hidden sm:inline">Perspective:</span>
          {[
            { label: "Front (0°)", frame: 0 },
            { label: "Profile (90°)", frame: Math.round(frameCount * 0.25) },
            { label: "Rear (180°)", frame: Math.round(frameCount * 0.5) },
            { label: "Driver (270°)", frame: Math.round(frameCount * 0.75) },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                setCurrentFrame(preset.frame);
                setIsAutoRotating(false);
              }}
              className={`px-3 py-1.5 rounded-xl border transition-all ${
                currentFrame === preset.frame
                  ? "bg-accent/20 border-accent text-white font-bold"
                  : "bg-[#0c0e18] border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCurrentFrame((prev) => (prev - 1 + frameCount) % frameCount);
              setIsAutoRotating(false);
            }}
            className="w-8 h-8 rounded-xl bg-[#121522] border border-neutral-800 text-white flex items-center justify-center hover:border-accent transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => {
              setCurrentFrame((prev) => (prev + 1) % frameCount);
              setIsAutoRotating(false);
            }}
            className="w-8 h-8 rounded-xl bg-[#121522] border border-neutral-800 text-white flex items-center justify-center hover:border-accent transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

    </div>
  );
}
