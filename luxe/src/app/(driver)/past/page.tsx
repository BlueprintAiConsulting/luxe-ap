"use client";

import { useAuth } from "@/lib/firebase/auth";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Reservation } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";
import { MapPin, Navigation, History, DollarSign } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function DriverPastTripsPage() {
  const { user, role } = useAuth();
  const searchParams = useSearchParams();
  const targetDriverId = searchParams?.get("d") && role === "admin" ? searchParams.get("d") : user?.uid;

  const [trips, setTrips] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="mt-4 mb-8">
        <h1 className="text-3xl font-bold text-white">History</h1>
        <p className="text-neutral-400">Completed Trips & Payouts</p>
      </div>

      {trips.length === 0 ? (
        <div className="text-center bg-neutral-900 border border-neutral-800 rounded-2xl py-16 px-6 mt-12">
          <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <History className="w-8 h-8 text-neutral-500" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-white">No history yet</h2>
          <p className="text-neutral-500 max-w-xs mx-auto">
            Your completed trips and earnings will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => {
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
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5"
              >
                <div className="flex justify-between items-start mb-4 border-b border-neutral-800 pb-4">
                  <div>
                    <div className="text-lg font-bold text-white">{formatDateTime(dateObj, trip.timezone || "UTC")}</div>
                    <div className="text-sm text-neutral-400">Rider: {trip.riderName}</div>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
