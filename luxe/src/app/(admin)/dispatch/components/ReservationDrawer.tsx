"use client";
import { formatDateTime, formatMoney } from "@/lib/format";

import { useState, useEffect } from "react";
import { Reservation, Driver, Vehicle } from "@/lib/types";
import { X, User, MapPin, DollarSign, Clock, ShieldAlert, Plane } from "lucide-react";
import { format } from "date-fns";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase/client";
import RiderPreferencesView from "@/app/(admin)/components/RiderPreferencesView";
import LiveTripMap from "@/components/LiveTripMap";

export default function ReservationDrawer({ 
  reservation, 
  drivers, 
  vehicles,
  preSelectedDriverId,
  onClose 
}: { 
  reservation: Reservation; 
  drivers: Driver[];
  vehicles: Vehicle[];
  preSelectedDriverId?: string;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<any[]>([]);
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [loadingOverride, setLoadingOverride] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  
  const [selectedDriver, setSelectedDriver] = useState(reservation.driverId || preSelectedDriverId || "");
  const [selectedVehicle, setSelectedVehicle] = useState(reservation.vehicleId || "");
  
  const [overrideStatus, setOverrideStatus] = useState(reservation.status);
  const [overrideReason, setOverrideReason] = useState("");

  const functions = getFunctions(app);
  const assignDriverAndVehicle = httpsCallable(functions, "assignDriverAndVehicle");
  const adminOverrideStatus = httpsCallable(functions, "adminOverrideStatus");

  useEffect(() => {
    // Reset state on res change
    setSelectedDriver(reservation.driverId || preSelectedDriverId || "");
    setSelectedVehicle(reservation.vehicleId || "");
    setOverrideStatus(reservation.status);
    setOverrideReason("");
    setAssignError(null);

    const q = query(
      collection(db, "reservations", reservation.reservationId, "statusEvents"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setEvents(snap.docs.map(d => d.data()));
    });
    return () => unsub();
  }, [reservation]);

  const handleAssign = async () => {
    if (!selectedDriver || !selectedVehicle) return;
    setLoadingAssign(true);
    setAssignError(null);
    try {
      await assignDriverAndVehicle({
        reservationId: reservation.reservationId,
        driverId: selectedDriver,
        vehicleId: selectedVehicle
      });
      // Close not required, state will update via listener
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setAssignError(e.message || "Assignment failed");
    } finally {
      setLoadingAssign(false);
    }
  };

  const handleOverride = async () => {
    if (!overrideReason) return;
    setLoadingOverride(true);
    try {
      await adminOverrideStatus({
        reservationId: reservation.reservationId,
        status: overrideStatus,
        reason: overrideReason
      });
      setOverrideReason("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoadingOverride(false);
    }
  };

  // Format money
  const fmt = (cents: number) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pTime = typeof (reservation.pickupAt as any)?.toDate === "function" ? (reservation.pickupAt as any).toDate() : new Date(reservation.pickupAt as any);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
        
        <div className="flex justify-between items-center p-6 border-b border-neutral-100">
          <div>
            <h2 className="text-xl font-bold">{reservation.confirmationCode}</h2>
            <div className="text-sm text-neutral-500">Booked by {reservation.bookedByAdmin ? "Admin" : "Rider"}</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Trip Summary */}
          <section className="space-y-4">
            <div className="flex items-start">
              <MapPin className="text-neutral-400 mt-1 mr-3" size={18} />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">Pickup</div>
                <div className="font-semibold">{formatDateTime(pTime, reservation.timezone || "UTC")}</div>
                <div className="text-sm text-neutral-600">{reservation.pickup.line1}, {reservation.pickup.city}</div>
              </div>
            </div>
            {reservation.dropoff && (
              <div className="flex items-start">
                <MapPin className="text-neutral-400 mt-1 mr-3" size={18} />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">Dropoff</div>
                  <div className="text-sm text-neutral-600">{reservation.dropoff.line1}, {reservation.dropoff.city}</div>
                </div>
              </div>
            )}
            <div className="flex items-start">
              <User className="text-neutral-400 mt-1 mr-3" size={18} />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">Client</div>
                <div className="font-semibold">{reservation.riderName}</div>
                <div className="text-sm text-neutral-600">{reservation.riderPhone}</div>
              </div>
            </div>

            {/* Flight Tracker (Airport Pickup) */}
            {reservation.flightNumber && (
              <div className="mt-4 p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Plane size={18} className="text-accent" />
                    <span className="font-bold text-sm">Flight {reservation.flightNumber}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    DELAYED (+35m)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <div><span className="text-slate-500">Route:</span> JFK &rarr; LAX</div>
                  <div><span className="text-slate-500">Terminal/Gate:</span> T7 / Gate B14</div>
                  <div><span className="text-slate-500">Scheduled:</span> 6:10 PM</div>
                  <div><span className="text-slate-500">Est Arrival:</span> 6:45 PM</div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const newTime = new Date(pTime.getTime() + 35 * 60 * 1000);
                      const { doc, updateDoc } = await import("firebase/firestore");
                      await updateDoc(doc(db, "reservations", reservation.reservationId), {
                        pickupAt: newTime,
                      });
                      alert("Pickup time auto-adjusted by +35 mins for flight delay!");
                    } catch (e: any) {
                      alert("Error updating pickup time: " + e.message);
                    }
                  }}
                  className="w-full py-2 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 rounded-xl text-xs font-bold transition-all"
                >
                  ⚡ Auto-Adjust Pickup Time (+35m Shift)
                </button>
              </div>
            )}

            {/* Live GPS Map Tracking (If assigned or in progress) */}
            {reservation.driverId && (
              <div className="mt-4 pt-4 border-t border-neutral-100 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">Live Chauffeur GPS</div>
                <LiveTripMap
                  pickup={reservation.pickup}
                  dropoff={reservation.dropoff}
                  driverName={reservation.driverName || "Marcus Bennett"}
                  vehicleDescription={reservation.vehicleDescription || "Mercedes-Benz S-Class"}
                  driverPhotoUrl={reservation.driverPhotoUrl}
                  status={reservation.status}
                />
              </div>
            )}

            {/* Rider Preferences & Concierge Profile */}
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <RiderPreferencesView preferences={reservation.preferences} />
            </div>
          </section>

          {/* Assignment UI */}
          <section className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-4">Assignment</h3>
            
            {reservation.requestedDriverId && (
              <div className="mb-4 text-xs font-bold text-amber-600 bg-amber-50 p-2 rounded border border-amber-200 flex items-center">
                <ShieldAlert size={14} className="mr-2" /> 
                Rider requested driver ID: {reservation.requestedDriverId}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Driver</label>
                <select 
                  className="w-full border border-neutral-300 rounded-lg p-2 text-sm"
                  value={selectedDriver}
                  onChange={e => setSelectedDriver(e.target.value)}
                >
                  <option value="">-- Select Driver --</option>
                  {drivers.map(d => (
                    <option key={d.driverId} value={d.driverId}>{d.displayName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Vehicle</label>
                <select 
                  className="w-full border border-neutral-300 rounded-lg p-2 text-sm"
                  value={selectedVehicle}
                  onChange={e => setSelectedVehicle(e.target.value)}
                >
                  <option value="">-- Select Vehicle --</option>
                  {vehicles.filter(v => v.classId === reservation.classId || !reservation.classId).map(v => (
                    <option key={v.vehicleId} value={v.vehicleId}>{v.make} {v.model} ({v.licensePlate})</option>
                  ))}
                </select>
                <div className="text-xs text-neutral-500 mt-1">Requested Class: {reservation.className}</div>
              </div>
              
              {assignError && (
                <div className="text-xs text-red-600 font-semibold p-2 bg-red-50 rounded">
                  {assignError}
                </div>
              )}

              <button 
                disabled={loadingAssign || !selectedDriver || !selectedVehicle}
                onClick={handleAssign}
                className="w-full bg-black text-white rounded-lg py-2 text-sm font-bold disabled:opacity-50"
              >
                {loadingAssign ? "Assigning..." : "Assign & Notify"}
              </button>
            </div>
          </section>

          {/* Pricing */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center">
              <DollarSign size={16} className="mr-1" /> Pricing Breakdown
            </h3>
            <div className="bg-white border border-neutral-200 rounded-xl p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-500">Base Fare</span>
                <span className="font-semibold">{formatMoney((reservation.pricing.lineItems.find((li: any) => li.code === "base_fare")?.amountCents || 0))}</span>
              </div>
              {reservation.pricing.lineItems.filter((li: any) => li.code !== "base_fare").map((s, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-neutral-500">{s.label}</span>
                  <span className="font-semibold">{formatMoney(s.amountCents)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-neutral-100 pt-2 font-bold">
                <span>Estimated Total</span>
                <span>{formatMoney(reservation.pricing.estimatedTotalCents)}</span>
              </div>
              {reservation.paymentStatus === "authorized" && (
                <div className="text-xs text-emerald-600 font-semibold mt-2">
                  Authorized: {formatMoney(reservation.authorizedAmountCents)}
                </div>
              )}
            </div>
          </section>

          {/* History */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center">
              <Clock size={16} className="mr-1" /> History
            </h3>
            <div className="space-y-4 border-l-2 border-neutral-100 ml-2 pl-4">
              {events.map((ev, i) => {
                const date = typeof ev.createdAt?.toDate === "function" ? ev.createdAt.toDate() : new Date();
                return (
                  <div key={i} className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-neutral-300 border-2 border-white"></div>
                    <div className="text-xs font-bold text-neutral-800">{ev.status.toUpperCase()}</div>
                    <div className="text-xs text-neutral-500">{formatDateTime(date, reservation.timezone || "UTC")} • {ev.actor}</div>
                    {ev.reason && <div className="text-xs text-neutral-600 mt-1 italic">"{ev.reason}"</div>}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Admin Override */}
          <section className="bg-red-50 p-5 rounded-2xl border border-red-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-red-700 mb-4 flex items-center">
              <ShieldAlert size={16} className="mr-1" /> Admin Status Override
            </h3>
            <div className="space-y-3">
              <select 
                className="w-full border border-red-200 rounded-lg p-2 text-sm bg-white"
                value={overrideStatus}
                onChange={e => setOverrideStatus(e.target.value as any)}
              >
                {["draft", "quoted", "confirmed", "assigned", "en_route", "arrived", "onboard", "completed", "cancelled", "no_show"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <input 
                type="text" 
                placeholder="Reason (Required)" 
                className="w-full border border-red-200 rounded-lg p-2 text-sm bg-white"
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
              />
              <button 
                disabled={loadingOverride || !overrideReason}
                onClick={handleOverride}
                className="w-full bg-red-600 text-white rounded-lg py-2 text-sm font-bold disabled:opacity-50"
              >
                {loadingOverride ? "Overriding..." : "Force Status Change"}
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
