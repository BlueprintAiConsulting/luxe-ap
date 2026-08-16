"use client";

import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/lib/firebase/auth";
import { useEffect, useState, Suspense } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Reservation } from "@/lib/types";
import { format } from "date-fns";
import Link from "next/link";
import { MapPin, Navigation, Star, User, Calendar, Sparkles, Clock, ArrowRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import TripRatingModal from "@/components/TripRatingModal";

export default function DriverTodayPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64 text-white">Loading Chauffeur Schedule...</div>}>
      <DriverTodayInner />
    </Suspense>
  );
}

function DriverTodayInner() {
  const { user, role } = useAuth();
  const searchParams = useSearchParams();
  const targetDriverId = searchParams?.get("d") && role === "admin" ? searchParams.get("d") : user?.uid;

  const [trips, setTrips] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingTrip, setRatingTrip] = useState<Reservation | null>(null);

  useEffect(() => {
    if (!targetDriverId) return;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const q = query(
      collection(db, "reservations"),
      where("driverId", "==", targetDriverId),
      where("pickupAt", ">=", startOfDay),
      where("pickupAt", "<=", endOfDay),
      orderBy("pickupAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: Reservation[] = [];
      snapshot.forEach(doc => {
        results.push(doc.data() as Reservation);
      });
      setTrips(results);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, targetDriverId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050507] text-white">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium tracking-wider uppercase text-neutral-400">Loading Today's Schedule...</span>
        </div>
      </div>
    );
  }

  const activeTripIndex = trips.findIndex(t => t.status !== "completed" && t.status !== "cancelled" && t.status !== "no_show");

  return (
    <div className="p-4 max-w-lg mx-auto w-full pt-6 pb-28 space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 selection:bg-accent selection:text-neutral-950">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-[10px] font-bold uppercase tracking-widest mb-1 font-mono shadow-gold-sm">
            <Sparkles size={11} className="text-accent" /> Driver Schedule
          </div>
          <h1 className="text-3xl font-bold font-serif text-white tracking-tight">Today's Jobs</h1>
          <p className="text-xs text-neutral-400 mt-0.5 font-medium">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="text-xs font-mono font-bold bg-[#101015] border border-neutral-800 text-accent px-3 py-1.5 rounded-xl shadow-gold-sm">
          {trips.length} {trips.length === 1 ? "Charter" : "Charters"}
        </div>
      </div>

      {trips.length === 0 ? (
        <div className="text-center bg-[#0e0e13]/90 backdrop-blur-xl border border-neutral-800 rounded-3xl py-16 px-6 shadow-xl">
          <div className="w-16 h-16 bg-[#181820] border border-neutral-700 rounded-2xl flex items-center justify-center mx-auto mb-4 text-accent">
            <Calendar size={28} />
          </div>
          <h2 className="text-lg font-bold text-white font-serif mb-1">No Jobs Scheduled Today</h2>
          <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed mb-6">
            Your roster is currently clear. Live dispatch will push notifications when executive charters are allocated.
          </p>
          <div className="inline-flex items-center gap-2 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 px-3.5 py-1.5 rounded-full border border-emerald-500/30 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            DISPATCH ACTIVE & MONITORING
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip, idx) => {
            const isNext = idx === activeTripIndex;
            const isCompleted = trip.status === "completed";
            
            const pTime = trip.pickupAt as any;
            const dateObj = typeof pTime?.toDate === "function" ? pTime.toDate() : new Date(pTime);

            return (
              <Link 
                href={`/trip/${trip.reservationId}`} 
                key={trip.reservationId}
                className={`block rounded-3xl p-5 transition-all active:scale-[0.98] shadow-xl ${
                  isNext 
                    ? "bg-[#111117] border-2 border-accent ring-2 ring-accent/20 shadow-gold-md" 
                    : isCompleted 
                      ? "bg-[#0c0c10]/60 border border-neutral-800/80 opacity-60" 
                      : "bg-[#0e0e13] border border-neutral-800 hover:border-accent/40"
                }`}
                style={{ animationDelay: `${idx * 50}ms`, animationFillMode: "both" }}
              >
                {isNext && (
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider mb-2 text-accent flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-accent animate-ping"></span>
                    <span>NEXT IMMEDIATE CHARTER</span>
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-3">
                  <div className="text-xl font-bold text-white font-mono">
                    {formatDateTime(dateObj, trip.timezone || "UTC")}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    isNext 
                      ? "bg-accent/20 border-accent/50 text-accent font-bold" 
                      : "bg-neutral-800 border-neutral-700 text-neutral-300"
                  }`}>
                    {trip.status.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="space-y-2 mb-4 text-xs">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={15} className="text-accent mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-white">{trip.pickup.line1}</div>
                      {trip.pickup.city && <div className="text-[11px] text-neutral-400">{trip.pickup.city}</div>}
                    </div>
                  </div>
                  {trip.dropoff && (
                    <div className="flex items-start gap-2.5">
                      <Navigation size={15} className="text-neutral-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-white">{trip.dropoff.line1}</div>
                        {trip.dropoff.city && <div className="text-[11px] text-neutral-400">{trip.dropoff.city}</div>}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-neutral-800 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#181822] border border-neutral-700 flex items-center justify-center text-accent font-bold text-xs">
                      {trip.riderName?.charAt(0) || "P"}
                    </div>
                    <span className="font-semibold text-white">{trip.riderName || "Executive Passenger"}</span>
                  </div>
                  
                  {trip.status === "completed" && !(trip as any).riderRating ? (
                    <button
                      onClick={(e) => { e.preventDefault(); setRatingTrip(trip); }}
                      className="px-2.5 py-1 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 rounded-xl font-bold text-[11px] flex items-center transition-all active:scale-95 shadow-gold-sm"
                    >
                      <Star size={11} className="fill-accent text-accent mr-1" />
                      Rate Passenger
                    </button>
                  ) : (
                    <div className="text-neutral-400 text-[11px] font-medium flex items-center gap-1">
                      <span>View Cockpit</span>
                      <ArrowRight size={12} />
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {ratingTrip && (
        <TripRatingModal
          reservationId={ratingTrip.reservationId}
          targetType="rider"
          targetId={ratingTrip.riderId}
          targetName={ratingTrip.riderName}
          onClose={() => setRatingTrip(null)}
          onSuccess={() => setRatingTrip(null)}
        />
      )}
    </div>
  );
}
