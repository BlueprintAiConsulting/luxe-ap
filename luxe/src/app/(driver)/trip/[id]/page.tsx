"use client";
import { formatDateTime } from "@/lib/format";

import { useAuth } from "@/lib/firebase/auth";
import { useEffect, useState, useMemo } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Reservation, ReservationStatus, PreferenceProfile } from "@/lib/types";
import { format } from "date-fns";
import { ArrowLeft, Phone, MessageSquare, MapPin, Navigation, CheckCircle, Clock, User } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { getFunctions as getFunctionsApp, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase/client";

// --- Types & Helpers ---

type ChecklistItem = { id: string; label: string };

function generateChecklist(prefs: PreferenceProfile | null): ChecklistItem[] {
  if (!prefs) return [];
  const list: ChecklistItem[] = [];

  // Beverage
  if (prefs.beverage?.preference && prefs.beverage.preference !== "no_preference" && prefs.beverage.preference !== "none") {
    let label = prefs.beverage.preference.replace(/_/g, " ");
    if (prefs.beverage.brand) label += ` (${prefs.beverage.brand})`;
    if (prefs.beverage.temperature) label += ` - ${prefs.beverage.temperature}`;
    list.push({ id: "beverage", label: `Beverage: ${label}` });
  }

  // Conversation
  if (prefs.conversation && prefs.conversation !== "no_preference") {
    list.push({ id: "conversation", label: `Conversation: ${prefs.conversation.replace(/_/g, " ")}` });
  }

  // Cabin Temp
  if (prefs.cabinTempF) {
    list.push({ id: "cabinTemp", label: `Cabin Temp: ${prefs.cabinTempF}°F` });
  }

  // Audio
  if (prefs.audio?.mode && prefs.audio.mode !== "no_preference") {
    let label = prefs.audio.mode;
    if (prefs.audio.value) label += ` (${prefs.audio.value})`;
    list.push({ id: "audio", label: `Audio: ${label}` });
  }

  // Greeting
  if (prefs.greeting?.style && prefs.greeting.style !== "no_preference") {
    let label = prefs.greeting.style;
    if (prefs.greeting.nameSign) {
      label += ` (Name sign: ${prefs.greeting.signText || "Standard"})`;
    }
    list.push({ id: "greeting", label: `Greeting: ${label}` });
  }

  // Seating
  if (prefs.seating?.preferredSeat) {
    list.push({ id: "seating", label: `Preferred Seat: ${prefs.seating.preferredSeat}` });
  }

  return list;
}

// const STATUS_FLOW: ReservationStatus[] = ["assigned", "en_route", "arrived", "onboard", "completed"];

export default function DriverTripDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tripId = params.id as string;
  
  const [trip, setTrip] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wait time counter
  const [waitMinutes, setWaitMinutes] = useState(0);
  const [tolls, setTolls] = useState(0);
  const [parking, setParking] = useState(0);
  const [notes, setNotes] = useState("");

  const functions = getFunctionsApp(app);
  const updateTripStatus = httpsCallable(functions, "updateTripStatus");
  const updateTripChecklist = httpsCallable(functions, "updateTripChecklist");
  const completeTrip = httpsCallable(functions, "completeTrip");

  const isAirport = trip?.tripType === "airport_arrival" || trip?.tripType === "airport_departure";
  const graceMinutes = isAirport ? 45 : 15;
  const billableWaitMinutes = Math.max(0, waitMinutes - graceMinutes);

  useEffect(() => {
    if (!user || !tripId) return;

    const unsubscribe = onSnapshot(doc(db, "reservations", tripId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Reservation;
        setTrip(data);
        
        // Initialize timer if arrived
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

  // Wait timer effect
  useEffect(() => {
    if (trip?.status === "arrived") {
      const interval = setInterval(() => {
        setWaitMinutes(prev => prev + 1);
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [trip?.status]);

  const checklistItems = useMemo(() => generateChecklist(trip?.preferences || null), [trip?.preferences]);

  if (loading) return <div className="flex justify-center items-center h-screen text-white">Loading...</div>;
  if (!trip) return <div className="flex justify-center items-center h-screen text-white">Trip not found</div>;

  const handleCheck = async (id: string, checked: boolean) => {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e.message || "Failed to update status");
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
        tollsCents: tolls * 100, 
        parkingCents: parking * 100 
      });
      router.push("/driver/today");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e.message || "Failed to complete trip");
      setActionLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pTime = trip.pickupAt as any;
  const dateObj = typeof pTime?.toDate === "function" ? pTime.toDate() : new Date(pTime);
  const checklistState = trip.prepChecklistState || {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapLink = (addr: any) => `https://maps.apple.com/?daddr=${encodeURIComponent(addr.line1 + (addr.city ? ", " + addr.city : ""))}`;

  return (
    <div className="min-h-screen bg-black text-white p-4 space-y-6 pb-32 animate-in fade-in slide-in-from-right-4">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => router.push("/driver/today")} className="p-3 bg-neutral-900 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <div className="font-bold uppercase tracking-wider text-neutral-400 text-sm">
          {trip.status.replace(/_/g, " ")}
        </div>
      </div>

      <div className="text-3xl font-bold">{formatDateTime(dateObj, trip.timezone || "UTC")}</div>

      {/* Rider Info */}
      <div className="flex justify-between items-center bg-neutral-900 p-4 rounded-2xl border border-neutral-800">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center overflow-hidden">
            {(trip as any).riderPhotoUrl ? (
              <img src={(trip as any).riderPhotoUrl} alt="Rider" className="w-full h-full object-cover" />
            ) : (
              <User size={22} className="text-neutral-400" />
            )}
          </div>
          <div>
            <div className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">Rider</div>
            <div className="text-lg font-black text-white">{trip.riderName}</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex space-x-4">
        <a href={`tel:${trip.riderPhone}`} className="flex-1 bg-neutral-900 py-3 rounded-2xl flex items-center justify-center font-bold text-sm">
          <Phone size={16} className="mr-2" /> Call
        </a>
        <a href={`sms:${trip.riderPhone}`} className="flex-1 bg-neutral-900 py-3 rounded-2xl flex items-center justify-center font-bold text-sm">
          <MessageSquare size={16} className="mr-2" /> Text
        </a>
      </div>

      {/* Routing */}
      <div className="bg-neutral-900 rounded-3xl p-5 space-y-5 border border-neutral-800">
        <div className="flex items-start justify-between">
          <div className="flex">
            <MapPin size={20} className="text-emerald-400 mr-3 mt-1" />
            <div>
              <div className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">Pickup</div>
              <div className="font-semibold text-lg">{trip.pickup.line1}</div>
              {trip.pickup.city && <div className="text-neutral-400">{trip.pickup.city}, {trip.pickup.state}</div>}
            </div>
          </div>
          <a href={mapLink(trip.pickup)} target="_blank" rel="noreferrer" className="p-3 bg-neutral-800 rounded-full text-white">
            <Navigation size={18} />
          </a>
        </div>
        
        {trip.dropoff && (
          <div className="flex items-start justify-between border-t border-neutral-800 pt-5">
            <div className="flex">
              <MapPin size={20} className="text-blue-400 mr-3 mt-1" />
              <div>
                <div className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">Dropoff</div>
                <div className="font-semibold text-lg">{trip.dropoff.line1}</div>
                {trip.dropoff.city && <div className="text-neutral-400">{trip.dropoff.city}, {trip.dropoff.state}</div>}
              </div>
            </div>
            <a href={mapLink(trip.dropoff)} target="_blank" rel="noreferrer" className="p-3 bg-neutral-800 rounded-full text-white">
              <Navigation size={18} />
            </a>
          </div>
        )}
      </div>

      {/* Live Wait-Time Grace HUD */}
      {trip.status === "arrived" && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-lg animate-in fade-in">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                <Clock className="text-accent" size={20} />
              </div>
              <div>
                <div className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Arrival & Wait Timer</div>
                <div className="text-xl font-bold text-white">{waitMinutes} min elapsed</div>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              waitMinutes > graceMinutes 
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" 
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
            }`}>
              {waitMinutes > graceMinutes ? "BILLABLE WAIT TIME" : "COMPLIMENTARY GRACE"}
            </span>
          </div>

          <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-neutral-400">Policy Allowance ({isAirport ? "Airport Arrival" : "Standard"})</span>
              <span className="text-white">{graceMinutes} min free</span>
            </div>
            <div className="w-full bg-neutral-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${waitMinutes > graceMinutes ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${Math.min(100, (waitMinutes / graceMinutes) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs pt-1">
              <span className="text-neutral-500">
                {waitMinutes < graceMinutes 
                  ? `${graceMinutes - waitMinutes} min grace remaining` 
                  : `${billableWaitMinutes} min billable past grace`}
              </span>
              {waitMinutes > graceMinutes && (
                <span className="text-amber-400 font-bold">
                  +${((billableWaitMinutes * 175) / 100).toFixed(2)} auto-capturing
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prep Checklist */}
      {checklistItems.length > 0 && trip.status !== "completed" && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-4 px-2">Prep Checklist</h2>
          <div className="bg-neutral-900 rounded-3xl overflow-hidden border border-neutral-800">
            {checklistItems.map((item, idx) => {
              const isChecked = checklistState[item.id] || false;
              return (
                <label key={item.id} className={`flex items-center p-5 cursor-pointer ${idx !== checklistItems.length - 1 ? "border-b border-neutral-800" : ""}`}>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={isChecked}
                    onChange={(e) => handleCheck(item.id, e.target.checked)}
                  />
                  <div className={`mr-4 transition-colors ${isChecked ? "text-emerald-400" : "text-neutral-700"}`}>
                    <CheckCircle size={24} className={isChecked ? "fill-emerald-400/20" : ""} />
                  </div>
                  <div className={`flex-1 font-semibold transition-all ${isChecked ? "text-neutral-500 line-through" : "text-white"}`}>
                    {item.label}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      {trip.specialInstructions && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-4 px-2">Special Instructions</h2>
          <div className="bg-yellow-500/10 text-yellow-500 p-5 rounded-3xl border border-yellow-500/20 font-medium">
            {trip.specialInstructions}
          </div>
        </div>
      )}

      {/* Completion Form */}
      {trip.status === "onboard" && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-4 px-2">Trip Actuals</h2>
          <div className="space-y-4 bg-neutral-900 p-5 rounded-3xl border border-neutral-800">
            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-2">Wait Time (Minutes)</label>
              <input type="number" min="0" value={waitMinutes} onChange={e => setWaitMinutes(Number(e.target.value))} className="w-full bg-black border border-neutral-800 rounded-xl p-4 text-white outline-none focus:border-white text-lg font-bold" />
            </div>
            <div className="flex space-x-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-neutral-400 mb-2">Tolls ($)</label>
                <input type="number" min="0" step="0.01" value={tolls} onChange={e => setTolls(Number(e.target.value))} className="w-full bg-black border border-neutral-800 rounded-xl p-4 text-white outline-none focus:border-white text-lg font-bold" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-neutral-400 mb-2">Parking ($)</label>
                <input type="number" min="0" step="0.01" value={parking} onChange={e => setParking(Number(e.target.value))} className="w-full bg-black border border-neutral-800 rounded-xl p-4 text-white outline-none focus:border-white text-lg font-bold" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-2">Driver Notes (Internal)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-xl p-4 text-white outline-none focus:border-white resize-none" rows={3}></textarea>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl font-semibold">
          {error}
        </div>
      )}

      {/* Floating Action Button (Status Progression) */}
      <div className="fixed bottom-24 left-0 w-full px-4 z-40">
        {trip.status === "assigned" && (
          <button 
            disabled={actionLoading}
            onClick={() => handleStatusUpdate("en_route")}
            className="w-full bg-white text-black py-5 rounded-2xl font-black text-lg disabled:opacity-50"
          >
            {actionLoading ? "Updating..." : "En Route"}
          </button>
        )}
        {trip.status === "en_route" && (
          <button 
            disabled={actionLoading}
            onClick={() => handleStatusUpdate("arrived")}
            className="w-full bg-white text-black py-5 rounded-2xl font-black text-lg disabled:opacity-50"
          >
            {actionLoading ? "Updating..." : "Arrived"}
          </button>
        )}
        {trip.status === "arrived" && (
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-2 text-neutral-400 mb-2">
              <Clock size={16} className="animate-pulse" />
              <span className="font-bold">Wait Time: {waitMinutes} min</span>
            </div>
            <button 
              disabled={actionLoading}
              onClick={() => handleStatusUpdate("onboard")}
              className="w-full bg-white text-black py-5 rounded-2xl font-black text-lg disabled:opacity-50"
            >
              {actionLoading ? "Updating..." : "Passenger Onboard"}
            </button>
          </div>
        )}
        {trip.status === "onboard" && (
          <button 
            disabled={actionLoading}
            onClick={handleComplete}
            className="w-full bg-emerald-500 text-black py-5 rounded-2xl font-black text-lg disabled:opacity-50"
          >
            {actionLoading ? "Completing..." : "Complete Trip"}
          </button>
        )}
      </div>

    </div>
  );
}
