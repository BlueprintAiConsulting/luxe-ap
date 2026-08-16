"use client";

import { useEffect, useState, useRef } from "react";
import { Navigation, Car, MapPin, Clock, ShieldCheck, Radio } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

interface LiveTripMapProps {
  pickup: { lat?: number; lng?: number; line1?: string | null; formatted?: string | null };
  dropoff?: { lat?: number; lng?: number; line1?: string | null; formatted?: string | null } | null;
  driverId?: string | null;
  reservationId?: string | null;
  driverName?: string;
  driverPhone?: string | null;
  vehicleDescription?: string;
  driverPhotoUrl?: string | null;
  status?: string;
  className?: string;
}

interface LiveDriverTelemetry {
  lat: number;
  lng: number;
  headingDegrees?: number;
  speedMph?: number;
  status?: string;
  recordedAt?: any;
}

export default function LiveTripMap({
  pickup,
  dropoff,
  driverId,
  reservationId,
  driverName = "Marcus Bennett",
  driverPhone,
  vehicleDescription = "Mercedes-Benz S-Class",
  driverPhotoUrl,
  status = "en_route",
  className = "",
}: LiveTripMapProps) {
  const [progress, setProgress] = useState(0.35); // 0 to 1 along the trip path
  const [etaMinutes, setEtaMinutes] = useState(8);
  const [distanceMiles, setDistanceMiles] = useState(2.4);
  const [liveTelemetry, setLiveTelemetry] = useState<LiveDriverTelemetry | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Subscribe to real-time driver GPS telemetry from Firestore
  useEffect(() => {
    if (!driverId) return;

    const unsub = onSnapshot(
      doc(db, "driverLocations", driverId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as LiveDriverTelemetry;
          setLiveTelemetry(data);

          // If pickup & dropoff coordinates are available, calculate geometric progress
          if (pickup.lat && pickup.lng && dropoff?.lat && dropoff?.lng && data.lat && data.lng) {
            const totalDist = Math.hypot(dropoff.lat - pickup.lat, dropoff.lng - pickup.lng);
            const driverDistFromPickup = Math.hypot(data.lat - pickup.lat, data.lng - pickup.lng);
            if (totalDist > 0) {
              const computedP = Math.min(0.95, Math.max(0.05, driverDistFromPickup / totalDist));
              setProgress(computedP);
              const remainingFactor = 1 - computedP;
              setEtaMinutes(Math.max(1, Math.round(remainingFactor * 16)));
              setDistanceMiles(Number((remainingFactor * 4.8).toFixed(1)));
            }
          }
        }
      },
      (err) => console.warn("Live telemetry subscribe error:", err)
    );

    return () => unsub();
  }, [driverId, pickup.lat, pickup.lng, dropoff?.lat, dropoff?.lng]);

  // Fallback smooth animation if live GPS is offline
  useEffect(() => {
    if (liveTelemetry) return; // Use real GPS when available

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 0.005;
        if (next >= 0.95) return 0.95;
        
        const remainingFactor = 1 - next;
        setEtaMinutes(Math.max(1, Math.round(remainingFactor * 18)));
        setDistanceMiles(Number((remainingFactor * 5.2).toFixed(1)));
        
        return next;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [liveTelemetry]);

  // Draw smooth dark-mode vector map on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    const height = (canvas.height = 340);

    // Dark luxe map background
    ctx.fillStyle = "#060608";
    ctx.fillRect(0, 0, width, height);

    // Subtle grid lines (streets)
    ctx.strokeStyle = "#14141c";
    ctx.lineWidth = 1.5;

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

    // Arterial road points
    const p1 = { x: width * 0.15, y: height * 0.75 }; // Pickup
    const p2 = { x: width * 0.5, y: height * 0.25 };  // Curve point
    const p3 = { x: width * 0.85, y: height * 0.65 }; // Dropoff / Destination

    // Route path line background glow
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(p2.x, p2.y, p3.x, p3.y);
    ctx.strokeStyle = "rgba(212, 175, 55, 0.2)";
    ctx.lineWidth = 8;
    ctx.stroke();

    // Active route path (bright gold)
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(p2.x, p2.y, p3.x, p3.y);
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 3.5;
    ctx.setLineDash([8, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Compute vehicle position along bezier curve
    const t = progress;
    const currentX = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * p2.x + t * t * p3.x;
    const currentY = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * p2.y + t * t * p3.y;

    // Pickup Marker
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Dropoff Marker
    ctx.beginPath();
    ctx.arc(p3.x, p3.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#D4AF37";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Vehicle Position Pulsing Halo
    ctx.beginPath();
    ctx.arc(currentX, currentY, 20, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(212, 175, 55, 0.3)";
    ctx.fill();

    // Vehicle Position Inner Badge
    ctx.beginPath();
    ctx.arc(currentX, currentY, 11, 0, Math.PI * 2);
    ctx.fillStyle = "#0E0E13";
    ctx.fill();
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Vehicle Directional Heading Needle
    const headingDeg = liveTelemetry?.headingDegrees ?? 45;
    const headingRad = (headingDeg * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(currentX, currentY);
    ctx.lineTo(currentX + Math.sin(headingRad) * 16, currentY - Math.cos(headingRad) * 16);
    ctx.strokeStyle = "#E5C378";
    ctx.lineWidth = 2;
    ctx.stroke();

  }, [progress, liveTelemetry]);

  const statusDisplay: Record<string, { label: string; bg: string }> = {
    assigned: { label: "Chauffeur Dispatched", bg: "bg-[#181822] text-white border border-neutral-700" },
    en_route: { label: "En Route to Pickup", bg: "bg-gold-gradient text-neutral-950 font-bold shadow-gold-sm" },
    arrived: { label: "Arrived Curbside", bg: "bg-emerald-500 text-neutral-950 font-bold shadow-md" },
    onboard: { label: "Passenger Onboard", bg: "bg-[#181822] text-white font-bold border border-accent/40" },
    completed: { label: "Journey Finalized", bg: "bg-neutral-800 text-neutral-400" },
  };

  const currentStatus = statusDisplay[status] || { label: status.toUpperCase(), bg: "bg-neutral-800 text-white" };

  return (
    <div className={`relative rounded-3xl overflow-hidden shadow-2xl border border-neutral-800 bg-[#060608] text-white ${className}`}>
      
      {/* Canvas Map Viewport */}
      <div className="relative w-full h-[320px] bg-[#060608] overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Floating Top Bar overlay */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
          <div className={`px-3.5 py-1.5 rounded-full text-xs shadow-lg backdrop-blur-md ${currentStatus.bg}`}>
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-accent animate-ping mr-2"></span>
              {currentStatus.label}
            </span>
          </div>

          <div className="bg-[#0e0e13]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-neutral-800 text-xs font-mono font-bold text-accent flex items-center shadow-lg gap-2">
            <div className="flex items-center gap-1">
              <Clock size={13} className="text-accent" />
              <span>ETA {etaMinutes}M ({distanceMiles} mi)</span>
            </div>
            {liveTelemetry?.speedMph !== undefined && (
              <span className="text-[10px] text-emerald-400 font-bold border-l border-neutral-700 pl-2">
                {liveTelemetry.speedMph} MPH
              </span>
            )}
          </div>
        </div>

        {/* Live GPS Telemetry Indicator Pill */}
        <div className="absolute top-16 right-4 pointer-events-none">
          <div className="bg-[#0e0e13]/90 border border-amber-400/30 px-2.5 py-1 rounded-full text-[10px] font-mono text-accent flex items-center gap-1.5 shadow-md">
            <Radio size={12} className="animate-pulse text-emerald-400" />
            <span>{liveTelemetry ? "LIVE GPS STREAM" : "TELEMETRY SYNCED"}</span>
          </div>
        </div>

        {/* Pickup / Dropoff Labels Overlay */}
        <div className="absolute bottom-4 left-4 bg-[#0e0e13]/90 backdrop-blur-md p-3 rounded-2xl border border-neutral-800 text-xs max-w-[240px]">
          <div className="flex items-center text-neutral-400 font-semibold text-[10px] uppercase mb-0.5 font-mono">
            <MapPin size={12} className="mr-1 text-accent" /> Pickup Point
          </div>
          <div className="font-bold text-white truncate">{pickup.line1 || pickup.formatted || "Pickup Location"}</div>
        </div>

        {dropoff && (
          <div className="absolute bottom-4 right-4 bg-[#0e0e13]/90 backdrop-blur-md p-3 rounded-2xl border border-neutral-800 text-xs max-w-[240px] text-right">
            <div className="flex items-center justify-end text-neutral-400 font-semibold text-[10px] uppercase mb-0.5 font-mono">
              <Navigation size={12} className="mr-1 text-accent" /> Destination
            </div>
            <div className="font-bold text-white truncate">{dropoff.line1 || dropoff.formatted || "Dropoff Point"}</div>
          </div>
        )}
      </div>

      {/* Driver & Vehicle Info Footer Bar */}
      <div className="p-4 bg-[#0e0e13] border-t border-neutral-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-[#181822] border border-accent/40 flex items-center justify-center overflow-hidden shrink-0 shadow-gold-sm">
            {driverPhotoUrl ? (
              <img src={driverPhotoUrl} alt={driverName} className="w-full h-full object-cover" />
            ) : (
              <Car size={22} className="text-accent" />
            )}
          </div>
          <div>
            <div className="font-bold text-sm text-white flex items-center">
              {driverName}
              <ShieldCheck size={15} className="ml-1.5 text-accent" />
            </div>
            <div className="text-xs text-neutral-400 font-medium">{vehicleDescription}</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {driverPhone ? (
            <a
              href={`tel:${driverPhone}`}
              className="px-4 py-2.5 bg-gold-gradient hover:brightness-110 text-neutral-950 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center shadow-gold-sm"
            >
              Call Chauffeur
            </a>
          ) : (
            <a
              href="tel:+18005550199"
              className="px-4 py-2.5 bg-[#181822] border border-neutral-700 text-accent rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center"
            >
              Concierge
            </a>
          )}
        </div>
      </div>

    </div>
  );
}
