"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import { 
  Plane, 
  Car, 
  Navigation, 
  Compass, 
  Radio, 
  Activity, 
  ShieldCheck, 
  Crosshair, 
  Maximize2, 
  Layers, 
  Zap, 
  Globe, 
  MapPin, 
  Sliders, 
  Eye, 
  Clock, 
  User, 
  ArrowUpRight, 
  X,
  RefreshCw
} from "lucide-react";
import { Reservation } from "@/lib/types";

export interface RadarFlight {
  id: string;
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  altitude: number; // ft
  speedKnots: number;
  latitude: number;
  longitude: number;
  heading: number; // degrees
  progress: number; // 0 to 1 along flight path
  delayMinutes: number;
  scheduledTouchdown: string;
  estimatedTouchdown: string;
  passengerName?: string;
  reservationId?: string;
  terminal?: string;
  gate?: string;
  aircraftType: string;
}

export interface RadarVehicle {
  id: string;
  driverName: string;
  driverPhone?: string;
  vehicleModel: string;
  licensePlate: string;
  status: "en_route" | "arrived" | "onboard" | "holding";
  latitude: number;
  longitude: number;
  heading: number;
  speedMph: number;
  passengerName?: string;
  reservationId?: string;
  destinationLabel?: string;
  etaMinutes: number;
}

export interface AirspaceGroundRadarProps {
  reservations?: Reservation[];
  onSelectReservation?: (reservationId: string) => void;
}

// Center coordinates: Southern California / LAX Hub (can pan & zoom)
const MAP_BOUNDS = {
  minLat: 33.70,
  maxLat: 34.25,
  minLng: -118.65,
  maxLng: -118.10,
};

const AIRPORTS = [
  { code: "LAX", name: "Los Angeles Intl", lat: 33.9416, lng: -118.4085, runways: 4, type: "commercial" },
  { code: "BUR", name: "Hollywood Burbank", lat: 34.2007, lng: -118.3590, runways: 2, type: "commercial" },
  { code: "VNY", name: "Van Nuys Exec (FBO)", lat: 34.2098, lng: -118.4899, runways: 2, type: "private" },
  { code: "SNA", name: "John Wayne Orange Co", lat: 33.6762, lng: -117.8675, runways: 2, type: "commercial" },
];

