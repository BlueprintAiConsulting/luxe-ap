"use client";

import { useEffect, useState, useRef } from "react";
import { Navigation, Car, MapPin, Clock, ShieldCheck } from "lucide-react";

interface LiveTripMapProps {
  pickup: { lat?: number; lng?: number; line1?: string | null; formatted?: string | null };
  dropoff?: { lat?: number; lng?: number; line1?: string | null; formatted?: string | null } | null;
  driverName?: string;
  vehicleDescription?: string;
  driverPhotoUrl?: string | null;
  status?: string;
  className?: string;
}

export default function LiveTripMap({
  pickup,
  dropoff,
  driverName = "Marcus Bennett",
  vehicleDescription = "Mercedes-Benz S-Class",
  driverPhotoUrl,
  status = "en_route",
  className = "",
}: LiveTripMapProps) {
  const [progress, setProgress] = useState(0.25); // 0 to 1 along the trip path
  const [etaMinutes, setEtaMinutes] = useState(8);
  const [distanceMiles, setDistanceMiles] = useState(2.4);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Smoothly move the chauffeur vehicle marker along the route for dynamic live feel
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 0.005;
        if (next >= 0.95) return 0.95;
        
        // Dynamically compute remaining ETA and distance
        const remainingFactor = 1 - next;
        setEtaMinutes(Math.max(1, Math.round(remainingFactor * 18)));
        setDistanceMiles(Number((remainingFactor * 5.2).toFixed(1)));
        
        return next;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // Draw smooth dark-mode vector map on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    const height = (canvas.height = 340);

    // Dark luxe map background
    ctx.fillStyle = "#121212";
    ctx.fillRect(0, 0, width, height);

    // Subtle grid lines (streets)
    ctx.strokeStyle = "#222222";
    ctx.lineWidth = 1.5;

    // Grid pattern
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Main arterial road curve
    const p1 = { x: width * 0.15, y: height * 0.75 }; // Pickup
    const p2 = { x: width * 0.5, y: height * 0.25 };  // Curve point
    const p3 = { x: width * 0.85, y: height * 0.65 }; // Dropoff / Destination

    // Draw route path line (faint gold background)
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(p2.x, p2.y, p3.x, p3.y);
    ctx.strokeStyle = "rgba(212, 175, 55, 0.25)";
    ctx.lineWidth = 8;
    ctx.stroke();

    // Draw active route path (bright gold)
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(p2.x, p2.y, p3.x, p3.y);
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Compute current vehicle position along quadratic bezier curve
    const t = progress;
    const currentX = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * p2.x + t * t * p3.x;
    const currentY = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * p2.y + t * t * p3.y;

    // Draw Pickup Marker (Gold Dot)
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw Dropoff Marker (Dark Gold Pin)
    ctx.beginPath();
    ctx.arc(p3.x, p3.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#D4AF37";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Vehicle Position Pulsing Halo
    ctx.beginPath();
    ctx.arc(currentX, currentY, 18, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(212, 175, 55, 0.25)";
    ctx.fill();

    // Draw Vehicle Position Inner Badge
    ctx.beginPath();
    ctx.arc(currentX, currentY, 10, 0, Math.PI * 2);
    ctx.fillStyle = "#000000";
    ctx.fill();
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 2;
    ctx.stroke();

  }, [progress]);

  const statusDisplay: Record<string, { label: string; bg: string }> = {
    assigned: { label: "Driver Dispatched", bg: "bg-neutral-800 text-white" },
    en_route: { label: "En Route to Pickup", bg: "bg-amber-500 text-black font-bold" },
    arrived: { label: "Arrived Curbside", bg: "bg-emerald-600 text-white font-bold" },
    onboard: { label: "Passenger Onboard", bg: "bg-neutral-900 text-white font-bold border border-accent/40" },
    completed: { label: "Trip Completed", bg: "bg-neutral-700 text-white" },
  };

  const currentStatus = statusDisplay[status] || { label: status.toUpperCase(), bg: "bg-neutral-800 text-white" };

  return (
    <div className={`relative rounded-3xl overflow-hidden shadow-2xl border border-neutral-800 bg-neutral-950 text-white ${className}`}>
      
      {/* Canvas Map Viewport */}
      <div className="relative w-full h-[320px] bg-neutral-900 overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Floating Top Bar overlay */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
          <div className={`px-3.5 py-1.5 rounded-full text-xs shadow-lg backdrop-blur-md ${currentStatus.bg}`}>
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-accent animate-ping mr-2"></span>
              {currentStatus.label}
            </span>
          </div>

          <div className="bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-xs font-bold text-accent flex items-center shadow-lg">
            <Clock size={14} className="mr-1.5" />
            ETA {etaMinutes} MINS ({distanceMiles} mi)
          </div>
        </div>

        {/* Pickup / Dropoff Labels Overlay */}
        <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-xs max-w-[240px]">
          <div className="flex items-center text-neutral-400 font-semibold text-[10px] uppercase mb-0.5">
            <MapPin size={12} className="mr-1 text-accent" /> Pickup Point
          </div>
          <div className="font-bold text-white truncate">{pickup.line1 || pickup.formatted || "Pickup Location"}</div>
        </div>

        {dropoff && (
          <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-xs max-w-[240px] text-right">
            <div className="flex items-center justify-end text-neutral-400 font-semibold text-[10px] uppercase mb-0.5">
              <Navigation size={12} className="mr-1 text-accent" /> Dropoff
            </div>
            <div className="font-bold text-white truncate">{dropoff.line1 || dropoff.formatted || "Destination"}</div>
          </div>
        )}
      </div>

      {/* Driver & Vehicle Info Footer Bar */}
      <div className="p-4 bg-neutral-900/90 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-neutral-800 border border-accent/40 flex items-center justify-center overflow-hidden shrink-0">
            {driverPhotoUrl ? (
              <img src={driverPhotoUrl} alt={driverName} className="w-full h-full object-cover" />
            ) : (
              <Car size={24} className="text-accent" />
            )}
          </div>
          <div>
            <div className="font-bold text-sm text-white flex items-center">
              {driverName}
              <ShieldCheck size={15} className="ml-1.5 text-accent" />
            </div>
            <div className="text-xs text-neutral-400">{vehicleDescription}</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href="tel:+15550202020"
            className="px-4 py-2 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/40 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center"
          >
            Call Driver
          </a>
        </div>
      </div>

    </div>
  );
}
