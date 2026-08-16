"use client";
import { formatDateTime, formatMoney } from "@/lib/format";

import { useState, useEffect } from "react";
import { Reservation, Driver, Vehicle } from "@/lib/types";
import { X, User, MapPin, DollarSign, Clock, ShieldAlert, Plane, Zap, Sparkles, FileText, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase/client";
import RiderPreferencesView from "@/app/(admin)/components/RiderPreferencesView";
import LiveTripMap from "@/components/LiveTripMap";
import ExecutiveInvoiceModal from "@/components/ExecutiveInvoiceModal";
import ReservationChatDrawer from "@/components/ReservationChatDrawer";

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
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  
  const [selectedDriver, setSelectedDriver] = useState(reservation.driverId || preSelectedDriverId || "");
  const [selectedVehicle, setSelectedVehicle] = useState(reservation.vehicleId || "");
  
  const [overrideStatus, setOverrideStatus] = useState(reservation.status);
  const [overrideReason, setOverrideReason] = useState("");

  const [flightStatus, setFlightStatus] = useState<any>(reservation.flightStatus || null);
  const [loadingFlight, setLoadingFlight] = useState(false);
  const [loadingShift, setLoadingShift] = useState(false);
  const [shiftSuccess, setShiftSuccess] = useState<string | null>(null);

  // Affiliate Farm-Out State
  const [dispatchMode, setDispatchMode] = useState<"in_house" | "farm_out">(
    reservation.subcontractType === "farm_out" ? "farm_out" : "in_house"
  );
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState(reservation.affiliateId || "");
  const [farmOutPayoutOverride, setFarmOutPayoutOverride] = useState("");
  const [farmOutNotes, setFarmOutNotes] = useState(reservation.affiliateNotes || "");
  const [loadingFarmOut, setLoadingFarmOut] = useState(false);
  const [farmOutSuccess, setFarmOutSuccess] = useState<string | null>(null);

  const functions = getFunctions(app);
  const assignDriverAndVehicle = httpsCallable(functions, "assignDriverAndVehicle");
  const adminOverrideStatus = httpsCallable(functions, "adminOverrideStatus");
  const checkFlightStatus = httpsCallable(functions, "checkFlightStatus");
  const autoShiftPickupForFlight = httpsCallable(functions, "autoShiftPickupForFlight");
  const farmOutReservation = httpsCallable(functions, "farmOutReservation");

  useEffect(() => {
    const q = query(collection(db, "affiliates"));
    const unsub = onSnapshot(q, snap => {
      setAffiliates(snap.docs.map(d => ({ ...d.data(), affiliateId: d.id })));
    });
    return () => unsub();
  }, []);

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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-[#0a0a0e] text-white h-full shadow-2xl border-l border-neutral-800 flex flex-col animate-in fade-in slide-in-from-right duration-200 ease-out">
        
        <div className="flex justify-between items-center p-6 border-b border-neutral-800 bg-[#0e0e13]">
          <div>
            <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-accent font-mono mb-1">
              <Sparkles size={11} className="text-accent" /> Charter Telemetry
            </div>
            <h2 className="text-xl font-bold font-mono text-white tracking-tight">{reservation.confirmationCode}</h2>
            <div className="text-xs text-neutral-400">Booked by {reservation.bookedByAdmin ? "Operations Concierge" : "VIP Client"}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowChatDrawer(true)}
              className="px-3 py-2 bg-[#181822] hover:border-accent border border-neutral-700 text-neutral-200 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
              title="Open Live Concierge Chat"
            >
              <MessageSquare size={13} className="text-accent" />
              <span className="hidden sm:inline">Chat</span>
            </button>

            <button
              type="button"
              onClick={() => setShowInvoiceModal(true)}
              className="px-3 py-2 bg-[#181822] hover:border-accent border border-neutral-700 text-neutral-200 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
              title="Generate Executive Tax Invoice & Itinerary"
            >
              <FileText size={13} className="text-accent" />
              <span className="hidden sm:inline">Invoice / PDF</span>
            </button>

            <button 
              type="button"
              aria-label="Close reservation details drawer"
              onClick={onClose} 
              className="p-2.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
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
          <section className="bg-[#0e0e13] p-5 rounded-3xl border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-accent font-mono">Dispatch & Assignment</h3>
              <div className="flex bg-[#181822] p-1 rounded-xl text-xs font-bold border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setDispatchMode("in_house")}
                  className={`px-3 py-1.5 rounded-lg transition-all text-xs ${
                    dispatchMode === "in_house" ? "bg-gold-gradient text-neutral-950 shadow-gold-sm font-bold" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  In-House Fleet
                </button>
                <button
                  type="button"
                  onClick={() => setDispatchMode("farm_out")}
                  className={`px-3 py-1.5 rounded-lg transition-all text-xs ${
                    dispatchMode === "farm_out" ? "bg-gold-gradient text-neutral-950 shadow-gold-sm font-bold" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Farm-Out Partner
                </button>
              </div>
            </div>

            {reservation.subcontractType === "farm_out" && (
              <div className="p-3.5 bg-blue-950/40 border border-blue-800/60 rounded-2xl text-xs text-blue-300 space-y-1">
                <div className="font-bold flex items-center justify-between">
                  <span>Farmed Out to: {reservation.affiliateName}</span>
                  <span className="uppercase font-bold text-[10px] px-2 py-0.5 bg-blue-900/60 text-blue-300 rounded-full font-mono">
                    {reservation.affiliateStatus || "pending"}
                  </span>
                </div>
                <div>Agreed Partner Payout: ${((reservation.affiliatePayoutCents || 0) / 100).toFixed(2)}</div>
                {reservation.affiliateDriverName && (
                  <div className="pt-1 text-neutral-400">
                    Partner Driver: <span className="font-bold text-white">{reservation.affiliateDriverName}</span> ({reservation.affiliateDriverPhone}) - {reservation.affiliateVehicleDescription}
                  </div>
                )}
              </div>
            )}

            {dispatchMode === "in_house" ? (
              <div className="space-y-4">
                {reservation.requestedDriverId && (
                  <div className="text-xs font-bold text-amber-400 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/60 flex items-center font-mono">
                    <ShieldAlert size={14} className="mr-2 text-amber-400" /> 
                    Rider requested driver ID: {reservation.requestedDriverId}
                  </div>
                )}

                <div>
                  <label htmlFor="dispatch-select-driver" className="block text-xs font-bold text-neutral-400 mb-1 font-mono uppercase">In-House Driver</label>
                  <select 
                    id="dispatch-select-driver"
                    className="w-full border border-neutral-700 rounded-xl p-3 text-xs bg-[#181822] text-white focus:border-accent focus:outline-none"
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
                  <label htmlFor="dispatch-select-vehicle" className="block text-xs font-bold text-neutral-400 mb-1 font-mono uppercase">Vehicle</label>
                  <select 
                    id="dispatch-select-vehicle"
                    className="w-full border border-neutral-700 rounded-xl p-3 text-xs bg-[#181822] text-white focus:border-accent focus:outline-none"
                    value={selectedVehicle}
                    onChange={e => setSelectedVehicle(e.target.value)}
                  >
                    <option value="">-- Select Vehicle --</option>
                    {vehicles.map(v => (
                      <option key={v.vehicleId} value={v.vehicleId}>{v.make} {v.model} ({v.licensePlate})</option>
                    ))}
                  </select>
                </div>

                {assignError && (
                  <div className="text-xs font-bold text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-800/60">
                    {assignError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={loadingAssign || !selectedDriver || !selectedVehicle}
                  className="w-full min-h-[44px] py-3 bg-gold-gradient text-neutral-950 text-xs font-bold rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-gold-sm uppercase tracking-wider"
                >
                  {loadingAssign ? "Assigning..." : "Assign In-House Driver"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1 font-mono uppercase">Affiliate Partner</label>
                  <select
                    className="w-full border border-neutral-700 rounded-xl p-3 text-xs bg-[#181822] text-white focus:border-accent focus:outline-none"
                    value={selectedAffiliateId}
                    onChange={e => setSelectedAffiliateId(e.target.value)}
                  >
                    <option value="">-- Select Partner Carrier --</option>
                    {affiliates.map(a => (
                      <option key={a.affiliateId} value={a.affiliateId}>
                        {a.companyName} ({Math.round(a.defaultCommissionRate * 100)}% Payout) - {a.complianceStatus === "active_compliant" ? "✓ Insured" : "⚠ Non-Compliant"}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedAffiliateId && (
                  <div className="p-3 bg-[#181822] border border-neutral-800 rounded-xl text-xs space-y-1.5 font-mono">
                    {(() => {
                      const selectedAff = affiliates.find(a => a.affiliateId === selectedAffiliateId);
                      if (!selectedAff) return null;
                      const subtotal = reservation.pricing.subtotalCents / 100;
                      const payout = (subtotal * (selectedAff.defaultCommissionRate || 0.85)).toFixed(2);
                      const margin = (subtotal - Number(payout)).toFixed(2);
                      return (
                        <>
                          <div className="flex justify-between font-semibold text-neutral-300">
                            <span>Client Subtotal:</span>
                            <span>${subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-accent">
                            <span>Affiliate Payout ({Math.round(selectedAff.defaultCommissionRate * 100)}%):</span>
                            <span>${payout}</span>
                          </div>
                          <div className="flex justify-between font-bold text-emerald-400">
                            <span>Luxe Platform Margin:</span>
                            <span>${margin}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1 font-mono uppercase">Custom Payout Override ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Optional (defaults to partner commission %)"
                    value={farmOutPayoutOverride}
                    onChange={e => setFarmOutPayoutOverride(e.target.value)}
                    className="w-full border border-neutral-700 rounded-xl p-3 text-xs bg-[#181822] text-white focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1 font-mono uppercase">Special Partner Instructions</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. VIP client, please send black executive SUV"
                    value={farmOutNotes}
                    onChange={e => setFarmOutNotes(e.target.value)}
                    className="w-full border border-neutral-700 rounded-xl p-3 text-xs bg-[#181822] text-white focus:border-accent focus:outline-none resize-none"
                  />
                </div>

                {farmOutSuccess && (
                  <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 font-medium">
                    ✓ {farmOutSuccess}
                  </div>
                )}

                <button
                  type="button"
                  disabled={loadingFarmOut || !selectedAffiliateId}
                  onClick={async () => {
                    setLoadingFarmOut(true);
                    setFarmOutSuccess(null);
                    try {
                      const payoutCents = farmOutPayoutOverride ? Math.round(Number(farmOutPayoutOverride) * 100) : undefined;
                      await farmOutReservation({
                        reservationId: reservation.reservationId,
                        affiliateId: selectedAffiliateId,
                        payoutCentsOverride: payoutCents,
                        notes: farmOutNotes || null,
                      });
                      setFarmOutSuccess("Trip successfully farmed out to affiliate partner!");
                    } catch (e: any) {
                      alert("Error farming out reservation: " + e.message);
                    } finally {
                      setLoadingFarmOut(false);
                    }
                  }}
                  className="w-full min-h-[44px] py-3 bg-gold-gradient text-neutral-950 text-xs font-bold rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-gold-sm uppercase tracking-wider"
                >
                  {loadingFarmOut ? "Dispatching..." : "Dispatch to Affiliate Partner"}
                </button>
              </div>
            )}
          </section>

          {/* Pricing */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-accent font-mono mb-3 flex items-center">
              <DollarSign size={15} className="mr-1 text-accent" /> Pricing Breakdown
            </h3>
            <div className="bg-[#0e0e13] border border-neutral-800 rounded-2xl p-4 text-xs space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-neutral-400">Base Fare</span>
                <span className="font-semibold text-white">{formatMoney((reservation.pricing.lineItems.find((li: any) => li.code === "base_fare")?.amountCents || 0))}</span>
              </div>
              {reservation.pricing.lineItems.filter((li: any) => li.code !== "base_fare").map((s, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-neutral-400">{s.label}</span>
                  <span className="font-semibold text-white">{formatMoney(s.amountCents)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-neutral-800 pt-2 font-bold text-sm text-accent">
                <span>Estimated Total</span>
                <span>{formatMoney(reservation.pricing.estimatedTotalCents)}</span>
              </div>
              {reservation.paymentStatus === "authorized" && (
                <div className="text-xs text-emerald-400 font-semibold mt-2">
                  Authorized: {formatMoney(reservation.authorizedAmountCents)}
                </div>
              )}
            </div>
          </section>

          {/* History */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-accent font-mono mb-3 flex items-center">
              <Clock size={15} className="mr-1 text-accent" /> Telemetry History
            </h3>
            <div className="space-y-4 border-l-2 border-neutral-800 ml-2 pl-4">
              {events.map((ev, i) => {
                const date = typeof ev.createdAt?.toDate === "function" ? ev.createdAt.toDate() : new Date();
                return (
                  <div key={i} className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-accent border-2 border-[#0a0a0e]"></div>
                    <div className="text-xs font-bold text-white font-mono">{ev.status.toUpperCase()}</div>
                    <div className="text-[11px] text-neutral-400">{formatDateTime(date, reservation.timezone || "UTC")} • {ev.actor}</div>
                    {ev.reason && <div className="text-xs text-neutral-300 mt-1 italic">"{ev.reason}"</div>}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Admin Override */}
          <section className="bg-rose-950/20 p-5 rounded-2xl border border-rose-900/40">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-4 flex items-center font-mono">
              <ShieldAlert size={15} className="mr-1 text-rose-400" /> Admin Status Override
            </h3>
            <div className="space-y-3">
              <label htmlFor="dispatch-override-status" className="sr-only">Override Status</label>
              <select 
                id="dispatch-override-status"
                className="w-full border border-neutral-700 rounded-xl p-3 text-xs bg-[#181822] text-white focus:border-rose-500 focus:outline-none"
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
                className="w-full border border-neutral-700 rounded-xl p-3 text-xs bg-[#181822] text-white focus:border-rose-500 focus:outline-none"
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
              />
              <button 
                type="button"
                disabled={loadingOverride || !overrideReason}
                onClick={handleOverride}
                className="w-full min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-2.5 text-xs font-bold disabled:opacity-50 transition-all font-mono uppercase tracking-wider shadow-sm"
              >
                {loadingOverride ? "Overriding..." : "Force Status Change"}
              </button>
            </div>
          </section>

        </div>
      </div>

      {/* Executive Tax Invoice & Itinerary Modal */}
      {showInvoiceModal && (
        <ExecutiveInvoiceModal
          trip={reservation}
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}

      {/* Live Concierge Chat Drawer */}
      {showChatDrawer && (
        <ReservationChatDrawer
          reservationId={reservation.reservationId}
          confirmationCode={reservation.confirmationCode}
          currentUserId="admin-dispatch"
          currentUserName="Operations Dispatch"
          currentUserRole="admin"
          isOpen={showChatDrawer}
          onClose={() => setShowChatDrawer(false)}
        />
      )}
    </div>
  );
}
