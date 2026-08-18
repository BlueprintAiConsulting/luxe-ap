"use client";

import { useAuth } from "@/lib/firebase/auth";
import { useEffect, useState, useMemo } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Reservation, ReservationStatus, PreferenceProfile } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { 
  ArrowLeft, 
  Phone, 
  MessageSquare, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  User, 
  Plane,
  ExternalLink,
  Shield,
  Loader2,
  Sparkles,
  AlertTriangle,
  Radio,
  Compass,
  Activity,
  CreditCard,
  Smartphone,
  Check
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { getFunctions as getFunctionsApp, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase/client";
import { useDriverLocationTracker } from "@/hooks/useDriverLocationTracker";
import ReservationChatDrawer from "@/components/ReservationChatDrawer";

type ChecklistItem = { id: string; label: string };

function generateChecklist(prefs: PreferenceProfile | null, specialInstructions?: string): ChecklistItem[] {
  const list: ChecklistItem[] = [];
  if (!prefs && !specialInstructions) return list;

  if (prefs?.beverage?.preference && prefs.beverage.preference !== "no_preference" && prefs.beverage.preference !== "none") {
    let label = prefs.beverage.preference.replace(/_/g, " ");
    if (prefs.beverage.brand) label += ` (${prefs.beverage.brand})`;
    if (prefs.beverage.temperature) label += ` - ${prefs.beverage.temperature}`;
    list.push({ id: "beverage", label: `Refreshment: ${label}` });
  }

  if (prefs?.conversation && prefs.conversation !== "no_preference") {
    list.push({ id: "conversation", label: `Etiquette: ${prefs.conversation.replace(/_/g, " ")}` });
  }

  if (prefs?.cabinTempF) {
    list.push({ id: "cabinTemp", label: `Climate: Preset to ${prefs.cabinTempF}°F` });
  }

  if (prefs?.audio?.mode && prefs.audio.mode !== "no_preference") {
    let label = prefs.audio.mode;
    if (prefs.audio.value) label += ` (${prefs.audio.value})`;
    list.push({ id: "audio", label: `Audio: ${label}` });
  }

  if (prefs?.greeting?.style && prefs.greeting.style !== "no_preference") {
    let label = prefs.greeting.style;
    if (prefs.greeting.nameSign) {
      label += ` (Name sign: ${prefs.greeting.signText || "Standard"})`;
    }
    list.push({ id: "greeting", label: `Greeting: ${label}` });
  }

  if (specialInstructions) {
    list.push({ id: "special", label: `Special: ${specialInstructions}` });
  }

  return list;
}

export default function TripDetailClient() {
  const { user, role } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tripId = params?.id as string;

  const [trip, setTrip] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Actuals Completion Form State
  const [actualTolls, setActualTolls] = useState<string>("0");
  const [actualParking, setActualParking] = useState<string>("0");
  const [actualWaitMinutes, setActualWaitMinutes] = useState<string>("0");
  const [driverNotes, setDriverNotes] = useState<string>("");
  const [showActualsModal, setShowActualsModal] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Square Terminal In-Vehicle State
  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [terminalAmount, setTerminalAmount] = useState("45.00");
  const [terminalReason, setTerminalReason] = useState<"extra_wait_time" | "hourly_extension" | "in_vehicle_tip" | "incidentals" | "additional_stops">("extra_wait_time");
  const [terminalStatus, setTerminalStatus] = useState<"idle" | "requesting" | "awaiting_card" | "completed" | "error">("idle");
  const [terminalCheckoutId, setTerminalCheckoutId] = useState<string | null>(null);
  const [terminalMsg, setTerminalMsg] = useState<string | null>(null);

  // Poll terminal status when awaiting card
  useEffect(() => {
    if (terminalStatus !== "awaiting_card" || !terminalCheckoutId || !trip) return;

    const interval = setInterval(async () => {
      try {
        const functions = getFunctionsApp(app);
        const checkStatusFn = httpsCallable(functions, "checkTerminalPaymentStatus");
        const res: any = await checkStatusFn({
          checkoutId: terminalCheckoutId,
          reservationId: trip.reservationId,
        });
        if (res.data?.status === "COMPLETED") {
          setTerminalStatus("completed");
          setTerminalMsg("Payment successful! Receipt attached to charter.");
        } else if (res.data?.status === "CANCELED") {
          setTerminalStatus("idle");
          setTerminalMsg("Terminal checkout was canceled.");
        }
      } catch (err: any) {
        console.warn("Error polling terminal status:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [terminalStatus, terminalCheckoutId, trip]);

  const handleRequestTerminal = async () => {
    if (!trip) return;
    setTerminalStatus("requesting");
    setTerminalMsg(null);
    try {
      const amountCents = Math.round(parseFloat(terminalAmount || "0") * 100);
      if (amountCents <= 0) {
        throw new Error("Please enter a valid payment amount.");
      }

      const functions = getFunctionsApp(app);
      const requestTerminalFn = httpsCallable(functions, "requestInVehicleTerminalPayment");
      const res: any = await requestTerminalFn({
        reservationId: trip.reservationId,
        amountCents,
        reason: terminalReason,
      });

      if (res.data?.success && res.data?.checkoutId) {
        setTerminalCheckoutId(res.data.checkoutId);
        setTerminalStatus("awaiting_card");
        setTerminalMsg("Prompt active. Hand Square Terminal to VIP.");
      } else {
        throw new Error(res.data?.message || "Failed to initialize terminal.");
      }
    } catch (err: any) {
      setTerminalStatus("error");
      setTerminalMsg(err.message || "Failed to push terminal payment prompt.");
    }
  };

  const handleCancelTerminal = async () => {
    if (!terminalCheckoutId || !trip) {
      setShowTerminalModal(false);
      return;
    }
    try {
      const functions = getFunctionsApp(app);
      const cancelFn = httpsCallable(functions, "cancelTerminalPayment");
      await cancelFn({
        checkoutId: terminalCheckoutId,
        reservationId: trip.reservationId,
      });
    } catch (e) {
      console.warn("Cancel terminal error:", e);
    } finally {
      setTerminalStatus("idle");
      setTerminalCheckoutId(null);
      setShowTerminalModal(false);
    }
  };

  // Live Driver GPS Telemetry Streamer
  const driverTracker = useDriverLocationTracker({
    driverId: user?.uid || trip?.driverId || null,
    driverName: user?.displayName || trip?.driverName || "Marcus Bennett",
    vehicleDescription: trip?.vehicleDescription || "Executive Livery",
    reservationId: trip?.reservationId || null,
    status: trip?.status || "confirmed",
    pickupCoords: trip?.pickup ? { lat: trip.pickup.lat, lng: trip.pickup.lng } : null,
    dropoffCoords: trip?.dropoff ? { lat: trip.dropoff.lat, lng: trip.dropoff.lng } : null,
    enabled: !!trip && trip.status !== "completed" && trip.status !== "cancelled",
  });

  useEffect(() => {
    if (!tripId) return;

    const unsub = onSnapshot(doc(db, "reservations", tripId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Reservation;
        setTrip(data);
        setActualTolls(((data.tollsCents || 0) / 100).toString());
        setActualParking(((data.parkingCents || 0) / 100).toString());
        setActualWaitMinutes((data.waitMinutes || 0).toString());
        setDriverNotes(data.driverNotes || "");
      } else {
        setTrip(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [tripId]);

  const checklist = useMemo(() => {
    return generateChecklist(trip?.preferences || null, trip?.specialInstructions);
  }, [trip?.preferences, trip?.specialInstructions]);

  const handleToggleChecklist = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStatusUpdate = async (newStatus: ReservationStatus) => {
    if (!trip) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const functions = getFunctionsApp(app);
      const updateStatusFn = httpsCallable(functions, "updateTripStatus");
      await updateStatusFn({
        reservationId: trip.reservationId,
        status: newStatus
      });
    } catch (err: any) {
      console.error("Status transition failed:", err);
      setErrorMsg(err.message || "Failed to update trip status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!trip) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const functions = getFunctionsApp(app);
      const updateStatusFn = httpsCallable(functions, "updateTripStatus");
      await updateStatusFn({
        reservationId: trip.reservationId,
        status: "completed",
        actuals: {
          tollsCents: Math.round(parseFloat(actualTolls || "0") * 100),
          parkingCents: Math.round(parseFloat(actualParking || "0") * 100),
          waitMinutes: parseInt(actualWaitMinutes || "0", 10),
          driverNotes: driverNotes || null,
        }
      });
      setShowActualsModal(false);
      router.push("/today");
    } catch (err: any) {
      console.error("Complete trip failed:", err);
      setErrorMsg(err.message || "Failed to complete trip.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050507] text-white">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
          <span className="text-sm font-medium tracking-wide text-neutral-400">Accessing Job HUD...</span>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="p-6 text-center text-white space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold">Charter Not Found</h2>
        <p className="text-neutral-400 text-sm">This reservation may have been reallocated or cancelled.</p>
        <button 
          onClick={() => router.push("/today")}
          className="px-6 py-2.5 bg-neutral-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
        >
          Return to Schedule
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-6 pb-36 font-sans text-white">
      
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.push("/today")}
          className="p-2 rounded-xl bg-[#0e0e13] border border-neutral-800 text-neutral-400 hover:text-white transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider min-h-[44px]"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <span className="text-xs font-mono text-neutral-500">#{trip.reservationId.slice(-6)}</span>
      </div>

      {/* Live GPS Telemetry Broadcaster HUD Card */}
      <div className="bg-[#0e0e13] border border-amber-400/25 rounded-3xl p-5 shadow-2xl space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
              <Radio size={14} className="animate-pulse" /> Live Telemetry Broadcasting
            </span>
          </div>

          <button
            type="button"
            onClick={driverTracker.toggleSimulation}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider border transition-all active:scale-95 min-h-[36px] flex items-center gap-1.5 ${
              driverTracker.isSimulating
                ? "bg-gold-gradient text-neutral-950 border-accent shadow-gold-sm"
                : "bg-[#181822] text-neutral-300 border-neutral-700 hover:border-accent"
            }`}
          >
            <Compass size={12} className={driverTracker.isSimulating ? "animate-spin" : ""} />
            <span>{driverTracker.isSimulating ? "Simulation Active" : "Simulate Drive"}</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-center">
          <div className="bg-[#060608] border border-neutral-800 rounded-2xl p-2.5">
            <div className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold">Speed</div>
            <div className="text-sm font-bold text-white mt-0.5">
              {driverTracker.currentCoords?.speedMph || 0} <span className="text-[10px] text-neutral-400">MPH</span>
            </div>
          </div>

          <div className="bg-[#060608] border border-neutral-800 rounded-2xl p-2.5">
            <div className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold">Bearing</div>
            <div className="text-sm font-bold text-accent mt-0.5">
              {driverTracker.currentCoords?.heading || 0}°
            </div>
          </div>

          <div className="bg-[#060608] border border-neutral-800 rounded-2xl p-2.5">
            <div className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold">Signal Ping</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">
              {driverTracker.lastPingAt ? "Active" : "Ready"}
            </div>
          </div>
        </div>

        {driverTracker.currentCoords && (
          <div className="text-[10px] font-mono text-neutral-400 flex items-center justify-between pt-1 border-t border-neutral-800/80">
            <span>GPS: {driverTracker.currentCoords.lat.toFixed(4)}°, {driverTracker.currentCoords.lng.toFixed(4)}°</span>
            <span className="text-emerald-400 font-bold">Accuracy: ±{driverTracker.currentCoords.accuracy}m</span>
          </div>
        )}

        {driverTracker.permissionError && (
          <div className="text-[10px] font-mono text-amber-300 bg-amber-950/40 border border-amber-800/60 p-2.5 rounded-xl">
            ⚠️ {driverTracker.permissionError}
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/60 text-rose-300 rounded-2xl text-xs font-mono">
          {errorMsg}
        </div>
      )}

      {/* Main Passenger Card */}
      <div className="bg-[#0e0e13] border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-accent font-bold">VIP Passenger</div>
            <h1 className="text-2xl font-bold font-serif text-white mt-0.5">{trip.riderName}</h1>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/30">
            {trip.status.replace(/_/g, " ")}
          </span>
        </div>

        {/* Communication Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {trip.riderPhone ? (
            <a 
              href={`tel:${trip.riderPhone}`}
              className="py-3 px-4 rounded-xl bg-[#181822] border border-neutral-700 hover:border-accent text-accent font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <Phone size={15} />
              <span>Call Client</span>
            </a>
          ) : (
            <button disabled className="py-3 px-4 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-600 font-bold text-xs flex items-center justify-center gap-2">
              <Phone size={15} />
              <span>No Phone</span>
            </button>
          )}

          {trip.riderPhone ? (
            <a 
              href={`sms:${trip.riderPhone}`}
              className="py-3 px-4 rounded-xl bg-[#181822] border border-neutral-700 hover:border-accent text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <MessageSquare size={15} />
              <span>Send SMS</span>
            </a>
          ) : (
            <button disabled className="py-3 px-4 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-600 font-bold text-xs flex items-center justify-center gap-2">
              <MessageSquare size={15} />
              <span>No SMS</span>
            </button>
          )}

          <button 
            type="button"
            onClick={() => setIsChatOpen(true)}
            className="col-span-2 py-3.5 px-4 rounded-xl bg-gold-gradient hover:brightness-110 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-gold-sm active:scale-95 uppercase tracking-wider min-h-[44px]"
          >
            <MessageSquare size={15} />
            <span>Open Live Concierge Chat</span>
          </button>

          {/* Square Terminal Charge Button */}
          {trip.status !== "completed" && trip.status !== "cancelled" && (
            <button 
              type="button"
              onClick={() => {
                setShowTerminalModal(true);
                setTerminalStatus("idle");
                setTerminalMsg(null);
              }}
              className="col-span-2 py-3 px-4 rounded-xl bg-[#121727] border border-accent/40 hover:bg-accent/15 text-accent font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-gold-sm active:scale-95 uppercase tracking-wider font-mono min-h-[44px]"
            >
              <CreditCard size={15} className="text-accent" />
              <span>Charge on In-Vehicle Square Terminal</span>
            </button>
          )}
        </div>
      </div>

      {/* Itinerary & Route Card */}
      <div className="bg-[#0e0e13] border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono uppercase tracking-widest text-neutral-400 font-bold">Journey Route</div>
          <div className="text-xs font-mono text-accent font-bold">{formatDateTime(trip.pickupAt, trip.timezone || "America/Los_Angeles")}</div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-7 h-7 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">Pickup Location</div>
              <div className="text-sm font-medium text-white break-words mt-0.5">{trip.pickup.formatted}</div>
              <a 
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(trip.pickup.formatted)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-mono font-bold mt-1.5"
              >
                <Navigation size={12} />
                <span>Launch GPS to Pickup</span>
              </a>
            </div>
          </div>

          {trip.dropoff && (
            <div className="flex items-start gap-3.5">
              <div className="w-7 h-7 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">Dropoff Destination</div>
                <div className="text-sm font-medium text-white break-words mt-0.5">{trip.dropoff.formatted}</div>
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(trip.dropoff.formatted)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-mono font-bold mt-1.5"
                >
                  <Navigation size={12} />
                  <span>Launch GPS to Dropoff</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {trip.flightNumber && (
          <div className="p-4 rounded-2xl bg-[#060608] border border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Plane size={18} className="text-accent" />
              <div>
                <div className="text-xs font-bold text-white font-mono">{trip.flightNumber}</div>
                <div className="text-[10px] text-neutral-400 uppercase">Inbound Flight Charter</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded-md">
              LIVE RADAR SYNCED
            </span>
          </div>
        )}
      </div>

      {/* Concierge Protocol Checklist */}
      {checklist.length > 0 && (
        <div className="bg-[#0e0e13] border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-accent" />
              <h3 className="font-bold text-sm font-serif text-white">Concierge Preparation Checklist</h3>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              {Object.values(checkedItems).filter(Boolean).length} / {checklist.length} Verified
            </span>
          </div>

          <div className="space-y-2.5">
            {checklist.map(item => {
              const checked = !!checkedItems[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleToggleChecklist(item.id)}
                  className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    checked 
                      ? "bg-emerald-950/30 border-emerald-800/60 text-neutral-300" 
                      : "bg-[#060608] border-neutral-800 text-white hover:border-neutral-700"
                  }`}
                >
                  <span className={`text-xs font-medium ${checked ? "line-through text-neutral-400" : ""}`}>
                    {item.label}
                  </span>
                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                    checked ? "bg-emerald-500 border-emerald-500 text-neutral-950" : "border-neutral-700 bg-[#181822]"
                  }`}>
                    {checked && <CheckCircle2 size={13} className="stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sticky Bottom Cockpit HUD Controls */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0e0e13]/95 backdrop-blur-2xl border-t border-neutral-800 p-4 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
        <div className="max-w-xl mx-auto space-y-2">
          {trip.status === "confirmed" && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => handleStatusUpdate("en_route")}
              className="w-full min-h-[44px] py-3.5 rounded-2xl bg-gold-gradient text-neutral-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 shadow-gold-sm disabled:opacity-50 active:scale-95 transition-all"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Start Journey — En Route"}
            </button>
          )}

          {trip.status === "en_route" && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => handleStatusUpdate("arrived")}
              className="w-full min-h-[44px] py-3.5 rounded-2xl bg-gold-gradient text-neutral-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 shadow-gold-sm disabled:opacity-50 active:scale-95 transition-all"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Arrived On Scene / Curbside"}
            </button>
          )}

          {trip.status === "arrived" && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => handleStatusUpdate("onboard")}
              className="w-full min-h-[44px] py-3.5 rounded-2xl bg-gold-gradient text-neutral-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 shadow-gold-sm disabled:opacity-50 active:scale-95 transition-all"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Passenger On Board"}
            </button>
          )}

          {trip.status === "onboard" && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setShowActualsModal(true)}
              className="w-full min-h-[44px] py-3.5 rounded-2xl bg-emerald-500 text-neutral-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-emerald-400 disabled:opacity-50 active:scale-95 transition-all shadow-md"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Complete Journey & Finalize"}
            </button>
          )}

          {trip.status === "completed" && (
            <div className="w-full py-3.5 rounded-2xl bg-[#060608] border border-neutral-800 text-neutral-400 font-mono text-center text-xs font-bold">
              ✓ Charter Completed & Finalized
            </div>
          )}
        </div>
      </div>

      {/* Actuals Finalization Modal */}
      {showActualsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e0e13] border border-neutral-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-xs font-mono">
            <h3 className="text-lg font-bold font-serif text-white">Finalize Journey Actuals</h3>
            <p className="text-[10px] text-neutral-400">Record toll expenses, parking, and excessive wait time for billing reconciliation.</p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Toll Charges ($)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={actualTolls} 
                  onChange={e => setActualTolls(e.target.value)} 
                  className="w-full bg-[#161c2e] border border-[#222c44] rounded-xl p-3 text-white text-base sm:text-xs outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Airport / Venue Parking ($)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={actualParking} 
                  onChange={e => setActualParking(e.target.value)} 
                  className="w-full bg-[#161c2e] border border-[#222c44] rounded-xl p-3 text-white text-base sm:text-xs outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Extra Waiting Minutes</label>
                <input 
                  type="number" 
                  value={actualWaitMinutes} 
                  onChange={e => setActualWaitMinutes(e.target.value)} 
                  className="w-full bg-[#161c2e] border border-[#222c44] rounded-xl p-3 text-white text-base sm:text-xs outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Chauffeur Closing Notes</label>
                <textarea 
                  value={driverNotes} 
                  onChange={e => setDriverNotes(e.target.value)} 
                  placeholder="Special events, luggage assistance, or routing details..."
                  className="w-full bg-[#161c2e] border border-[#222c44] rounded-xl p-3 text-white text-base sm:text-xs outline-none focus:border-accent h-20 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowActualsModal(false)}
                className="flex-1 min-h-[44px] border border-neutral-700 text-neutral-300 rounded-xl font-bold hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleComplete}
                className="flex-1 min-h-[44px] bg-gold-gradient text-neutral-950 rounded-xl font-bold uppercase tracking-wider hover:brightness-110 shadow-gold-sm flex items-center justify-center gap-1.5"
              >
                {actionLoading && <Loader2 size={14} className="animate-spin" />}
                Confirm & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Square Terminal In-Vehicle Checkout Modal */}
      {showTerminalModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#0e0e13] border border-neutral-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-xs font-mono">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="text-accent" size={18} />
                <h3 className="text-base font-bold font-serif text-white">In-Vehicle Square Terminal</h3>
              </div>
              <span className="text-[10px] uppercase font-bold text-accent px-2 py-0.5 bg-accent/15 border border-accent/30 rounded-full font-mono">
                PCI-DSS
              </span>
            </div>

            {terminalStatus === "idle" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Payment Reason</label>
                  <select
                    value={terminalReason}
                    onChange={e => setTerminalReason(e.target.value as any)}
                    className="w-full bg-[#161c2e] border border-[#222c44] rounded-xl p-3 text-white text-base sm:text-xs outline-none focus:border-accent"
                  >
                    <option value="extra_wait_time">Excess Wait Time</option>
                    <option value="hourly_extension">Charter Hourly Extension</option>
                    <option value="in_vehicle_tip">Additional Chauffeur Gratuity</option>
                    <option value="additional_stops">Unscheduled Additional Stop</option>
                    <option value="incidentals">Incidentals / Cleaning</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Amount to Charge ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={terminalAmount}
                    onChange={e => setTerminalAmount(e.target.value)}
                    className="w-full bg-[#161c2e] border border-[#222c44] rounded-xl p-3 text-white text-base sm:text-xs outline-none focus:border-accent font-bold text-lg font-mono text-accent"
                  />
                </div>

                {terminalMsg && (
                  <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-xl text-[11px]">
                    {terminalMsg}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTerminalModal(false)}
                    className="flex-1 min-h-[44px] border border-neutral-700 text-neutral-300 rounded-xl font-bold hover:bg-neutral-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestTerminal}
                    className="flex-1 min-h-[44px] bg-gold-gradient text-neutral-950 rounded-xl font-bold uppercase tracking-wider hover:brightness-110 shadow-gold-sm flex items-center justify-center gap-1.5"
                  >
                    <Smartphone size={15} />
                    <span>Push to Terminal</span>
                  </button>
                </div>
              </div>
            )}

            {terminalStatus === "requesting" && (
              <div className="py-8 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
                <div className="text-sm font-bold text-white font-serif">Connecting to Vehicle Reader...</div>
                <p className="text-[11px] text-slate-400 font-mono">Sending ${terminalAmount} prompt via Square Terminal API</p>
              </div>
            )}

            {terminalStatus === "awaiting_card" && (
              <div className="py-6 text-center space-y-4 bg-[#121727] p-5 rounded-2xl border border-accent/30">
                <div className="w-12 h-12 rounded-full bg-accent/15 border border-accent flex items-center justify-center mx-auto animate-pulse">
                  <CreditCard className="text-accent" size={24} />
                </div>
                <div>
                  <div className="text-base font-bold text-white font-serif">Terminal Prompt Live</div>
                  <div className="text-2xl font-bold font-mono text-accent mt-1">${terminalAmount}</div>
                  <p className="text-[11px] text-slate-400 mt-1">Please hand the Square Terminal to the VIP passenger for Chip / Apple Pay / Contactless Tap.</p>
                </div>
                <div className="text-[10px] text-emerald-400 font-bold animate-pulse flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Awaiting Card Dip / Tap...
                </div>
                <button
                  type="button"
                  onClick={handleCancelTerminal}
                  className="w-full py-2.5 bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-xl font-bold text-xs"
                >
                  Cancel Terminal Prompt
                </button>
              </div>
            )}

            {terminalStatus === "completed" && (
              <div className="py-6 text-center space-y-4 bg-emerald-950/40 p-5 rounded-2xl border border-emerald-800">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center mx-auto text-emerald-400">
                  <Check size={24} className="stroke-[3]" />
                </div>
                <div>
                  <div className="text-base font-bold text-white font-serif">Payment Captured</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">${terminalAmount}</div>
                  <p className="text-[11px] text-slate-300 mt-1">Authorized via Square Terminal and attached to charter ledger.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTerminalModal(false)}
                  className="w-full min-h-[44px] bg-emerald-500 text-neutral-950 rounded-xl font-bold uppercase tracking-wider hover:bg-emerald-400"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Concierge Chat Drawer */}
      {trip && (
        <ReservationChatDrawer
          reservationId={trip.reservationId}
          confirmationCode={trip.confirmationCode}
          currentUserId={user?.uid}
          currentUserName={user?.displayName || trip.driverName || "Executive Chauffeur"}
          currentUserRole="driver"
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}

    </div>
  );
}
