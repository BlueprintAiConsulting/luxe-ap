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
  Radio,
  Car,
  Camera,
  Maximize2,
  Box
} from "lucide-react";
import { VehicleShowcaseData } from "@/lib/data/fleetShowcase";

interface Vehicle360ViewerProps {
  vehicle: VehicleShowcaseData;
}

const FINISH_OPTIONS = [
  { 
    id: "black", 
    name: "Obsidian Onyx", 
    hex: "#0b0c10",
    glow: "rgba(212, 175, 55, 0.35)", 
    filter: "brightness(1.0) contrast(1.05)",
  },
  { 
    id: "midnight", 
    name: "Caviar Sapphire", 
    hex: "#0a1128", 
    glow: "rgba(59, 130, 246, 0.35)", 
    filter: "brightness(0.95) contrast(1.1) hue-rotate(185deg)",
  },
  { 
    id: "gold", 
    name: "Imperial Champagne", 
    hex: "#262013", 
    glow: "rgba(212, 175, 55, 0.5)", 
    filter: "brightness(1.05) contrast(1.1) sepia(0.3) hue-rotate(15deg)",
  },
  { 
    id: "platinum", 
    name: "Pearl Platinum", 
    hex: "#2d3748", 
    glow: "rgba(244, 244, 245, 0.35)", 
    filter: "brightness(1.25) contrast(0.95) saturate(0.7)",
  },
];

