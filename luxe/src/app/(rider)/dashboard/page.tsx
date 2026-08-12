"use client";

import { useAuth } from "@/lib/firebase/auth";
import Link from "next/link";
import { Car, LogOut, Sparkles, Star, PlusCircle, Calendar, PhoneCall, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import { signOut } from "firebase/auth";
import { Reservation } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import LiveTripMap from "@/components/LiveTripMap";
import TripRatingModal from "@/components/TripRatingModal";

export default function RiderDashboardPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingTrip, setRatingTrip] = useState<Reservation | null>(null);
  const [limitCount, setLimitCount] = useState(10);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "reservations"),
      where("riderId", "==", user.uid),
      orderBy("pickupAt", "desc"),
      limit(limitCount)
    );

    const unsub = onSnapshot(q, (snap) => {
      const results: Reservation[] = [];
      snap.forEach(d => results.push(d.data() as Reservation));
      setTrips(results);
      setLoading(false);
    });

    return () => unsub();
  }, [user, limitCount]);

  if (loading) {
    return <div className="p-8 text-center text-neutral-500">Loading trips...</div>;
  }

  return (
    <div className="p-4 max-w-lg mx-auto w-full pt-8 pb-28 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4">
      {/* Header with Preferences Link */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Trips</h1>
          <p className="text-xs text-neutral-400 font-medium">Executive Chauffeured Concierge</p>
        </div>
        <div className="flex items-center space-x-2">
          <a
            href="tel:+18005550199"
            aria-label="Contact Concierge"
            className="flex items-center space-x-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-xl text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
            title="Contact Concierge"
          >
            <PhoneCall size={14} className="text-neutral-500 dark:text-neutral-400" />
            <span className="hidden sm:inline">Concierge</span>
          </a>
          <Link
            href="/preferences"
            aria-label="Concierge Preferences Settings"
            className="flex items-center space-x-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-xl text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
            title="Concierge Preferences Settings"
          >
            <Sparkles size={14} className="text-accent" />
            <span className="hidden sm:inline">Preferences</span>
          </Link>
          <button 
            onClick={() => signOut(auth)} 
            aria-label="Sign Out"
            className="p-2 text-neutral-500 hover:text-red-500 transition-colors rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
      
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
            className="bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black px-6 py-3 rounded-xl font-medium inline-block transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
          >
            Book your first ride
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {trips.map((trip, index) => {
            const isActive = ["assigned", "en_route", "arrived", "onboard"].includes(trip.status);
            const isCompleted = trip.status === "completed";
            const driverRated = typeof (trip as any).driverRating === "number";

            return (
              <div 
                key={trip.reservationId} 
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl shadow-sm space-y-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-lg">{formatDateTime(trip.pickupAt as any, trip.timezone || "UTC")}</div>
                    <div className="text-sm text-neutral-500 mt-1">{trip.pickup.line1} &rarr; {trip.dropoff?.line1 || "As directed"}</div>
                  </div>
                  <div className="text-xs font-bold px-3 py-1 bg-black text-white dark:bg-white dark:text-black rounded-full capitalize">
                    {trip.status.replace(/_/g, " ")}
                  </div>
                </div>

                {/* Driver Info */}
                {trip.driverName && (
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                    <span className="text-neutral-500 font-medium">Chauffeur: <span className="font-bold text-neutral-900 dark:text-white">{trip.driverName}</span></span>
                    {driverRated ? (
                      <span className="flex items-center text-amber-500 font-bold">
                        <Star size={13} className="fill-amber-500 mr-1" />
                        {(trip as any).driverRating}.0 Rated
                      </span>
                    ) : isCompleted ? (
                      <button
                        onClick={() => setRatingTrip(trip)}
                        className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg font-bold flex items-center transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                      >
                        <Star size={13} className="fill-amber-400 text-amber-500 mr-1" />
                        Rate Driver
                      </button>
                    ) : null}
                  </div>
                )}

                {/* Embedded Live GPS Tracking Map for Active Trips */}
                {isActive && (
                  <div className="pt-2">
                    <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Live Chauffeur Location</div>
                    <LiveTripMap
                      pickup={trip.pickup}
                      dropoff={trip.dropoff}
                      driverName={trip.driverName || "Marcus Bennett"}
                      vehicleDescription={trip.vehicleDescription || "Mercedes-Benz S-Class"}
                      driverPhotoUrl={trip.driverPhotoUrl}
                      status={trip.status}
                    />
                  </div>
                )}
              </div>
            );
          })}
          
          <div className="pt-6 space-y-3">
            {trips.length >= limitCount && (
              <button 
                onClick={() => setLimitCount(c => c + 10)}
                className="block w-full text-center bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white px-6 py-4 rounded-xl font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
              >
                Load older trips
              </button>
            )}
            <Link 
              href="/book"
              className="group flex items-center justify-center w-full bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black px-6 py-4 rounded-xl font-medium transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
            >
              <span>Book another ride</span>
              <ArrowRight size={18} className="ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      )}

      {/* Rider Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 py-3 px-6 z-40">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <Link href="/dashboard" className="flex flex-col items-center text-brand dark:text-white font-bold text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white rounded-lg p-1">
            <Calendar size={20} className="mb-0.5" />
            <span>My Trips</span>
          </Link>
          <Link href="/book" className="flex flex-col items-center text-neutral-400 hover:text-brand dark:hover:text-white text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white rounded-lg p-1">
            <PlusCircle size={20} className="mb-0.5 text-accent" />
            <span>Book Ride</span>
          </Link>
          <Link href="/preferences" className="flex flex-col items-center text-neutral-400 hover:text-brand dark:hover:text-white text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white rounded-lg p-1">
            <Sparkles size={20} className="mb-0.5 text-accent" />
            <span>Preferences</span>
          </Link>
        </div>
      </div>

      {/* Trip Rating Modal */}
      {ratingTrip && (
        <TripRatingModal
          reservationId={ratingTrip.reservationId}
          targetType="driver"
          targetId={ratingTrip.driverId!}
          targetName={ratingTrip.driverName || "Chauffeur"}
          targetPhotoUrl={ratingTrip.driverPhotoUrl}
          onClose={() => setRatingTrip(null)}
          onSuccess={() => setRatingTrip(null)}
        />
      )}
    </div>
  );
}
