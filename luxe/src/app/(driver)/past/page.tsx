"use client";

import { useAuth } from "@/lib/firebase/auth";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Reservation } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";
import { MapPin, Navigation, History, DollarSign, Star, User } from "lucide-react";
import { useSearchParams } from "next/navigation";
import TripRatingModal from "@/components/TripRatingModal";

export default function DriverPastTripsPage() {
  const { user, role } = useAuth();
  const searchParams = useSearchParams();
  const targetDriverId = searchParams?.get("d") && role === "admin" ? searchParams.get("d") : user?.uid;

  const [trips, setTrips] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingTrip, setRatingTrip] = useState<Reservation | null>(null);

  useEffect(() => {
    if (!targetDriverId) return;

    const q = query(
      collection(db, "reservations"),
      where("driverId", "==", targetDriverId),
      where("status", "==", "completed"),
      orderBy("pickupAt", "desc"),
      limit(20)
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
  }, [user]);

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-white">Loading History...</div>;
  }

  return (
    <div className="p-4 space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4">
      <div className="mt-4 mb-8">
        <h1 className="text-3xl font-bold text-white">History</h1>
        <p className="text-neutral-400">Completed Trips & Payouts</p>
      </div>

      {trips.length === 0 ? (
        <div className="text-center bg-neutral-900/80 border border-neutral-800 rounded-3xl py-20 px-8 mt-6">
          <div className="w-20 h-20 bg-neutral-800/60 border border-neutral-700/40 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <History className="w-10 h-10 text-neutral-400" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-white tracking-tight">No Past Trips Recorded</h2>
          <p className="text-neutral-400 max-w-sm mx-auto text-sm leading-relaxed mb-6">
            When you complete client reservations, detailed trip logs, gratuity, and payout statements will populate here.
          </p>
          <Link
            href="/today"
            className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-700 px-5 py-2.5 rounded-full border border-neutral-700 transition-colors"
          >
            View Active Jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip, idx) => {
            const pTime = trip.pickupAt as any;
            const dateObj = typeof pTime?.toDate === "function" ? pTime.toDate() : new Date(pTime);
            
            // Earnings logic v1
            let payoutCents = 8500;
            if (trip.pricing && trip.pricing.totalCents) {
              payoutCents = Math.floor(trip.pricing.totalCents * 0.8);
            }
            const payoutStr = (payoutCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            return (
              <div 
                key={trip.reservationId}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4"
                style={{ animationDelay: `${idx * 50}ms`, animationFillMode: "both" }}
              >
                <div className="flex justify-between items-start mb-4 border-b border-neutral-800 pb-4">
                  <div>
                    <div className="text-lg font-bold text-white">{formatDateTime(dateObj, trip.timezone || "UTC")}</div>
                    <div className="text-sm text-neutral-400 flex items-center mt-1">
                      <div className="w-5 h-5 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center mr-2 overflow-hidden text-[10px]">
                        {(trip as any).riderPhotoUrl ? (
                          <img src={(trip as any).riderPhotoUrl} alt="Rider" className="w-full h-full object-cover" />
                        ) : (
                          <User size={12} className="text-neutral-400" />
                        )}
                      </div>
                      Rider: {trip.riderName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-400 flex items-center justify-end">
                      <DollarSign size={16} />
                      {payoutStr}
                    </div>
                    <div className="text-xs text-neutral-500 uppercase tracking-wider font-bold">Payout</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start">
                    <MapPin size={16} className="text-neutral-500 mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-neutral-200">{trip.pickup.line1}</div>
                      {trip.pickup.city && <div className="text-sm text-neutral-500">{trip.pickup.city}</div>}
                    </div>
                  </div>
                  {trip.dropoff && (
                    <div className="flex items-start">
                      <Navigation size={16} className="text-neutral-500 mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-neutral-200">{trip.dropoff.line1}</div>
                        {trip.dropoff.city && <div className="text-sm text-neutral-500">{trip.dropoff.city}</div>}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-neutral-800 flex justify-end">
                  {!(trip as any).riderRating ? (
                    <button
                      onClick={(e) => { e.preventDefault(); setRatingTrip(trip); }}
                      className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded-lg font-bold flex items-center transition-all active:scale-95 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      <Star size={13} className="fill-amber-400 text-amber-500 mr-1" />
                      Rate Rider
                    </button>
                  ) : (
                    <span className="flex items-center text-amber-500 font-bold text-sm">
                      <Star size={13} className="fill-amber-500 mr-1" />
                      {(trip as any).riderRating}.0 Rated
                    </span>
                  )}
                </div>
              </div>
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