export default function Vehicle360Viewer({ vehicle }: Vehicle360ViewerProps) {
  const [angle, setAngle] = useState(45); // 0 to 360 degrees
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [selectedFinish, setSelectedFinish] = useState(FINISH_OPTIONS[0]);
  const [headlightsOn, setHeadlightsOn] = useState(true);
  const [activeHotspot, setActiveHotspot] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"photorealistic" | "wireframe">("photorealistic");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Auto rotation loop with smooth frame stepping
  useEffect(() => {
    if (!isAutoRotating) return;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      setAngle((prev) => (prev + delta * 20) % 360);
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isAutoRotating]);

  // Pointer drag controls for smooth 360 manual scrub
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setIsAutoRotating(false);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    if (Math.abs(deltaX) > 1) {
      setAngle((prev) => (prev - deltaX * 0.45 + 360) % 360);
      setStartX(e.clientX);
    }
  }, [isDragging, startX]);

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Render Turntable Ground Disc & Lighting on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const rad = (angle * Math.PI) / 180;
    const cx = width / 2;
    const cy = height * 0.62;

    // 1. Turntable Mirror Disc with Radial Studio Glow
    const discRadiusX = width * 0.45;
    const discRadiusY = height * 0.22;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy + 24, discRadiusX, discRadiusY, 0, 0, Math.PI * 2);
    const discGrad = ctx.createRadialGradient(cx, cy + 24, 15, cx, cy + 24, discRadiusX);
    discGrad.addColorStop(0, "rgba(28, 35, 52, 0.45)");
    discGrad.addColorStop(0.5, "rgba(12, 16, 26, 0.65)");
    discGrad.addColorStop(1, "rgba(4, 5, 8, 0.98)");
    ctx.fillStyle = discGrad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(212, 175, 55, 0.35)";
    ctx.stroke();

    // Turntable Degree Ticks
    for (let i = 0; i < 36; i++) {
      const tickRad = (i * 10 * Math.PI) / 180 + rad;
      const tx = cx + Math.cos(tickRad) * (discRadiusX - 12);
      const ty = cy + 24 + Math.sin(tickRad) * (discRadiusY - 12);
      ctx.fillStyle = i % 9 === 0 ? "rgba(212, 175, 55, 0.9)" : "rgba(255, 255, 255, 0.18)";
      ctx.fillRect(tx - 1.5, ty - 1.5, 3, 3);
    }
    ctx.restore();

    // 2. Dynamic Volumetric Headlight Beams (Front facing)
    const isFrontFacing = angle >= 290 || angle <= 70;
    const isRearFacing = angle >= 110 && angle <= 250;

    if (headlightsOn && isFrontFacing) {
      ctx.save();
      const beamGrad = ctx.createRadialGradient(cx, cy + 20, 20, cx, cy + 85, discRadiusX * 0.88);
      beamGrad.addColorStop(0, "rgba(255, 250, 230, 0.35)");
      beamGrad.addColorStop(0.4, "rgba(212, 175, 55, 0.15)");
      beamGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 55, discRadiusX * 0.85, discRadiusY * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (headlightsOn && isRearFacing) {
      ctx.save();
      const redGrad = ctx.createRadialGradient(cx, cy + 20, 20, cx, cy + 65, discRadiusX * 0.75);
      redGrad.addColorStop(0, "rgba(239, 68, 68, 0.35)");
      redGrad.addColorStop(0.5, "rgba(239, 68, 68, 0.08)");
      redGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = redGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 45, discRadiusX * 0.75, discRadiusY * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

  }, [angle, selectedFinish, headlightsOn]);

  const currentAngleDeg = Math.round(angle);

  // Determine current 3D perspective transform & flip for realistic car rendering
  const rad = (angle * Math.PI) / 180;
  const sinAngle = Math.sin(rad);
  const cosAngle = Math.cos(rad);
  const isFlipped = cosAngle < 0;

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-b from-[#101322] via-[#080a12] to-[#030406] border border-accent/30 shadow-2xl p-4 sm:p-8 select-none font-sans">
      
      {/* Top Header Controls (Identical to user approved UI) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-20 relative border-b border-neutral-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent font-mono text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 shadow-gold-sm">
              <RotateCw size={11} className={isAutoRotating ? "animate-spin" : ""} /> 360° Studio Visualizer
            </span>
            <span className="text-[11px] font-mono text-white bg-[#0a0d18] px-3 py-1 rounded-full border border-neutral-700">
              {currentAngleDeg}° View ({currentAngleDeg >= 315 || currentAngleDeg < 45 ? "Front" : currentAngleDeg < 135 ? "Right Profile" : currentAngleDeg < 225 ? "Rear" : "Left Profile"})
            </span>
          </div>
          <h3 className="text-xl font-bold font-serif text-white mt-1 uppercase tracking-tight">
            {vehicle.name} {vehicle.model}
          </h3>
        </div>

        {/* Orbit Toggle & Headlight Switch */}
        <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
          <button
            onClick={() => setHeadlightsOn(!headlightsOn)}
            className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all ${
              headlightsOn ? "bg-amber-950/80 border-amber-600 text-amber-300" : "bg-[#0c0e18] border-neutral-800 text-neutral-400"
            }`}
          >
            <Zap size={13} className={headlightsOn ? "fill-amber-300" : ""} />
            <span>LED DRLs</span>
          </button>

          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className="px-4 py-1.5 rounded-xl bg-gold-gradient text-neutral-950 font-bold flex items-center gap-1.5 shadow-gold-sm hover:brightness-110 active:scale-95 transition-all"
          >
            {isAutoRotating ? <Pause size={13} /> : <Play size={13} />}
            <span>{isAutoRotating ? "Pause Orbit" : "Auto Spin"}</span>
          </button>
        </div>
      </div>

      {/* 3D Interactive Turntable Stage with REAL PHOTOREALISTIC VEHICLE */}
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="relative w-full aspect-[16/9] sm:aspect-[21/9] flex items-center justify-center cursor-grab active:cursor-grabbing my-4 overflow-hidden rounded-2xl bg-[#04060a]"
        style={{ perspective: "1200px" }}
      >
        {/* Canvas for Glowing Turntable Floor & Volumetric Beams */}
        <canvas
          ref={canvasRef}
          width={960}
          height={420}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
        />

        {/* Ground Reflection & Shadow under Tires */}
        <div 
          className="absolute bottom-6 sm:bottom-10 w-3/5 h-20 rounded-[100%] blur-2xl pointer-events-none transition-all duration-500 z-10"
          style={{ 
            backgroundColor: selectedFinish.glow,
            transform: `translateX(${sinAngle * 25}px)`
          }}
        />

        {/* THE REAL VEHICLE FIGURE (3D Perspective Rotation on Turntable) */}
        <div 
          className="relative w-4/5 sm:w-3/5 h-4/5 flex items-center justify-center transition-transform duration-75 pointer-events-none z-20"
          style={{
            transform: `
              rotateY(${sinAngle * 28}deg) 
              rotateX(${-cosAngle * 4}deg) 
              scale(${1 - Math.abs(cosAngle) * 0.08})
              scaleX(${isFlipped ? -1 : 1})
            `,
            filter: selectedFinish.filter,
            transformStyle: "preserve-3d",
          }}
        >
          <Image
            src={vehicle.heroImage}
            alt={vehicle.name}
            fill
            sizes="(max-width: 1200px) 100vw, 1200px"
            className="object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.95)]"
            priority
          />
        </div>

        {/* Orbiting 3D Hotspot Overlays */}
        {vehicle.hotspots.map((hotspot, idx) => {
          const deltaDeg = (idx * 90 - angle + 360) % 360;
          const isVisible = deltaDeg < 80 || deltaDeg > 280;
          const radVal = (deltaDeg * Math.PI) / 180;
          const xOffset = Math.sin(radVal) * 38;
          const depthScale = Math.cos(radVal) * 0.3 + 0.7;

          if (!isVisible) return null;

          return (
            <div
              key={idx}
              style={{
                left: `${50 + xOffset}%`,
                top: `${44 + (idx % 2 === 0 ? -6 : 6)}%`,
                transform: `scale(${depthScale})`,
                opacity: depthScale,
              }}
              className="absolute z-30 -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
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

              {activeHotspot === idx && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 rounded-2xl bg-[#090b14]/98 backdrop-blur-2xl border border-accent/50 text-white shadow-2xl z-50 animate-in fade-in zoom-in-95">
                  <div className="text-xs font-bold text-accent font-serif">{hotspot.title}</div>
                  <p className="text-[11px] text-neutral-300 font-sans mt-1 leading-relaxed">{hotspot.detail}</p>
                </div>
              )}
            </div>
          );
        })}

        {/* Drag Hint Overlay */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-[#05070c]/85 backdrop-blur-md border border-neutral-800 text-[10px] font-mono text-neutral-400 flex items-center gap-2 pointer-events-none opacity-80 z-30">
          <Compass size={12} className="text-accent animate-spin" />
          <span>Click &amp; Drag in Any Direction to Rotate 360°</span>
        </div>
      </div>

      {/* Bottom Customization & Turntable Presets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-neutral-800/80 pt-5 font-mono text-xs">
        
        {/* Exterior Paint Swatches */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-neutral-400">Exterior Bespoke Finish:</span>
          <div className="flex items-center gap-2">
            {FINISH_OPTIONS.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedFinish(c)}
                className={`px-3 py-2 rounded-xl border flex items-center gap-2 transition-all ${
                  selectedFinish.id === c.id
                    ? "bg-[#141824] border-accent text-white font-bold shadow-gold-sm"
                    : "bg-[#0a0d16] border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                <div 
                  className="w-3.5 h-3.5 rounded-full border border-white/30"
                  style={{ backgroundColor: c.hex }}
                />
                <span className="text-[11px]">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Angle Jump Controls */}
        <div className="space-y-2 md:text-right">
          <span className="text-[10px] uppercase font-bold text-neutral-400">Turntable Presets:</span>
          <div className="flex items-center gap-1.5 md:justify-end">
            {[
              { label: "Front (0°)", deg: 0 },
              { label: "Quarter (45°)", deg: 45 },
              { label: "Side (90°)", deg: 90 },
              { label: "Rear (180°)", deg: 180 },
              { label: "Driver (270°)", deg: 270 },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setAngle(p.deg);
                  setIsAutoRotating(false);
                }}
                className={`px-2.5 py-1.5 rounded-lg border text-[10px] transition-all ${
                  Math.abs(angle - p.deg) < 15
                    ? "bg-accent/20 border-accent text-white font-bold"
                    : "bg-[#0b0e17] border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
