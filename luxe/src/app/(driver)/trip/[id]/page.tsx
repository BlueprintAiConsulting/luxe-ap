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
  AlertTriangle
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { getFunctions as getFunctionsApp, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase/client";

type ChecklistItem = { id: string; label: string };

function generateChecklist(prefs: PreferenceProfile | null): ChecklistItem[] {
  if (!prefs) return [];
  const list: ChecklistItem[] = [];

  if (prefs.beverage?.preference && prefs.beverage.preference !== "no_preference" && prefs.beverage.preference !== "none") {
    let label = prefs.beverage.preference.replace(/_/g, " ");
    if (prefs.beverage.brand) label += ` (${prefs.beverage.brand})`;
    if (prefs.beverage.temperature) label += ` - ${prefs.beverage.temperature}`;
    list.push({ id: "beverage", label: `Refreshment: ${label}` });
  }

  if (prefs.conversation && prefs.conversation !== "no_preference") {
    list.push({ id: "conversation", label: `Etiquette: ${prefs.conversation.replace(/_/g, " ")}` });
  }

  if (prefs.cabinTempF) {
    list.push({ id: "cabinTemp", label: `Climate: Preset to ${prefs.cabinTempF}°F` });
  }

  if (prefs.audio?.mode && prefs.audio.mode !== "no_preference") {
    let label = prefs.audio.mode;
    if (prefs.audio.value) label += ` (${prefs.audio.value})`;
    list.push({ id: "audio", label: `Audio: ${label}` });
  }

  if (prefs.greeting?.style && prefs.greeting.style !== "no_preference") {
    let label = prefs.greeting.style;
    if (prefs.greeting.nameSign) {
      label += ` (Name sign: ${prefs.greeting.signText || "Standard"})`;
    }
    list.push({ id: "greeting", label: `Greeting: ${label}` });
  }

  if (prefs.seating?.preferredSeat) {
    list.push({ id: "seating", label: `Seat: ${prefs.seating.preferredSeat.replace(/_/g, " ")}` });
  }

  return list;
}

export default function DriverTripDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tripId = params.id as string;
  
  const [trip, setTrip] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [waitMinutes, setWaitMinutes] = useState(0);
  const [tolls, setTolls] = useState(0);
  const [parking, setParking] = useState(0);
  const [notes, setNotes] = useState("");
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});

  const functions = getFunctionsApp(app);
  const updateTripStatus = httpsCallable(functions, "updateTripStatus");
  const updateTripChecklist = httpsCallable(functions, "updateTripChecklist");
  const completeTrip = httpsCallable(functions, "completeTrip");

  const isAirport = trip?.tripType === "airport_arrival" || trip?.tripType === "airport_departure";
  const graceMinutes = isAirport ? 45 : 15;
  const remainingGrace = Math.max(0, graceMinutes - waitMinutes);
  const billableWaitMinutes = Math.max(0, waitMinutes - graceMinutes);

  useEffect(() => {
    if (!user || !tripId) return;

    const unsubscribe = onSnapshot(doc(db, "reservations", tripId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Reservation;
        setTrip(data);
        setChecklistState((data as any).checklist || {});
        
        if (data.status === "arrived") {
          const arrTimestamp = data.arrivedAtTimestamp || data.updatedAt;
          if (arrTimestamp) {
            const arrTime = typeof (arrTimestamp as any)?.toDate === "function" 
              ? (arrTimestamp as any).toDate() 
              : new Date(arrTimestamp as any);
            const diffMs = Date.now() - arrTime.getTime();
            setWaitMinutes(Math.max(0, Math.floor(diffMs / 60000)));
          }
        }
      } else {
        setTrip(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, tripId]);

  useEffect(() => {
    if (trip?.status === "arrived") {
      const interval = setInterval(() => {
        setWaitMinutes(prev => prev + 1);
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [trip?.status]);

  const checklistItems = useMemo(() => generateChecklist(trip?.preferences || null), [trip?.preferences]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium tracking-wider uppercase text-neutral-400">Loading Job Details...</span>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 text-white p-6 text-center">
        <h2 className="text-xl font-bold font-serif mb-2">Trip Not Found</h2>
        <p className="text-xs text-neutral-400 mb-6">This reservation may have been reassigned or completed.</p>
        <button 
          onClick={() => router.push("/today")}
          className="px-6 py-3 bg-amber-400 text-neutral-950 rounded-xl font-bold text-xs"
        >
          Return to Today's Jobs
        </button>
      </div>
    );
  }

  const handleCheck = async (id: string, checked: boolean) => {
    setChecklistState(prev => ({ ...prev, [id]: checked }));
    try {
      await updateTripChecklist({ reservationId: trip.reservationId, key: id, checked });
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusUpdate = async (nextStatus: ReservationStatus) => {
    setActionLoading(true);
    setError(null);
    try {
      await updateTripStatus({ reservationId: trip.reservationId, status: nextStatus });
    } catch (e: any) {
      setError(e.message || "Failed to update trip status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await completeTrip({
        reservationId: trip.reservationId,
        waitMinutes,
        tollsCents: Math.round(tolls * 100),
        parkingCents: Math.round(parking * 100),
        driverNotes: notes || null,
      });
      router.push("/today");
    } catch (e: any) {
      setError(e.message || "Failed to complete trip");
      setActionLoading(false);
    }
  };

  const pTime = trip.pickupAt as any;
  const dateObj = typeof pTime?.toDate === "function" ? pTime.toDate() : new Date(pTime);

  const openNavigation = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(`https://maps.apple.com/?daddr=${encoded}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-40 pt-2 px-4 max-w-lg mx-auto selection:bg-amber-400 selection:text-neutral-950">
      
      {/* Sticky Top Bar */}
      <div className="py-3 bg-neutral-950/90 backdrop-blur-xl flex items-center justify-between sticky top-0 z-20 border-b border-neutral-800/80 mb-4">
        <button 
          onClick={() => router.push("/today")} 
          className="w-10 h-10 -ml-1 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white active:scale-95 transition-all"
          aria-label="Back to schedule"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="text-center">
          <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
            CONF #{trip.confirmationCode || trip.reservationId.slice(0, 7)}
          </div>
          <div className="text-xs font-bold text-white">
            {formatDateTime(dateObj, trip.timezone || "UTC")}
          </div>
        </div>

        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-400">
          {trip.status.replace(/_/g, " ")}
        </span>
      </div>

      {error && (
        <div className="mb-4 bg-red-950/60 border border-red-800 text-red-200 text-xs p-4 rounded-2xl flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        
        {/* Passenger Contact Card */}
        <div className="bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold text-lg">
                {trip.riderName?.charAt(0) || "P"}
              </div>
              <div>
                <div className="font-bold text-base text-white flex items-center gap-1.5">
                  {trip.riderName || "Executive Passenger"}
                  <span className="text-[9px] bg-accent/20 text-accent font-bold px-1.5 py-0.2 rounded font-mono uppercase">VIP</span>
                </div>
                <div className="text-xs text-neutral-400 flex items-center gap-2 mt-0.5">
                  <span>{trip.passengers || 1} Pax</span> &bull;
                  <span>{trip.luggage || 0} Bags</span> &bull;
                  <span className="capitalize">{trip.classId}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {trip.riderPhone && (
                <>
                  <a 
                    href={`tel:${trip.riderPhone}`}
                    className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/30 active:scale-95 transition-all"
                    title="Call Passenger"
                  >
                    <Phone size={16} />
                  </a>
                  <a 
                    href={`sms:${trip.riderPhone}`}
                    className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-300 flex items-center justify-center hover:bg-neutral-700 active:scale-95 transition-all"
                    title="Message Passenger"
                  >
                    <MessageSquare size={16} />
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Flight Number Banner */}
          {trip.flightNumber && (
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Plane size={15} className="text-cyan-400" />
                <span className="font-mono font-bold text-white">{trip.flightNumber}</span>
                <span className="text-neutral-400">(Inbound Telemetry)</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                On Schedule
              </span>
            </div>
          )}
        </div>

        {/* Route / GPS Navigation Card */}
        <div className="bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between font-mono">
            <span>Route Navigation</span>
            <span>{isAirport ? "Airport Protocol" : "Direct Transit"}</span>
          </div>

          {/* Pickup */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Pickup Location</div>
                <div className="text-sm font-semibold text-white mt-0.5">{trip.pickup.formatted || trip.pickup.line1}</div>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => openNavigation(trip.pickup.formatted || trip.pickup.line1 || "")}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-bold text-amber-400 flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <Navigation size={13} />
              <span>Navigate to Pickup in Maps</span>
              <ExternalLink size={12} className="opacity-60" />
            </button>
          </div>

          {/* Dropoff */}
          {trip.dropoff && (
            <div className="space-y-2 pt-3 border-t border-neutral-800">
              <div className="flex items-start gap-3">
                <Navigation size={18} className="text-neutral-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Dropoff Destination</div>
                  <div className="text-sm font-semibold text-white mt-0.5">{trip.dropoff.formatted || trip.dropoff.line1}</div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => openNavigation(trip.dropoff?.formatted || trip.dropoff?.line1 || "")}
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-bold text-neutral-300 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Navigation size={13} />
                <span>Navigate to Dropoff in Maps</span>
                <ExternalLink size={12} className="opacity-60" />
              </button>
            </div>
          )}
        </div>

        {/* Grace Period & Wait Time Countdown (when arrived) */}
        {trip.status === "arrived" && (
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                <Clock size={16} className="animate-spin" /> Curbside Grace Timer
              </div>
              <span className="text-xs font-bold font-mono text-white">
                {waitMinutes} min elapsed
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 text-center">
              <div className="p-3 bg-neutral-950/80 rounded-2xl border border-neutral-800">
                <div className="text-[10px] uppercase font-bold text-neutral-400">Remaining Grace</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{remainingGrace} min</div>
              </div>
              <div className="p-3 bg-neutral-950/80 rounded-2xl border border-neutral-800">
                <div className="text-[10px] uppercase font-bold text-neutral-400">Billable Wait</div>
                <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">{billableWaitMinutes} min</div>
              </div>
            </div>
          </div>
        )}

        {/* Prep Checklist */}
        {checklistItems.length > 0 && trip.status !== "completed" && (
          <div className="bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="text-[11px] font-bold text-accent uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Sparkles size={13} /> VIP Cabin Prep Checklist
            </div>
            
            <div className="space-y-2 pt-1">
              {checklistItems.map((item) => {
                const isChecked = checklistState[item.id] || false;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleCheck(item.id, !isChecked)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                      isChecked 
                        ? "bg-emerald-950/30 border-emerald-500/40 text-neutral-400" 
                        : "bg-neutral-950 border-neutral-800 text-white"
                    }`}
                  >
                    <span className={`text-xs font-semibold ${isChecked ? "line-through text-neutral-400" : "text-white"}`}>
                      {item.label}
                    </span>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                      isChecked ? "bg-emerald-500 border-emerald-400 text-neutral-950" : "border-neutral-700 bg-neutral-900"
                    }`}>
                      {isChecked && <CheckCircle2 size={14} className="stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Trip Actuals Form (when Onboard) */}
        {trip.status === "onboard" && (
          <div className="bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider font-mono">
              Trip Final Actuals
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">Tolls ($)</label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.50" 
                  value={tolls || ""} 
                  onChange={e => setTolls(Number(e.target.value))} 
                  placeholder="0.00"
                  className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-400" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">Parking ($)</label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.50" 
                  value={parking || ""} 
                  onChange={e => setParking(Number(e.target.value))} 
                  placeholder="0.00"
                  className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-400" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">Internal Chauffeur Notes</label>
              <textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="Optional notes for dispatch..." 
                rows={2}
                className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>
          </div>
        )}

      </div>

      {/* Fixed Sticky Action Bar for Chauffeur */}
      {trip.status !== "completed" && (
        <div className="fixed bottom-14 sm:bottom-0 left-0 right-0 z-40 bg-neutral-900/95 backdrop-blur-2xl border-t border-white/10 p-3.5 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <div className="max-w-lg mx-auto">
            {trip.status === "assigned" && (
              <button 
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusUpdate("en_route")}
                className="w-full py-4 rounded-2xl bg-amber-400 text-neutral-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-amber-300 disabled:opacity-50 active:scale-98 transition-all shadow-lg"
              >
                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : "Start Journey: En Route"}
              </button>
            )}

            {trip.status === "en_route" && (
              <button 
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusUpdate("arrived")}
                className="w-full py-4 rounded-2xl bg-amber-400 text-neutral-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-amber-300 disabled:opacity-50 active:scale-98 transition-all shadow-lg"
              >
                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : "Arrived On Scene / Curbside"}
              </button>
            )}

            {trip.status === "arrived" && (
              <button 
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusUpdate("onboard")}
                className="w-full py-4 rounded-2xl bg-amber-400 text-neutral-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-amber-300 disabled:opacity-50 active:scale-98 transition-all shadow-lg"
              >
                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : "Passenger On Board"}
              </button>
            )}

            {trip.status === "onboard" && (
              <button 
                type="button"
                disabled={actionLoading}
                onClick={handleComplete}
                className="w-full py-4 rounded-2xl bg-emerald-400 text-neutral-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-emerald-300 disabled:opacity-50 active:scale-98 transition-all shadow-lg"
              >
                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : "Complete Journey & Finalize"}
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
