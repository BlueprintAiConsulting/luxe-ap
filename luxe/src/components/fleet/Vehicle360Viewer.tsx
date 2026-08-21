"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  Car
} from "lucide-react";
import { VehicleShowcaseData } from "@/lib/data/fleetShowcase";

interface Vehicle360ViewerProps {
  vehicle: VehicleShowcaseData;
}

const FINISH_OPTIONS = [
  { 
    id: "black", 
    name: "Obsidian Onyx", 
    bodyGrad: ["#1c1f26", "#0c0d12", "#050608"],
    highlight: "#525e75",
    glow: "rgba(212, 175, 55, 0.35)", 
    hex: "#0b0c10" 
  },
  { 
    id: "midnight", 
    name: "Caviar Sapphire", 
    bodyGrad: ["#1a2a4a", "#0d172e", "#050914"],
    highlight: "#4870b8",
    glow: "rgba(59, 130, 246, 0.35)", 
    hex: "#0a1128" 
  },
  { 
    id: "gold", 
    name: "Imperial Champagne", 
    bodyGrad: ["#42361f", "#241c0e", "#0f0b05"],
    highlight: "#d4af37",
    glow: "rgba(212, 175, 55, 0.5)", 
    hex: "#262013" 
  },
  { 
    id: "platinum", 
    name: "Pearl Platinum", 
    bodyGrad: ["#4a5568", "#2d3748", "#1a202c"],
    highlight: "#cbd5e0",
    glow: "rgba(244, 244, 245, 0.35)", 
    hex: "#2d3748" 
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Auto rotation loop with smooth frame stepping
  useEffect(() => {
    if (!isAutoRotating) return;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      setAngle((prev) => (prev + delta * 22) % 360);
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

  // Render High-Detail Luxury Car & Turntable Canvas
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

    // 1. Draw Turntable Mirror Disc with Radial Studio Glow
    const discRadiusX = width * 0.44;
    const discRadiusY = height * 0.22;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy + 28, discRadiusX, discRadiusY, 0, 0, Math.PI * 2);
    const discGrad = ctx.createRadialGradient(cx, cy + 28, 15, cx, cy + 28, discRadiusX);
    discGrad.addColorStop(0, "rgba(28, 35, 52, 0.5)");
    discGrad.addColorStop(0.5, "rgba(12, 16, 26, 0.7)");
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
      const ty = cy + 28 + Math.sin(tickRad) * (discRadiusY - 12);
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
      beamGrad.addColorStop(0, "rgba(255, 250, 230, 0.4)");
      beamGrad.addColorStop(0.4, "rgba(212, 175, 55, 0.18)");
      beamGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 60, discRadiusX * 0.85, discRadiusY * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (headlightsOn && isRearFacing) {
      ctx.save();
      const redGrad = ctx.createRadialGradient(cx, cy + 20, 20, cx, cy + 65, discRadiusX * 0.75);
      redGrad.addColorStop(0, "rgba(239, 68, 68, 0.4)");
      redGrad.addColorStop(0.5, "rgba(239, 68, 68, 0.1)");
      redGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = redGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 50, discRadiusX * 0.75, discRadiusY * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. 3D Keypoint Projector for Realistic Automotive Geometry
    const isSUV = vehicle.classId === "suv";
    const isSedan = vehicle.classId === "sedan";

    const carLength = isSUV ? 300 : isSedan ? 260 : 330;
    const carWidth = isSUV ? 140 : isSedan ? 120 : 135;
    const carHeight = isSUV ? 115 : isSedan ? 80 : 155;

    const project = (x: number, y: number, z: number) => {
      const rx = x * Math.cos(rad) - z * Math.sin(rad);
      const rz = x * Math.sin(rad) + z * Math.cos(rad);
      const fov = 720;
      const scale = fov / (fov + rz);
      return {
        x: cx + rx * scale,
        y: cy - y * scale + (rz * 0.22),
        scale,
        depth: rz,
      };
    };

    // 4. Contact Tire Shadow
    const shadowP1 = project(-carWidth * 0.55, 0, carLength * 0.5);
    const shadowP2 = project(carWidth * 0.55, 0, carLength * 0.5);
    const shadowP3 = project(carWidth * 0.55, 0, -carLength * 0.5);
    const shadowP4 = project(-carWidth * 0.55, 0, -carLength * 0.5);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(shadowP1.x, shadowP1.y + 12);
    ctx.lineTo(shadowP2.x, shadowP2.y + 12);
    ctx.lineTo(shadowP3.x, shadowP3.y + 12);
    ctx.lineTo(shadowP4.x, shadowP4.y + 12);
    ctx.closePath();
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.filter = "blur(12px)";
    ctx.fill();
    ctx.restore();

    // 5. Draw 3D Metallic Vehicle Body (Sleek Curvatures, Glass & Lighting)
    // Points definition for realistic silhouette:
    // Front Bumper / Grille Base
    const fBumperL = project(-carWidth * 0.48, 12, carLength * 0.5);
    const fBumperR = project(carWidth * 0.48, 12, carLength * 0.5);
    const fGrilleTopL = project(-carWidth * 0.46, carHeight * 0.5, carLength * 0.49);
    const fGrilleTopR = project(carWidth * 0.46, carHeight * 0.5, carLength * 0.49);

    // Hood & Windshield Base
    const fHoodBaseL = project(-carWidth * 0.45, carHeight * 0.55, carLength * 0.18);
    const fHoodBaseR = project(carWidth * 0.45, carHeight * 0.55, carLength * 0.18);

    // Roof & Greenhouse
    const rRoofFrontL = project(-carWidth * 0.4, carHeight, carLength * 0.12);
    const rRoofFrontR = project(carWidth * 0.4, carHeight, carLength * 0.12);
    const rRoofRearL = project(-carWidth * 0.4, carHeight * (isSedan ? 0.92 : 0.98), -carLength * (isSedan ? 0.22 : 0.44));
    const rRoofRearR = project(carWidth * 0.4, carHeight * (isSedan ? 0.92 : 0.98), -carLength * (isSedan ? 0.22 : 0.44));

    // Rear Deck / Trunk / Tailgate
    const rTrunkBaseL = project(-carWidth * 0.47, carHeight * 0.52, -carLength * 0.48);
    const rTrunkBaseR = project(carWidth * 0.47, carHeight * 0.52, -carLength * 0.48);
    const rBumperL = project(-carWidth * 0.48, 14, -carLength * 0.5);
    const rBumperR = project(carWidth * 0.48, 14, -carLength * 0.5);

    // Helper to draw realistic metallic surface
    const drawPolygon = (points: { x: number; y: number }[], fillStyle: string | CanvasGradient, strokeStyle?: string) => {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = fillStyle;
      ctx.fill();
      if (strokeStyle) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = strokeStyle;
        ctx.stroke();
      }
    };

    // Body paint gradients
    const bodyBaseGrad = ctx.createLinearGradient(0, cy - carHeight, 0, cy);
    bodyBaseGrad.addColorStop(0, selectedFinish.bodyGrad[0]);
    bodyBaseGrad.addColorStop(0.5, selectedFinish.bodyGrad[1]);
    bodyBaseGrad.addColorStop(1, selectedFinish.bodyGrad[2]);

    const hoodGrad = ctx.createLinearGradient(cx - 100, cy - 50, cx + 100, cy);
    hoodGrad.addColorStop(0, selectedFinish.highlight);
    hoodGrad.addColorStop(0.7, selectedFinish.bodyGrad[0]);
    hoodGrad.addColorStop(1, selectedFinish.bodyGrad[1]);

    const glassGrad = ctx.createLinearGradient(cx, cy - carHeight, cx, cy);
    glassGrad.addColorStop(0, "rgba(22, 30, 48, 0.9)");
    glassGrad.addColorStop(0.6, "rgba(10, 14, 24, 0.95)");
    glassGrad.addColorStop(1, "rgba(5, 7, 12, 0.98)");

    // Render 3D Body Surfaces
    // 1. Lower Rocker Body Base
    drawPolygon([fBumperL, fBumperR, rBumperR, rBumperL], bodyBaseGrad, "rgba(212, 175, 55, 0.2)");

    // 2. Side Beltline Panels
    drawPolygon([fBumperL, fGrilleTopL, fHoodBaseL, rTrunkBaseL, rBumperL], bodyBaseGrad, "rgba(212, 175, 55, 0.3)");
    drawPolygon([fBumperR, fGrilleTopR, fHoodBaseR, rTrunkBaseR, rBumperR], bodyBaseGrad, "rgba(212, 175, 55, 0.3)");

    // 3. Hood Top
    drawPolygon([fGrilleTopL, fGrilleTopR, fHoodBaseR, fHoodBaseL], hoodGrad, "rgba(212, 175, 55, 0.4)");

    // 4. Tinted Glass Greenhouse (Windshield, Side Windows, Rear Window)
    // Windshield
    drawPolygon([fHoodBaseL, fHoodBaseR, rRoofFrontR, rRoofFrontL], glassGrad, "rgba(212, 175, 55, 0.5)");
    // Side Passenger Glass
    drawPolygon([fHoodBaseL, rRoofFrontL, rRoofRearL, rTrunkBaseL], glassGrad, "rgba(212, 175, 55, 0.4)");
    drawPolygon([fHoodBaseR, rRoofFrontR, rRoofRearR, rTrunkBaseR], glassGrad, "rgba(212, 175, 55, 0.4)");
    // Roof Top (Panoramic Starline Glass)
    drawPolygon([rRoofFrontL, rRoofFrontR, rRoofRearR, rRoofRearL], "rgba(8, 11, 18, 0.98)", "rgba(212, 175, 55, 0.6)");
    // Rear Window
    drawPolygon([rRoofRearL, rRoofRearR, rTrunkBaseR, rTrunkBaseL], glassGrad, "rgba(212, 175, 55, 0.4)");

    // 6. Draw Detailed Front Grille & Headlights (when facing forward)
    if (isFrontFacing) {
      // Front Grille Mesh
      const grilleGrad = ctx.createLinearGradient(fGrilleTopL.x, fGrilleTopL.y, fGrilleTopR.x, fBumperR.y);
      grilleGrad.addColorStop(0, "#1f2430");
      grilleGrad.addColorStop(1, "#07090e");
      drawPolygon([fGrilleTopL, fGrilleTopR, fBumperR, fBumperL], grilleGrad, "rgba(212, 175, 55, 0.8)");

      // Center Gold Emblem (Cadillac Crest / Mercedes Star)
      const emblemCenter = project(0, carHeight * 0.32, carLength * 0.5);
      ctx.save();
      ctx.beginPath();
      ctx.arc(emblemCenter.x, emblemCenter.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#d4af37";
      ctx.shadowColor = "#d4af37";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();

      // Vertical LED DRL Blades (Cadillac / Mercedes)
      if (headlightsOn) {
        ctx.save();
        ctx.fillStyle = "#fffef0";
        ctx.shadowColor = "#fef08a";
        ctx.shadowBlur = 16;
        ctx.fillRect(fGrilleTopL.x - 3, fGrilleTopL.y, 4.5, fBumperL.y - fGrilleTopL.y);
        ctx.fillRect(fGrilleTopR.x - 1.5, fGrilleTopR.y, 4.5, fBumperR.y - fGrilleTopR.y);
        ctx.restore();
      }
    }

    // 7. Draw Rear Fascia & Ruby OLED Tail Blades (when facing rear)
    if (isRearFacing) {
      drawPolygon([rTrunkBaseL, rTrunkBaseR, rBumperR, rBumperL], "#080a10", "rgba(239, 68, 68, 0.5)");

      if (headlightsOn) {
        ctx.save();
        ctx.fillStyle = "#ef4444";
        ctx.shadowColor = "#dc2626";
        ctx.shadowBlur = 16;
        // Dual vertical tail blades
        ctx.fillRect(rTrunkBaseL.x - 3, rRoofRearL.y + 10, 4, rBumperL.y - rRoofRearL.y - 10);
        ctx.fillRect(rTrunkBaseR.x - 1, rRoofRearR.y + 10, 4, rBumperR.y - rRoofRearR.y - 10);
        ctx.restore();
      }
    }

    // 8. Draw 4 3D Detailed Multi-Spoke Alloy Wheels
    const wheelRadius = isSUV ? 24 : isSedan ? 19 : 26;
    const wheelPositions = [
      { x: -carWidth * 0.48, z: carLength * 0.32 }, // Front Left
      { x: carWidth * 0.48, z: carLength * 0.32 },  // Front Right
      { x: -carWidth * 0.48, z: -carLength * 0.32 }, // Rear Left
      { x: carWidth * 0.48, z: -carLength * 0.32 },  // Rear Right
    ];

    wheelPositions.forEach((wp) => {
      const pWheel = project(wp.x, wheelRadius, wp.z);
      ctx.save();
      // Outer Tire
      ctx.beginPath();
      ctx.ellipse(pWheel.x, pWheel.y, wheelRadius * pWheel.scale * 0.45, wheelRadius * pWheel.scale, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#0d0f14";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#272e3d";
      ctx.stroke();

      // Inner Alloy Rim (12-Spoke Dark Polish)
      ctx.beginPath();
      ctx.ellipse(pWheel.x, pWheel.y, wheelRadius * pWheel.scale * 0.3, wheelRadius * pWheel.scale * 0.7, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#1e2430";
      ctx.fill();
      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Gold Brake Caliper
      ctx.fillStyle = "#d4af37";
      ctx.fillRect(pWheel.x - 2, pWheel.y - 6, 3, 7);
      ctx.restore();
    });

  }, [angle, selectedFinish, headlightsOn, vehicle.classId]);

  const currentAngleDeg = Math.round(angle);

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

      {/* 3D Interactive Luxury Car Canvas Stage */}
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

        {/* Orbiting 3D Hotspot Overlays */}
        {vehicle.hotspots.map((hotspot, idx) => {
          const deltaDeg = (idx * 90 - angle + 360) % 360;
          const isVisible = deltaDeg < 80 || deltaDeg > 280;
          const rad = (deltaDeg * Math.PI) / 180;
          const xOffset = Math.sin(rad) * 40;
          const depthScale = Math.cos(rad) * 0.3 + 0.7;

          if (!isVisible) return null;

          return (
            <div
              key={idx}
              style={{
                left: `${50 + xOffset}%`,
                top: `${42 + (idx % 2 === 0 ? -5 : 8)}%`,
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
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-[#05070c]/85 backdrop-blur-md border border-neutral-800 text-[10px] font-mono text-neutral-400 flex items-center gap-2 pointer-events-none opacity-80">
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
