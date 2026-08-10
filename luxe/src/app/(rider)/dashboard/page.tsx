"use client";

import { useAuth } from "@/lib/firebase/auth";
import Link from "next/link";
import { Car } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Reservation } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

export default function RiderDashboardPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "reservations"),
      where("riderId", "==", user.uid),
      orderBy("pickupAt", "desc"),
      limit(10)
    );

    const unsub = onSnapshot(q, (snap) => {
      const results: Reservation[] = [];
      snap.forEach(d => results.push(d.data() as Reservation));
      setTrips(results);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  if (loading) {
    return <div className="p-8 text-center text-neutral-500">Loading trips...</div>;
  }

  return (
    <div className="p-4 max-w-lg mx-auto w-full pt-8 animate-in fade-in slide-in-from-bottom-4">
      <h1 className="text-3xl font-bold mb-8">My Trips</h1>
      
      {trips.length === 0 ? (
        <div className="text-center bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl py-16 px-6">
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Car className="w-8 h-8 text-neutral-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">No trips today</h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">
            You don't have any past or upcoming trips yet.
          </p>
          <Link 
            href="/book"
            className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl font-medium inline-block transition-transform active:scale-95"
          >
            Book your first ride
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map(trip => (
            <div key={trip.reservationId} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl flex justify-between items-center shadow-sm">
              <div>
                <div className="font-bold">{formatDateTime(trip.pickupAt as any, trip.timezone || "UTC")}</div>
                <div className="text-sm text-neutral-500 mt-1">{trip.pickup.line1} &rarr; {trip.dropoff?.line1}</div>
              </div>
              <div className="text-sm font-semibold px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded capitalize">
                {trip.status.replace("_", " ")}
              </div>
            </div>
          ))}
          
          <div className="pt-6">
            <Link 
              href="/book"
              className="block w-full text-center bg-black dark:bg-white text-white dark:text-black px-6 py-4 rounded-xl font-medium transition-transform active:scale-95"
            >
              Book another ride
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
