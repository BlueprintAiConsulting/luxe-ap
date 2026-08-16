"use client";

import { useAuth } from "@/lib/firebase/auth";
import Link from "next/link";
import { Car, LogOut, Sparkles, Star, PlusCircle, Calendar, PhoneCall, ArrowRight, ShieldCheck, MapPin, Navigation, FileText, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import { signOut } from "firebase/auth";
import { Reservation } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import LiveTripMap from "@/components/LiveTripMap";
import TripRatingModal from "@/components/TripRatingModal";
import ExecutiveInvoiceModal from "@/components/ExecutiveInvoiceModal";
import ReservationChatDrawer from "@/components/ReservationChatDrawer";

export default function RiderDashboardPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingTrip, setRatingTrip] = useState<Reservation | null>(null);
  const [selectedInvoiceTrip, setSelectedInvoiceTrip] = useState<Reservation | null>(null);
  const [chatTrip, setChatTrip] = useState<Reservation | null>(null);
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
    return (
      <div className="p-8 text-center text-neutral-500 min-h-[50vh] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium tracking-wider uppercase text-neutral-400">Loading your reservations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto w-full pt-6 pb-28 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4">
      
      {/* Header with Luxury Brand & Quick Actions */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-widest mb-1 font-mono">
            <Sparkles size={11} /> Concierge Active
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">My Reservations</h1>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href="tel:+18005550199"
            aria-label="Contact Concierge"
            className="flex items-center space-x-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md"
            title="Contact Concierge"
          >
            <PhoneCall size={13} className="text-accent" />
            <span className="hidden sm:inline">Concierge</span>
          </a>
          <button 
            onClick={() => signOut(auth)} 
            aria-label="Sign Out"
            className="p-2 text-neutral-400 hover:text-red-400 transition-colors rounded-xl bg-neutral-900 border border-neutral-800 active:scale-95"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
      
      {/* Trips list */}
      {trips.length === 0 ? (
        <div className="text-center bg-[#0e0e13]/90 backdrop-blur-xl border border-amber-400/20 rounded-3xl py-14 px-6 shadow-2xl space-y-4">
          <div className="w-16 h-16 bg-[#181822] border border-neutral-700 rounded-2xl flex items-center justify-center mx-auto text-accent shadow-gold-sm">
            <Car size={30} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-serif">No Upcoming Trips</h2>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
              Your next executive charter will appear here with live flight & chauffeur telemetry.
            </p>
          </div>
          <div className="pt-2">
            <Link 
              href="/book"
              className="bg-gold-gradient hover:bg-gold-gradient-hover text-neutral-950 px-6 py-3.5 rounded-2xl font-bold text-xs inline-flex items-center gap-2 transition-all active:scale-95 shadow-gold-sm hover:shadow-gold-md"
            >
              <span>Book An Executive Ride</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip, index) => {
            const isActive = ["assigned", "en_route", "arrived", "onboard"].includes(trip.status);
            const isCompleted = trip.status === "completed";
            const driverRated = typeof (trip as any).driverRating === "number";

            return (
              <div 
                key={trip.reservationId} 
                className="bg-[#0e0e13]/90 backdrop-blur-xl border border-neutral-800 hover:border-amber-400/30 p-5 rounded-3xl shadow-xl space-y-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 transition-all"
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
              >
                {/* Status & Date */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-bold text-base text-white">
                      {formatDateTime(trip.pickupAt as any, trip.timezone || "UTC")}
                    </div>
                    <div className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5">
                      <MapPin size={13} className="text-accent shrink-0" />
                      <span className="line-clamp-1">{trip.pickup.line1}</span>
                    </div>
                    {trip.dropoff && (
                      <div className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1.5">
                        <Navigation size={13} className="text-neutral-500 shrink-0" />
                        <span className="line-clamp-1">{trip.dropoff.line1}</span>
                      </div>
                    )}
                  </div>
                  
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border shrink-0 ${
                    isActive 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 animate-pulse" 
                      : isCompleted 
                        ? "bg-neutral-800 border-neutral-700 text-neutral-300"
                        : "bg-accent/15 border-accent/30 text-accent font-bold"
                  }`}>
                    {trip.status.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Driver Info */}
                {/* Actions & Itinerary / Receipt / Chat Triggers */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-neutral-800 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedInvoiceTrip(trip)}
                      className="px-3 py-2 bg-[#181822] hover:border-accent border border-neutral-700 text-neutral-200 rounded-xl font-mono text-[11px] font-bold flex items-center gap-1.5 transition-all active:scale-95 min-h-[38px]"
                    >
                      <FileText size={13} className="text-accent" />
                      <span>Receipt & Itinerary</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setChatTrip(trip)}
                      className="px-3 py-2 bg-[#181822] hover:border-accent border border-neutral-700 text-neutral-200 rounded-xl font-mono text-[11px] font-bold flex items-center gap-1.5 transition-all active:scale-95 min-h-[38px]"
                    >
                      <MessageSquare size={13} className="text-accent" />
                      <span>Concierge Chat</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {driverRated ? (
                      <span className="flex items-center text-accent font-bold text-[11px]">
                        <Star size={12} className="fill-accent text-accent mr-1" />
                        {(trip as any).driverRating}.0 Rated
                      </span>
                    ) : isCompleted ? (
                      <button
                        type="button"
                        onClick={() => setRatingTrip(trip)}
                        className="px-2.5 py-2 bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 rounded-xl font-bold text-[11px] flex items-center transition-all active:scale-95 min-h-[38px]"
                      >
                        <Star size={11} className="fill-accent text-accent mr-1" />
                        Rate Chauffeur
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Embedded Live GPS Tracking Map for Active Trips */}
                {isActive && (
                  <div className="pt-2">
                    <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2 flex items-center gap-1.5 font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Live Chauffeur GPS Telemetry
                    </div>
                    <LiveTripMap
                      pickup={trip.pickup}
                      dropoff={trip.dropoff}
                      driverId={trip.driverId}
                      reservationId={trip.reservationId}
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
          
          <div className="pt-4 space-y-2.5">
            {trips.length >= limitCount && (
              <button 
                onClick={() => setLimitCount(c => c + 10)}
                className="block w-full text-center bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 px-4 py-3 rounded-2xl text-xs font-semibold transition-all active:scale-95 min-h-[44px]"
              >
                Load Older Reservations
              </button>
            )}
            <Link 
              href="/book"
              className="flex items-center justify-center w-full bg-gold-gradient hover:brightness-110 text-neutral-950 px-5 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95 shadow-gold-sm min-h-[44px]"
            >
              <span>Book Another Executive Charter</span>
              <ArrowRight size={14} className="ml-2" />
            </Link>
          </div>
        </div>
      )}

      {/* Executive Tax Invoice & Itinerary Modal */}
      {selectedInvoiceTrip && (
        <ExecutiveInvoiceModal
          trip={selectedInvoiceTrip}
          isOpen={!!selectedInvoiceTrip}
          onClose={() => setSelectedInvoiceTrip(null)}
        />
      )}

      {/* Real-Time Concierge Chat Drawer */}
      {chatTrip && (
        <ReservationChatDrawer
          reservationId={chatTrip.reservationId}
          confirmationCode={chatTrip.confirmationCode}
          currentUserId={user?.uid}
          currentUserName={user?.displayName || "VIP Passenger"}
          currentUserRole="rider"
          isOpen={!!chatTrip}
          onClose={() => setChatTrip(null)}
        />
      )}

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
