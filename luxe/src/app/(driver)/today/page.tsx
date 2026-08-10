"use client";
import { formatDateTime } from "@/lib/format";

import { useAuth } from "@/lib/firebase/auth";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Reservation } from "@/lib/types";
import { format } from "date-fns";
import Link from "next/link";
import { MapPin, Navigation } from "lucide-react";

export default function DriverTodayPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Get today's bounds in local time (or driver timezone, but we'll use simple start/end of today)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const q = query(
      collection(db, "reservations"),
      where("driverId", "==", user.uid),
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
  }, [user]);

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-white">Loading...</div>;
  }

  const activeTripIndex = trips.findIndex(t => t.status !== "completed" && t.status !== "cancelled" && t.status !== "no_show");

  return (
    <div className="p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-end mt-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Today</h1>
          <p className="text-neutral-400">{format(new Date(), "EEEE, MMMM d")}</p>
        </div>
        <div className="text-sm font-semibold bg-neutral-800 px-3 py-1 rounded-full">
          {trips.length} Jobs
        </div>
      </div>

      {trips.length === 0 ? (
        <div className="text-center bg-neutral-900 border border-neutral-800 rounded-2xl py-16 px-6 mt-12">
          <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-neutral-500" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-white">No assigned trips</h2>
          <p className="text-neutral-500 max-w-xs mx-auto">
            You have no trips scheduled for today. Check back later or contact dispatch.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip, idx) => {
            const isNext = idx === activeTripIndex;
            const isCompleted = trip.status === "completed";
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pTime = trip.pickupAt as any;
            const dateObj = typeof pTime?.toDate === "function" ? pTime.toDate() : new Date(pTime);

            return (
              <Link 
                href={`/driver/trip/${trip.reservationId}`} 
                key={trip.reservationId}
                className={`block rounded-2xl p-5 transition-all ${
                  isNext 
                    ? "bg-neutral-800 border-2 border-white" 
                    : isCompleted 
                      ? "bg-neutral-900 border border-neutral-800 opacity-50" 
                      : "bg-neutral-900 border border-neutral-800"
                }`}
              >
                {isNext && (
                  <div className="text-xs font-bold uppercase tracking-wider mb-3 text-emerald-400 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
                    Next Up
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-4">
                  <div className="text-2xl font-bold">{formatDateTime(dateObj, trip.timezone || "UTC")}</div>
                  <div className="text-xs font-bold uppercase px-2 py-1 bg-neutral-800 rounded text-neutral-300">
                    {trip.status.replace("_", " ")}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-start">
                    <MapPin size={16} className="text-neutral-500 mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold">{trip.pickup.line1}</div>
                      {trip.pickup.city && <div className="text-sm text-neutral-400">{trip.pickup.city}</div>}
                    </div>
                  </div>
                  {trip.dropoff && (
                    <div className="flex items-start">
                      <Navigation size={16} className="text-neutral-500 mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <div className="font-semibold">{trip.dropoff.line1}</div>
                        {trip.dropoff.city && <div className="text-sm text-neutral-400">{trip.dropoff.city}</div>}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-neutral-800 flex justify-between items-center text-sm">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center mr-3">
                      👤
                    </div>
                    <span className="font-semibold">{trip.riderName}</span>
                  </div>
                  <div className="text-neutral-400">
                    {trip.className}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