export default function AirspaceGroundRadar({ 
  reservations = [], 
  onSelectReservation 
}: AirspaceGroundRadarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Viewport State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Layer Toggles
  const [showFlights, setShowFlights] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [showAirports, setShowAirports] = useState(true);
  const [showRadarSweep, setShowRadarSweep] = useState(true);
  const [activeSector, setActiveSector] = useState<"all" | "air" | "ground" | "vip">("all");

  // Selected telemetry item
  const [selectedItem, setSelectedItem] = useState<{
    type: "flight" | "vehicle";
    data: RadarFlight | RadarVehicle;
  } | null>(null);

  // Simulated live moving entities synced with real reservations
  const [flights, setFlights] = useState<RadarFlight[]>([
    {
      id: "fl-1",
      flightNumber: "DL 1492",
      airline: "Delta Air Lines",
      origin: "JFK (New York)",
      destination: "LAX",
      altitude: 12400,
      speedKnots: 340,
      latitude: 34.12,
      longitude: -118.15,
      heading: 245,
      progress: 0.82,
      delayMinutes: 18,
      scheduledTouchdown: "6:15 PM",
      estimatedTouchdown: "6:33 PM",
      passengerName: "Alexandra Chen",
      terminal: "Terminal 2",
      gate: "Gate 24B",
      aircraftType: "Airbus A350-900",
    },
    {
      id: "fl-2",
      flightNumber: "AA 231",
      airline: "American Airlines",
      origin: "MIA (Miami)",
      destination: "LAX",
      altitude: 6800,
      speedKnots: 260,
      latitude: 33.86,
      longitude: -118.28,
      heading: 290,
      progress: 0.94,
      delayMinutes: 0,
      scheduledTouchdown: "6:40 PM",
      estimatedTouchdown: "6:40 PM",
      passengerName: "Lord Sterling",
      terminal: "Terminal 4",
      gate: "Gate 42",
      aircraftType: "Boeing 787-9 Dreamliner",
    },
    {
      id: "fl-3",
      flightNumber: "LX-901",
      airline: "NetJets Executive",
      origin: "ASE (Aspen)",
      destination: "VNY",
      altitude: 4200,
      speedKnots: 210,
      latitude: 34.23,
      longitude: -118.42,
      heading: 195,
      progress: 0.96,
      delayMinutes: 0,
      scheduledTouchdown: "6:55 PM",
      estimatedTouchdown: "6:55 PM",
      passengerName: "Elena Rostova",
      terminal: "Signature Flight Support",
      gate: "FBO Hangar 3",
      aircraftType: "Bombardier Global 7500",
    },
    {
      id: "fl-4",
      flightNumber: "UA 884",
      airline: "United Airlines",
      origin: "ORD (Chicago)",
      destination: "BUR",
      altitude: 18500,
      speedKnots: 410,
      latitude: 34.18,
      longitude: -118.05,
      heading: 260,
      progress: 0.71,
      delayMinutes: 35,
      scheduledTouchdown: "7:10 PM",
      estimatedTouchdown: "7:45 PM",
      passengerName: "Harrison Croft",
      terminal: "Terminal A",
      gate: "Gate A3",
      aircraftType: "Boeing 737 MAX 9",
    }
  ]);

  const [vehicles, setVehicles] = useState<RadarVehicle[]>([
    {
      id: "veh-1",
      driverName: "Marcus Bennett",
      driverPhone: "(310) 555-8921",
      vehicleModel: "Mercedes-Benz S580 Executive",
      licensePlate: "LUXE-77",
      status: "en_route",
      latitude: 33.98,
      longitude: -118.44,
      heading: 140,
      speedMph: 48,
      passengerName: "Alexandra Chen",
      destinationLabel: "LAX Terminal 2 Curbside",
      etaMinutes: 8,
    },
    {
      id: "veh-2",
      driverName: "Antoine Dubois",
      driverPhone: "(310) 555-4412",
      vehicleModel: "Cadillac Escalade ESV V-Series",
      licensePlate: "VIP-992",
      status: "holding",
      latitude: 33.946,
      longitude: -118.398,
      heading: 0,
      speedMph: 0,
      passengerName: "Lord Sterling",
      destinationLabel: "LAX T4 Limo Holding Zone",
      etaMinutes: 2,
    },
    {
      id: "veh-3",
      driverName: "Sophia Rossi",
      driverPhone: "(310) 555-3390",
      vehicleModel: "Mercedes-Maybach S680",
      licensePlate: "ROYAL-01",
      status: "arrived",
      latitude: 34.209,
      longitude: -118.487,
      heading: 90,
      speedMph: 5,
      passengerName: "Elena Rostova",
      destinationLabel: "Van Nuys FBO Tarmac",
      etaMinutes: 0,
    },
    {
      id: "veh-4",
      driverName: "David Vance",
      driverPhone: "(310) 555-1102",
      vehicleModel: "BMW 760i xDrive",
      licensePlate: "PREST-44",
      status: "onboard",
      latitude: 34.07,
      longitude: -118.39,
      heading: 290,
      speedMph: 35,
      passengerName: "Sir Julian Vance",
      destinationLabel: "The Beverly Hills Hotel",
      etaMinutes: 14,
    }
  ]);

  // Radar sweep angle
  const sweepAngleRef = useRef(0);

  // Projection math: Lat/Lng -> Canvas X/Y
  const latLngToCanvas = (lat: number, lng: number, width: number, height: number) => {
    const xRatio = (lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng);
    const yRatio = (MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);

    const cx = width / 2;
    const cy = height / 2;

    const baseWidth = width * 0.85;
    const baseHeight = height * 0.85;

    const rawX = (width - baseWidth) / 2 + xRatio * baseWidth;
    const rawY = (height - baseHeight) / 2 + yRatio * baseHeight;

    const x = cx + (rawX - cx) * zoom + pan.x;
    const y = cy + (rawY - cy) * zoom + pan.y;

    return { x, y };
  };

  // Main Canvas Render Loop
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      // 1. Clear & Background Grid
      ctx.fillStyle = "#05070c";
      ctx.fillRect(0, 0, width, height);

      // Radar Range Rings from LAX Hub
      const lax = AIRPORTS[0];
      const laxPos = latLngToCanvas(lax.lat, lax.lng, width, height);

      // Draw subtle grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      const gridSize = 60 * zoom;
      for (let x = (pan.x % gridSize); x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = (pan.y % gridSize); y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Range concentric circles around LAX
      [100, 220, 360, 520].forEach((radius, idx) => {
        const r = radius * zoom;
        ctx.beginPath();
        ctx.arc(laxPos.x, laxPos.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(197, 160, 89, 0.08)";
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label ring range
        ctx.fillStyle = "rgba(197, 160, 89, 0.25)";
        ctx.font = "9px monospace";
        ctx.fillText(`${(idx + 1) * 10} NM RANGE`, laxPos.x + 8, laxPos.y - r + 12);
      });

      // 2. Animated Sonar / Radar Sweep Beam
      if (showRadarSweep) {
        sweepAngleRef.current = (sweepAngleRef.current + 0.015) % (Math.PI * 2);
        const currentAngle = sweepAngleRef.current;
        const sweepRadius = 600 * zoom;

        const gradient = ctx.createRadialGradient(
          laxPos.x, laxPos.y, 0,
          laxPos.x, laxPos.y, sweepRadius
        );
        gradient.addColorStop(0, "rgba(56, 189, 248, 0.15)");
        gradient.addColorStop(1, "rgba(56, 189, 248, 0.0)");

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(laxPos.x, laxPos.y);
        ctx.arc(laxPos.x, laxPos.y, sweepRadius, currentAngle - 0.35, currentAngle);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Leading beam line
        ctx.beginPath();
        ctx.moveTo(laxPos.x, laxPos.y);
        ctx.lineTo(
          laxPos.x + Math.cos(currentAngle) * sweepRadius,
          laxPos.y + Math.sin(currentAngle) * sweepRadius
        );
        ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // 3. Draw Airports
      if (showAirports) {
        AIRPORTS.forEach((airport) => {
          const pos = latLngToCanvas(airport.lat, airport.lng, width, height);

          // Airport Glow Zone
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 14 * zoom, 0, Math.PI * 2);
          ctx.fillStyle = airport.type === "private" ? "rgba(168, 85, 247, 0.12)" : "rgba(197, 160, 89, 0.12)";
          ctx.fill();
          ctx.strokeStyle = airport.type === "private" ? "rgba(168, 85, 247, 0.5)" : "rgba(197, 160, 89, 0.6)";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Center Airport Icon
          ctx.fillStyle = airport.type === "private" ? "#c084fc" : "#eab308";
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 3 * zoom, 0, Math.PI * 2);
          ctx.fill();

          // Airport Label Tag
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 11px system-ui, sans-serif";
          ctx.fillText(`AIRPORT: ${airport.code}`, pos.x + 18, pos.y - 4);
          ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
          ctx.font = "9px system-ui, sans-serif";
          ctx.fillText(airport.name, pos.x + 18, pos.y + 8);
        });
      }

      // 4. Draw Flight Trajectories & Inbound Aircraft
      if (showFlights && (activeSector === "all" || activeSector === "air" || activeSector === "vip")) {
        flights.forEach((flight) => {
          const targetAirport = AIRPORTS.find(a => a.code === flight.destination) || AIRPORTS[0];
          const airportPos = latLngToCanvas(targetAirport.lat, targetAirport.lng, width, height);
          const planePos = latLngToCanvas(flight.latitude, flight.longitude, width, height);

          // Inbound Trajectory Arc
          ctx.beginPath();
          ctx.moveTo(planePos.x, planePos.y);
          ctx.quadraticCurveTo(
            (planePos.x + airportPos.x) / 2 + 30,
            (planePos.y + airportPos.y) / 2 - 20,
            airportPos.x,
            airportPos.y
          );
          ctx.strokeStyle = flight.delayMinutes > 0 ? "rgba(245, 158, 11, 0.35)" : "rgba(56, 189, 248, 0.35)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Aircraft Radar Blip Pulse
          const pulseR = (Date.now() % 2000) / 100;
          ctx.beginPath();
          ctx.arc(planePos.x, planePos.y, 10 + pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = flight.delayMinutes > 0 ? "rgba(245, 158, 11, 0.2)" : "rgba(56, 189, 248, 0.2)";
          ctx.stroke();

          // Aircraft Blip Dot
          ctx.beginPath();
          ctx.arc(planePos.x, planePos.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = flight.delayMinutes > 0 ? "#f59e0b" : "#38bdf8";
          ctx.fill();

          // Direction Heading Indicator
          const headRad = ((flight.heading - 90) * Math.PI) / 180;
          ctx.beginPath();
          ctx.moveTo(planePos.x, planePos.y);
          ctx.lineTo(
            planePos.x + Math.cos(headRad) * 16,
            planePos.y + Math.sin(headRad) * 16
          );
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Holographic Telemetry Label
          ctx.fillStyle = "rgba(10, 15, 25, 0.85)";
          ctx.strokeStyle = "rgba(56, 189, 248, 0.3)";
          ctx.lineWidth = 1;
          const labelWidth = 135;
          const labelHeight = 44;
          const labelX = planePos.x + 12;
          const labelY = planePos.y - 22;

          ctx.beginPath();
          ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 8);
          ctx.fill();
          ctx.stroke();

          // Flight text
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 11px monospace";
          ctx.fillText(`✈ ${flight.flightNumber}`, labelX + 8, labelY + 14);

          ctx.fillStyle = flight.delayMinutes > 0 ? "#f59e0b" : "#38bdf8";
          ctx.font = "9px monospace";
          ctx.fillText(`ALT: ${flight.altitude}ft  ${flight.speedKnots}kt`, labelX + 8, labelY + 26);

          ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
          ctx.font = "9px system-ui";
          ctx.fillText(`ETA: ${flight.estimatedTouchdown} (${flight.destination})`, labelX + 8, labelY + 38);
        });
      }

      // 5. Draw Chauffeurs & Ground Fleet
      if (showVehicles && (activeSector === "all" || activeSector === "ground" || activeSector === "vip")) {
        vehicles.forEach((veh) => {
          const vehPos = latLngToCanvas(veh.latitude, veh.longitude, width, height);

          // Status Color Palette
          const statusColor = 
            veh.status === "onboard" ? "#10b981" :
            veh.status === "arrived" ? "#f59e0b" :
            veh.status === "holding" ? "#a855f7" : "#3b82f6";

          // Ground Pulse Ring
          ctx.beginPath();
          ctx.arc(vehPos.x, vehPos.y, 8, 0, Math.PI * 2);
          ctx.fillStyle = `${statusColor}33`;
          ctx.fill();
          ctx.strokeStyle = statusColor;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Ground Blip
          ctx.beginPath();
          ctx.arc(vehPos.x, vehPos.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = statusColor;
          ctx.fill();

          // Chauffeur HUD Tag
          ctx.fillStyle = "rgba(10, 15, 25, 0.85)";
          ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
          ctx.lineWidth = 1;
          const vLabelWidth = 140;
          const vLabelHeight = 40;
          const vLabelX = vehPos.x + 12;
          const vLabelY = vehPos.y - 20;

          ctx.beginPath();
          ctx.roundRect(vLabelX, vLabelY, vLabelWidth, vLabelHeight, 8);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 10px system-ui";
          ctx.fillText(veh.driverName, vLabelX + 8, vLabelY + 14);

          ctx.fillStyle = statusColor;
          ctx.font = "bold 8px monospace";
          ctx.fillText(veh.status.toUpperCase() + ` • ${veh.etaMinutes}m ETA`, vLabelX + 8, vLabelY + 25);

          ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
          ctx.font = "8px system-ui";
          ctx.fillText(veh.vehicleModel.split(" ")[0] + " " + veh.vehicleModel.split(" ")[1], vLabelX + 8, vLabelY + 34);
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [zoom, pan, showFlights, showVehicles, showAirports, showRadarSweep, activeSector, flights, vehicles]);

  // Handle Canvas Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;

      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Subtle flight animation drift
  useEffect(() => {
    const driftInterval = setInterval(() => {
      setFlights((prev) =>
        prev.map((f) => {
          // move slightly along heading
          const speedFactor = 0.0003;
          const rad = ((f.heading - 90) * Math.PI) / 180;
          return {
            ...f,
            latitude: f.latitude + Math.sin(rad) * speedFactor,
            longitude: f.longitude + Math.cos(rad) * speedFactor,
            altitude: Math.max(1200, f.altitude - 15),
          };
        })
      );
    }, 1000);
    return () => clearInterval(driftInterval);
  }, []);

  // Hit testing for clicks and hover
  const getEntityAtPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    // Check Flights
    if (showFlights && (activeSector === "all" || activeSector === "air" || activeSector === "vip")) {
      for (const flight of flights) {
        const planePos = latLngToCanvas(flight.latitude, flight.longitude, width, height);
        // Distance to plane blip or within label rect
        const dist = Math.hypot(planePos.x - x, planePos.y - y);
        const labelX = planePos.x + 12;
        const labelY = planePos.y - 22;
        const insideLabel = x >= labelX && x <= labelX + 135 && y >= labelY && y <= labelY + 44;
        if (dist <= 20 || insideLabel) {
          return { type: "flight" as const, data: flight };
        }
      }
    }

    // Check Vehicles
    if (showVehicles && (activeSector === "all" || activeSector === "ground" || activeSector === "vip")) {
      for (const veh of vehicles) {
        const vehPos = latLngToCanvas(veh.latitude, veh.longitude, width, height);
        const dist = Math.hypot(vehPos.x - x, vehPos.y - y);
        const vLabelX = vehPos.x + 12;
        const vLabelY = vehPos.y - 20;
        const insideLabel = x >= vLabelX && x <= vLabelX + 140 && y >= vLabelY && y <= vLabelY + 40;
        if (dist <= 20 || insideLabel) {
          return { type: "vehicle" as const, data: veh };
        }
      }
    }

    return null;
  };

  // Mouse Drag / Pan / Click interactions
  const [hasMoved, setHasMoved] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setHasMoved(false);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setHasMoved(true);
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    } else {
      // Check hover for cursor
      const entity = getEntityAtPoint(e.clientX, e.clientY);
      if (containerRef.current) {
        containerRef.current.style.cursor = entity ? "pointer" : "grab";
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsDragging(false);
    if (!hasMoved) {
      // It's a click!
      const entity = getEntityAtPoint(e.clientX, e.clientY);
      if (entity) {
        setSelectedItem(entity);
      }
    }
  };

  // Mobile / Tablet Touch Handlers
  const touchStartRef = useRef<{ x: number; y: number; dist?: number }>({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setHasMoved(false);
      touchStartRef.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current = { x: pan.x, y: pan.y, dist };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setHasMoved(true);
      setPan({
        x: e.touches[0].clientX - touchStartRef.current.x,
        y: e.touches[0].clientY - touchStartRef.current.y,
      });
    } else if (e.touches.length === 2 && touchStartRef.current.dist) {
      const newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = newDist / touchStartRef.current.dist;
      setZoom((prev) => Math.min(2.5, Math.max(0.6, prev * (factor > 1 ? 1.02 : 0.98))));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsDragging(false);
    if (!hasMoved && e.changedTouches.length === 1) {
      const entity = getEntityAtPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      if (entity) setSelectedItem(entity);
    }
  };

  return (
    <div className="relative w-full h-[680px] lg:h-[760px] bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col font-sans select-none">
      {/* Futuristic Radar Canvas */}
      <div 
        ref={containerRef} 
        className="relative flex-1 w-full h-full cursor-grab active:cursor-grabbing touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsDragging(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Top Futuristic Command HUD Bar */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left Telemetry Box */}
        <div className="pointer-events-auto bg-slate-950/80 backdrop-blur-md border border-slate-800/80 p-3 rounded-2xl flex items-center gap-4 shadow-xl">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Airspace & Ground Radar</div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>SOCAL SECTOR MATRIX</span> &bull; <span className="text-emerald-400">ONLINE</span>
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[9px] uppercase">Inbound Jets</span>
              <span className="text-sky-400 font-bold">{flights.length} Active</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase">Chauffeurs</span>
              <span className="text-emerald-400 font-bold">{vehicles.length} Deployed</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase">On-Time Index</span>
              <span className="text-accent font-bold">98.4%</span>
            </div>
          </div>
        </div>

        {/* Sector Filter Tabs */}
        <div className="pointer-events-auto bg-slate-950/80 backdrop-blur-md border border-slate-800/80 p-1 rounded-2xl flex gap-1 shadow-xl">
          {(["all", "air", "ground", "vip"] as const).map((sector) => (
            <button
              key={sector}
              type="button"
              onClick={() => setActiveSector(sector)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeSector === sector
                  ? "bg-accent text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              {sector === "all" ? "Full Matrix" : sector === "air" ? "Airspace" : sector === "ground" ? "Ground Fleet" : "VIP Only"}
            </button>
          ))}
        </div>

        {/* Layer Controls & Zoom */}
        <div className="pointer-events-auto bg-slate-950/80 backdrop-blur-md border border-slate-800/80 p-1.5 rounded-2xl flex items-center gap-1.5 shadow-xl">
          <button
            type="button"
            onClick={() => setShowFlights(!showFlights)}
            className={`p-2 rounded-xl transition-all ${showFlights ? "bg-sky-500/20 text-sky-400 border border-sky-500/30" : "text-slate-500 hover:text-slate-300"}`}
            title="Toggle Flights Layer"
          >
            <Plane size={16} />
          </button>
          <button
            type="button"
            onClick={() => setShowVehicles(!showVehicles)}
            className={`p-2 rounded-xl transition-all ${showVehicles ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-slate-500 hover:text-slate-300"}`}
            title="Toggle Vehicles Layer"
          >
            <Car size={16} />
          </button>
          <button
            type="button"
            onClick={() => setShowRadarSweep(!showRadarSweep)}
            className={`p-2 rounded-xl transition-all ${showRadarSweep ? "bg-accent/20 text-accent border border-accent/30" : "text-slate-500 hover:text-slate-300"}`}
            title="Toggle Radar Sweep"
          >
            <Radio size={16} />
          </button>

          <div className="h-5 w-px bg-slate-800 mx-0.5" />

          <button
            type="button"
            onClick={() => setZoom(prev => Math.min(2.5, prev + 0.2))}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom(prev => Math.max(0.6, prev - 0.2))}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold"
          >
            -
          </button>
          <button
            type="button"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
            title="Recenter Radar"
          >
            <Crosshair size={14} />
          </button>
        </div>
      </div>

      {/* Bottom Live Flight & Chauffeur Ticker Drawer */}
      <div className="absolute bottom-4 left-4 right-4 pointer-events-none flex gap-4">
        {/* Live Flights Feed Card */}
        <div className="pointer-events-auto flex-1 bg-slate-950/85 backdrop-blur-lg border border-slate-800/80 p-4 rounded-3xl shadow-2xl space-y-2.5 overflow-hidden">
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Plane size={14} className="text-sky-400" /> Active Inbounds & Passenger Touchdowns
            </span>
            <span className="text-[10px] text-slate-500 font-mono">LIVE RADAR TELEMETRY</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {flights.map((f) => (
              <div 
                key={f.id}
                onClick={() => setSelectedItem({ type: "flight", data: f })}
                className="bg-slate-900/90 hover:bg-slate-800/90 transition-all p-3 rounded-2xl border border-slate-800/80 cursor-pointer group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-xs text-white group-hover:text-sky-300 transition-colors">
                      {f.flightNumber}
                    </div>
                    <div className="text-[10px] text-slate-400">{f.passengerName || "VIP Passenger"}</div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                    f.delayMinutes > 0 
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30" 
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  }`}>
                    {f.delayMinutes > 0 ? `+${f.delayMinutes}m DELAY` : "ON TIME"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800/50">
                  <span>{f.origin.split(" ")[0]} &rarr; {f.destination}</span>
                  <span className="font-mono text-slate-200">ETA {f.estimatedTouchdown}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Item Telemetry Inspection Modal / Slide-out */}
      {selectedItem && (
        <div className="absolute inset-y-4 right-4 w-96 bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl z-50 flex flex-col justify-between animate-in slide-in-from-right duration-200">
          <div className="space-y-4">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <div className="text-[10px] font-bold text-accent uppercase tracking-widest">
                  {selectedItem.type === "flight" ? "Airspace Telemetry" : "Chauffeur Telemetry"}
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {selectedItem.type === "flight" 
                    ? (selectedItem.data as RadarFlight).flightNumber 
                    : (selectedItem.data as RadarVehicle).driverName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {selectedItem.type === "flight" ? (
              (() => {
                const f = selectedItem.data as RadarFlight;
                return (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800/80 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Airline</span>
                        <span className="font-bold text-white">{f.airline}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Aircraft</span>
                        <span className="font-mono text-slate-300">{f.aircraftType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">VIP Passenger</span>
                        <span className="font-bold text-accent">{f.passengerName}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800/80">
                        <div className="text-slate-500 text-[10px] uppercase font-bold">Altitude</div>
                        <div className="text-base font-bold font-mono text-sky-400">{f.altitude.toLocaleString()} FT</div>
                      </div>
                      <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800/80">
                        <div className="text-slate-500 text-[10px] uppercase font-bold">Groundspeed</div>
                        <div className="text-base font-bold font-mono text-emerald-400">{f.speedKnots} KTS</div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800/80 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Terminal / Gate</span>
                        <span className="font-bold text-white">{f.terminal || "TBD"} &bull; {f.gate || "TBD"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Scheduled Touchdown</span>
                        <span className="text-slate-300">{f.scheduledTouchdown}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Estimated Touchdown</span>
                        <span className={`font-bold ${f.delayMinutes > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                          {f.estimatedTouchdown} {f.delayMinutes > 0 && `(+${f.delayMinutes}m delay)`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              (() => {
                const v = selectedItem.data as RadarVehicle;
                return (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800/80 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Vehicle</span>
                        <span className="font-bold text-white">{v.vehicleModel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">License Plate</span>
                        <span className="font-mono text-accent">{v.licensePlate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Direct Phone</span>
                        <span className="font-semibold text-slate-300">{v.driverPhone}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800/80 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Assigned Passenger</span>
                        <span className="font-bold text-white">{v.passengerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Target Destination</span>
                        <span className="text-slate-300">{v.destinationLabel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Curbside ETA</span>
                        <span className="font-bold text-emerald-400">{v.etaMinutes} Minutes</span>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="w-full py-2.5 bg-accent text-slate-950 font-bold text-xs rounded-xl hover:bg-accent/90 transition-all"
            >
              Close Telemetry Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
