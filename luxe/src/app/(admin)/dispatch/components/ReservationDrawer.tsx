"use client";
import { formatDateTime, formatMoney } from "@/lib/format";

import { useState, useEffect } from "react";
import { Reservation, Driver, Vehicle } from "@/lib/types";
import { X, User, MapPin, DollarSign, Clock, ShieldAlert, Plane, Zap } from "lucide-react";
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

  const [flightStatus, setFlightStatus] = useState<any>(reservation.flightStatus || null);
  const [loadingFlight, setLoadingFlight] = useState(false);
  const [loadingShift, setLoadingShift] = useState(false);
  const [shiftSuccess, setShiftSuccess] = useState<string | null>(null);

  const functions = getFunctions(app);
  const assignDriverAndVehicle = httpsCallable(functions, "assignDriverAndVehicle");
  const adminOverrideStatus = httpsCallable(functions, "adminOverrideStatus");
  const checkFlightStatus = httpsCallable(functions, "checkFlightStatus");
  const autoShiftPickupForFlight = httpsCallable(functions, "autoShiftPickupForFlight");

  useEffect(() => {
    if (reservation.flightNumber && !flightStatus) {
      setLoadingFlight(true);
      checkFlightStatus({ flightNumber: reservation.flightNumber })
        .then((res: any) => {
          setFlightStatus(res.data);
        })
        .catch((err) => console.warn("Failed to fetch flight status:", err))
        .finally(() => setLoadingFlight(false));
    }
  }, [reservation.flightNumber]);

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
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in fade-in slide-in-from-right duration-200 ease-out">
        
        <div className="flex justify-between items-center p-6 border-b border-neutral-100">
          <div>
            <h2 className="text-xl font-bold">{reservation.confirmationCode}</h2>
            <div className="text-sm text-neutral-500">Booked by {reservation.bookedByAdmin ? "Admin" : "Rider"}</div>
          </div>
          <button 
            type="button"
            aria-label="Close reservation details drawer"
            onClick={onClose} 
            className="p-2 hover:bg-neutral-100 rounded-full"
          >
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
              <div className="mt-4 p-5 bg-slate-900 text-white rounded-3xl border border-slate-800 space-y-4 shadow-md">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                      <Plane size={16} className="text-accent" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">Flight {reservation.flightNumber}</div>
                      <div className="text-[11px] text-slate-400 font-medium">{flightStatus?.airline || "Commercial Airline"}</div>
                    </div>
                  </div>
                  {flightStatus ? (
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                      flightStatus.delayMinutes > 0
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        : flightStatus.status === "landed"
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                        : flightStatus.status === "active"
                        ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    }`}>
                      {flightStatus.delayMinutes > 0 ? `DELAYED (+${flightStatus.delayMinutes}m)` : flightStatus.status}
                    </span>
                  ) : loadingFlight ? (
                    <span className="text-xs text-slate-400 animate-pulse">Checking flight...</span>
                  ) : null}
                </div>

                {flightStatus && (
                  <div className="grid grid-cols-2 gap-2.5 text-xs bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
                    <div>
                      <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Route</span>
                      <span className="font-semibold text-slate-200">{flightStatus.origin} ({flightStatus.originCity}) &rarr; {flightStatus.destination}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Terminal / Gate</span>
                      <span className="font-semibold text-slate-200">{flightStatus.terminal || "TBD"} / {flightStatus.gate || "TBD"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Scheduled Touchdown</span>
                      <span className="font-semibold text-slate-200">
                        {flightStatus.scheduledArrival ? new Date(flightStatus.scheduledArrival).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "On schedule"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Est Touchdown</span>
                      <span className={`font-semibold ${flightStatus.delayMinutes > 0 ? "text-amber-400 font-bold" : "text-emerald-400"}`}>
                        {flightStatus.estimatedArrival ? new Date(flightStatus.estimatedArrival).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "On schedule"}
                      </span>
                    </div>
                  </div>
                )}

                {shiftSuccess && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 font-medium text-center">
                    ✓ {shiftSuccess}
                  </div>
                )}

                <div className="flex gap-2">
                  {flightStatus && flightStatus.delayMinutes > 0 && (
                    <button
                      type="button"
                      disabled={loadingShift}
                      onClick={async () => {
                        setLoadingShift(true);
                        setShiftSuccess(null);
                        try {
                          await autoShiftPickupForFlight({
                            reservationId: reservation.reservationId,
                            shiftMinutes: flightStatus.delayMinutes,
                            reason: `Flight delay auto-adjusted (+${flightStatus.delayMinutes}m shift)`
                          });
                          setShiftSuccess(`Pickup adjusted by +${flightStatus.delayMinutes} mins!`);
                        } catch (e: any) {
                          alert("Error shifting pickup time: " + e.message);
                        } finally {
                          setLoadingShift(false);
                        }
                      }}
                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Zap size={14} /> {loadingShift ? "Shifting..." : `Auto-Shift Pickup (+${flightStatus.delayMinutes}m)`}
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={loadingFlight}
                    onClick={async () => {
                      setLoadingFlight(true);
                      setShiftSuccess(null);
                      try {
                        const res: any = await checkFlightStatus({ flightNumber: reservation.flightNumber! });
                        setFlightStatus(res.data);
                      } catch (e: any) {
                        alert("Error refreshing flight: " + e.message);
                      } finally {
                        setLoadingFlight(false);
                      }
                    }}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
                  >
                    {loadingFlight ? "Syncing..." : "Refresh"}
                  </button>
                </div>
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
                <label htmlFor="dispatch-select-driver" className="block text-xs font-bold text-neutral-700 mb-1">Driver</label>
                <select 
                  id="dispatch-select-driver"
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
                <label htmlFor="dispatch-select-vehicle" className="block text-xs font-bold text-neutral-700 mb-1">Vehicle</label>
                <select 
                  id="dispatch-select-vehicle"
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
              <label htmlFor="dispatch-override-status" className="sr-only">Override Status</label>
              <select 
                id="dispatch-override-status"
                className="w-full border border-red-200 rounded-lg p-2 text-sm bg-white"
                value={overrideStatus}
                onChange={e => setOverrideStatus(e.target.value as any)}
              >
                {["draft", "quoted", "confirmed", "assigned", "en_route", "arrived", "onboard", "completed", "cancelled", "no_show"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <label htmlFor="dispatch-override-reason" className="sr-only">Override Reason</label>
              <input 
                id="dispatch-override-reason"
                type="text" 
                placeholder="Reason (Required)" 
                className="w-full border border-red-200 rounded-lg p-2 text-sm bg-white"
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
              />
              <button 
                type="button"
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
