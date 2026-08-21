"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  Check,
  Shield,
  Layers,
  Car,
  Compass
} from "lucide-react";

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
    angle: number; // 0 to 360 degrees around the car
    elevation: number; // vertical height percentage 0 to 100
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

const COLOR_OPTIONS = [
  { id: "black", name: "Obsidian Onyx", hex: "#0b0c10", metalHex: "#1c1e24", highlight: "#404656" },
  { id: "midnight", name: "Caviar Sapphire", hex: "#0a1128", metalHex: "#14213d", highlight: "#3a6073" },
  { id: "gold", name: "Imperial Champagne", hex: "#1f1a10", metalHex: "#3d321d", highlight: "#d4af37" },
  { id: "platinum", name: "Pearl Platinum", hex: "#1e2229", metalHex: "#384152", highlight: "#a0aec0" },
];

export default function Vehicle360Viewer({ vehicle }: Vehicle360ViewerProps) {
  const [angle, setAngle] = useState(35); // 0 to 360 degrees
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [studioLight, setStudioLight] = useState<"night" | "studio" | "neon">("night");
  const [activeHotspot, setActiveHotspot] = useState<number | null>(null);
  const [headlightsOn, setHeadlightsOn] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Auto rotation loop with smooth frame stepping
  useEffect(() => {
    if (!isAutoRotating) return;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      setAngle((prev) => (prev + delta * 24) % 360);
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isAutoRotating]);

  // Pointer drag controls for smooth scrubbing
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

  // Render 3D Canvas Perspective Vehicle
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
    const cy = height * 0.58;

    // 1. Draw Turntable Mirror Disc with Radial Lighting
    const discRadiusX = width * 0.42;
    const discRadiusY = height * 0.22;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy + 20, discRadiusX, discRadiusY, 0, 0, Math.PI * 2);
    const discGrad = ctx.createRadialGradient(cx, cy + 20, 10, cx, cy + 20, discRadiusX);
    discGrad.addColorStop(0, studioLight === "neon" ? "rgba(212, 175, 55, 0.25)" : "rgba(30, 36, 52, 0.45)");
    discGrad.addColorStop(0.6, "rgba(12, 15, 24, 0.6)");
    discGrad.addColorStop(1, "rgba(4, 5, 8, 0.95)");
    ctx.fillStyle = discGrad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = studioLight === "neon" ? "rgba(212, 175, 55, 0.5)" : "rgba(212, 175, 55, 0.25)";
    ctx.stroke();

    // Turntable Degree Ticks
    for (let i = 0; i < 36; i++) {
      const tickRad = (i * 10 * Math.PI) / 180 + rad;
      const tx = cx + Math.cos(tickRad) * (discRadiusX - 10);
      const ty = cy + 20 + Math.sin(tickRad) * (discRadiusY - 10);
      ctx.fillStyle = i % 9 === 0 ? "rgba(212, 175, 55, 0.8)" : "rgba(255, 255, 255, 0.15)";
      ctx.fillRect(tx - 1, ty - 1, 2, 2);
    }
    ctx.restore();

    // 2. Headlight Beams on Floor (when facing camera)
    const isFrontFacing = angle >= 290 || angle <= 70;
    const isRearFacing = angle >= 110 && angle <= 250;

    if (headlightsOn && isFrontFacing) {
      ctx.save();
      const beamGrad = ctx.createRadialGradient(cx, cy + 20, 20, cx, cy + 70, discRadiusX * 0.9);
      beamGrad.addColorStop(0, "rgba(255, 250, 230, 0.45)");
      beamGrad.addColorStop(0.5, "rgba(212, 175, 55, 0.15)");
      beamGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 50, discRadiusX * 0.85, discRadiusY * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (headlightsOn && isRearFacing) {
      ctx.save();
      const redGrad = ctx.createRadialGradient(cx, cy + 20, 20, cx, cy + 50, discRadiusX * 0.75);
      redGrad.addColorStop(0, "rgba(239, 68, 68, 0.35)");
      redGrad.addColorStop(0.6, "rgba(239, 68, 68, 0.08)");
      redGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = redGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 40, discRadiusX * 0.7, discRadiusY * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Render 3D Geometric Body of Vehicle
    const isSUV = vehicle.classId === "suv";
    const isSedan = vehicle.classId === "sedan";
    const bodyLength = isSUV ? 280 : isSedan ? 240 : 310;
    const bodyWidth = isSUV ? 130 : isSedan ? 115 : 120;
    const bodyHeight = isSUV ? 105 : isSedan ? 70 : 140;

    // 3D coordinate transformation
    const project = (x: number, y: number, z: number) => {
      // Rotate around Y axis (yaw)
      const rx = x * Math.cos(rad) - z * Math.sin(rad);
      const rz = x * Math.sin(rad) + z * Math.cos(rad);
      
      // Perspective scale factor
      const fov = 650;
      const scale = fov / (fov + rz);
      
      return {
        x: cx + rx * scale,
        y: cy - y * scale + (rz * 0.25),
        scale,
        depth: rz,
      };
    };

    // Chassis 3D Keypoints
    const pFrontL = project(-bodyWidth / 2, 0, bodyLength / 2);
    const pFrontR = project(bodyWidth / 2, 0, bodyLength / 2);
    const pRearL = project(-bodyWidth / 2, 0, -bodyLength / 2);
    const pRearR = project(bodyWidth / 2, 0, -bodyLength / 2);

    const pRoofFrontL = project(-bodyWidth * 0.42, bodyHeight, bodyLength * 0.15);
    const pRoofFrontR = project(bodyWidth * 0.42, bodyHeight, bodyLength * 0.15);
    const pRoofRearL = project(-bodyWidth * 0.42, bodyHeight * 0.95, -bodyLength * 0.42);
    const pRoofRearR = project(bodyWidth * 0.42, bodyHeight * 0.95, -bodyLength * 0.42);

    const pHoodL = project(-bodyWidth * 0.46, bodyHeight * 0.52, bodyLength * 0.46);
    const pHoodR = project(bodyWidth * 0.46, bodyHeight * 0.52, bodyLength * 0.46);

    // Draw Shadow Beneath Chassis
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pFrontL.x, pFrontL.y + 12);
    ctx.lineTo(pFrontR.x, pFrontR.y + 12);
    ctx.lineTo(pRearR.x, pRearR.y + 12);
    ctx.lineTo(pRearL.x, pRearL.y + 12);
    ctx.closePath();
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.filter = "blur(10px)";
    ctx.fill();
    ctx.restore();

    // Render Metallic Surfaces
    const drawSurface = (points: { x: number; y: number }[], color: string, stroke = "rgba(212, 175, 55, 0.35)") => {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    };

    // Body Gradient Colors
    const sideColor = selectedColor.metalHex;
    const hoodColor = selectedColor.highlight;
    const glassColor = "rgba(18, 24, 38, 0.85)";

    // Roof & Glass Cabin
    drawSurface([pRoofFrontL, pRoofFrontR, pRoofRearR, pRoofRearL], glassColor, "rgba(212, 175, 55, 0.5)");
    // Windshield
    drawSurface([pHoodL, pHoodR, pRoofFrontR, pRoofFrontL], "rgba(35, 45, 65, 0.75)");
    // Rear Glass
    drawSurface([pRoofRearL, pRoofRearR, pRearR, pRearL], "rgba(20, 26, 38, 0.8)");
    // Hood Surface
    drawSurface([pFrontL, pFrontR, pHoodR, pHoodL], hoodColor);

    // Front Grille & Signature DRL Headlights
    if (isFrontFacing) {
      drawSurface([pFrontL, pFrontR, pHoodR, pHoodL], "rgba(15, 17, 24, 0.95)", "rgba(212, 175, 55, 0.8)");
      
      // Vertical LED DRLs (Cadillac / S-Class LED blades)
      if (headlightsOn) {
        ctx.save();
        ctx.fillStyle = "#fffdf0";
        ctx.shadowColor = "#fef08a";
        ctx.shadowBlur = 12;
        ctx.fillRect(pFrontL.x - 3, pFrontL.y - 18, 5, 20);
        ctx.fillRect(pFrontR.x - 2, pFrontR.y - 18, 5, 20);
        ctx.restore();
      }
    }

    // Rear Tailgate & Red OLED Blades
    if (isRearFacing) {
      drawSurface([pRearL, pRearR, pRoofRearR, pRoofRearL], "rgba(10, 12, 18, 0.98)", "rgba(239, 68, 68, 0.6)");
      
      if (headlightsOn) {
        ctx.save();
        ctx.fillStyle = "#ef4444";
        ctx.shadowColor = "#dc2626";
        ctx.shadowBlur = 14;
        ctx.fillRect(pRearL.x - 3, pRearL.y - 30, 4, 30);
        ctx.fillRect(pRearR.x - 1, pRearR.y - 30, 4, 30);
        ctx.restore();
      }
    }

    // Starline Roof Antenna Marker
    const pRoofCenter = project(0, bodyHeight + 8, 0);
    ctx.save();
    ctx.beginPath();
    ctx.arc(pRoofCenter.x, pRoofCenter.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "#d4af37";
    ctx.shadowColor = "#d4af37";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();

  }, [angle, selectedColor, studioLight, headlightsOn, vehicle.classId]);

  // Compute 3D Position of Hotspots
  const currentAngleDeg = Math.round(angle);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-b from-[#101322] via-[#080a12] to-[#030406] border border-accent/30 shadow-2xl p-4 sm:p-8 select-none font-sans">
      
      {/* Top Header Controls */}
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
          <h3 className="text-xl font-bold font-serif text-white mt-1">{vehicle.name} {vehicle.model}</h3>
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

      {/* 3D Interactive Canvas Stage */}
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="relative w-full aspect-[16/9] sm:aspect-[21/9] flex items-center justify-center cursor-grab active:cursor-grabbing my-4 overflow-hidden rounded-2xl bg-[#04060a]"
      >
        <canvas
          ref={canvasRef}
          width={960}
          height={420}
          className="w-full h-full object-contain pointer-events-none"
        />

        {/* 3D Hotspot Overlays */}
        {vehicle.hotspots.map((hotspot, idx) => {
          const deltaDeg = (hotspot.angle - angle + 360) % 360;
          const isVisible = deltaDeg < 90 || deltaDeg > 270;
          const rad = (deltaDeg * Math.PI) / 180;
          const xOffset = Math.sin(rad) * 40;
          const depthScale = Math.cos(rad) * 0.3 + 0.7;

          if (!isVisible) return null;

          return (
            <div
              key={idx}
              style={{
                left: `${50 + xOffset}%`,
                top: `${hotspot.elevation}%`,
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
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-60 p-3.5 rounded-2xl bg-[#090b14]/98 backdrop-blur-2xl border border-accent/50 text-white shadow-2xl z-50 animate-in fade-in zoom-in-95">
                  <div className="text-xs font-bold text-accent font-serif">{hotspot.title}</div>
                  <p className="text-[11px] text-neutral-300 font-sans mt-0.5 leading-relaxed">{hotspot.detail}</p>
                </div>
              )}
            </div>
          );
        })}

        {/* Drag Hint Overlay */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-[#05070c]/85 backdrop-blur-md border border-neutral-800 text-[10px] font-mono text-neutral-400 flex items-center gap-2 pointer-events-none opacity-80">
          <Compass size={12} className="text-accent animate-spin" />
          <span>Click &amp; Drag in Any Direction to Rotate 360°</span>
        </div>
      </div>

      {/* Bottom Customization & Angle Selector Dock */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-neutral-800/80 pt-5 font-mono text-xs">
        
        {/* Exterior Paint Swatches */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-neutral-400">Exterior Bespoke Finish:</span>
          <div className="flex items-center gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedColor(c)}
                className={`px-3 py-2 rounded-xl border flex items-center gap-2 transition-all ${
                  selectedColor.id === c.id
                    ? "bg-[#141824] border-accent text-white font-bold shadow-gold-sm"
                    : "bg-[#0a0d16] border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                <div 
                  className="w-3.5 h-3.5 rounded-full border border-white/30"
                  style={{ backgroundColor: c.highlight }}
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
