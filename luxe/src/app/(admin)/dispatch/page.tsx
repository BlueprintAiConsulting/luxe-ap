
"use client";
import { formatDateTime } from "@/lib/format";

import { useAuth } from "@/lib/firebase/auth";
import { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Reservation, Driver, Vehicle } from "@/lib/types";
import { format, startOfDay, endOfDay, addDays, subDays } from "date-fns";
import { Calendar, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";
import ReservationDrawer from "./components/ReservationDrawer";

export default function DispatchPage() {
  const { user, role } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  // Load active drivers and vehicles
  useEffect(() => {
    async function loadFleet() {
      const drvQuery = query(collection(db, "drivers"), where("active", "==", true));
      const drvSnap = await getDocs(drvQuery);
      setDrivers(drvSnap.docs.map(d => d.data() as Driver));

      const vehQuery = query(collection(db, "vehicles"));
      const vehSnap = await getDocs(vehQuery);
      setVehicles(vehSnap.docs.map(d => d.data() as Vehicle));
    }
    loadFleet();
  }, []);

  // Listen to reservations for the selected day
  useEffect(() => {
    if (!user || role !== "admin") return;
    // setLoading(true); -> we don't strictly need to do this here if it causes a lint error, or we can just rely on the existing snapshot to update loading state inside the callback.
    
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);

    const q = query(
      collection(db, "reservations"),
      where("pickupAt", ">=", dayStart),
      where("pickupAt", "<=", dayEnd),
      orderBy("pickupAt", "asc"),
      limit(200)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const res: Reservation[] = [];
      snapshot.forEach(doc => res.push(doc.data() as Reservation));
      setReservations(res);
      setLoading(false);
      
      // Update selected if it was modified
      setSelectedReservation(prev => {
        if (!prev) return null;
        const updated = res.find(r => r.reservationId === prev.reservationId);
        return updated || prev;
      });
    });

    return () => unsubscribe();
  }, [user, role, selectedDate]);

  const handlePrevDay = () => setSelectedDate(prev => subDays(prev, 1));
  const handleNextDay = () => setSelectedDate(prev => addDays(prev, 1));

  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Sort and separate unassigned vs assigned
  const { unassigned, timeline } = useMemo(() => {
    const un = [];
    const tl = [];
    for (const r of reservations) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pTime = typeof (r.pickupAt as any)?.toDate === "function" ? (r.pickupAt as any).toDate() : new Date(r.pickupAt as any);
      
      if (r.status === "confirmed" && !r.driverId) {
        // Unassigned - check urgency (within 4 hours)
        const isUrgent = pTime.getTime() - currentTime < (4 * 60 * 60 * 1000);
        un.push({ ...r, isUrgent, dateObj: pTime });
      } else {
        tl.push({ ...r, dateObj: pTime });
      }
    }
    return { unassigned: un, timeline: tl };
  }, [reservations, currentTime]);

  const [draggedResId, setDraggedResId] = useState<string | null>(null);
  const [preSelectedDriverId, setPreSelectedDriverId] = useState<string | undefined>();

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, reservationId: string) => {
    e.dataTransfer.setData("reservationId", reservationId);
    setDraggedResId(reservationId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedResId(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, driverId: string) => {
    e.preventDefault();
    const reservationId = e.dataTransfer.getData("reservationId");
    if (!reservationId) return;
    
    // Find the reservation and open the drawer with the driver preselected
    const res = unassigned.find(r => r.reservationId === reservationId) || timeline.find(r => r.reservationId === reservationId);
    if (res) {
      setPreSelectedDriverId(driverId);
      setSelectedReservation(res as Reservation);
    }
    setDraggedResId(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  if (role !== "admin") {
    return <div className="p-8 text-red-500">Access Denied</div>;
  }

  // Calculate timeline bounds
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="p-4 sm:p-8 max-w-[1600px] mx-auto min-h-screen bg-[#060608] text-white font-sans relative">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-[10px] font-bold uppercase tracking-widest mb-1.5 font-mono shadow-gold-sm">
            <Sparkles size={11} className="text-accent" /> Dispatch Control
          </div>
          <h1 className="text-3xl font-bold font-serif text-white tracking-tight">Dispatch Board</h1>
          <p className="text-neutral-400 text-xs sm:text-sm mt-0.5 font-medium">Manage and assign daily reservations across the active chauffeur fleet.</p>
        </div>
        
        <div className="flex items-center space-x-2 bg-[#0e0e13] border border-neutral-800 p-1.5 rounded-2xl shadow-gold-sm self-start sm:self-auto">
          <button 
            onClick={handlePrevDay} 
            aria-label="Previous day"
            className="min-h-[44px] min-w-[44px] px-3 py-2 bg-neutral-900 border border-neutral-800 hover:border-accent/40 text-accent hover:text-white rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center"
          >
            &larr;
          </button>
          <div className="flex items-center space-x-2 font-bold px-3 text-xs sm:text-sm font-mono text-white">
            <Calendar size={16} className="text-accent" />
            <span>{format(selectedDate, "EEE, MMM d, yyyy")}</span>
          </div>
          <button 
            onClick={handleNextDay} 
            aria-label="Next day"
            className="min-h-[44px] min-w-[44px] px-3 py-2 bg-neutral-900 border border-neutral-800 hover:border-accent/40 text-accent hover:text-white rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center"
          >
            &rarr;
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Left Col: Unassigned Trips (25%) */}
        <div className="xl:col-span-1 flex flex-col h-[calc(100vh-160px)]">
          <h2 className="text-lg font-bold font-serif text-white flex items-center mb-4 flex-shrink-0">
            Needs Assignment
            <span className="ml-3 bg-accent/20 border border-accent/40 text-accent font-mono text-xs px-2.5 py-0.5 rounded-full font-bold">{unassigned.length}</span>
          </h2>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-20 no-scrollbar">
            {loading && <div className="text-neutral-400 text-xs font-mono">Loading telemetry...</div>}
            {!loading && unassigned.length === 0 && (
              <div className="p-6 bg-[#0e0e13]/80 border-2 border-dashed border-neutral-800 rounded-3xl text-center text-neutral-400 text-xs font-semibold space-y-2">
                <CheckCircle2 size={24} className="text-emerald-400 mx-auto" />
                <p>All active charters assigned!</p>
              </div>
            )}

            {unassigned.map((trip, idx) => (
              <div
                key={trip.reservationId}
                draggable
                onDragStart={(e) => handleDragStart(e, trip.reservationId)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                  setPreSelectedDriverId(undefined);
                  setSelectedReservation(trip as Reservation);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPreSelectedDriverId(undefined);
                    setSelectedReservation(trip as Reservation);
                  }
                }}
                tabIndex={0}
                className={`w-full text-left p-4 rounded-2xl border transition-all cursor-grab active:cursor-grabbing shadow-lg hover:border-accent/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 ${
                  draggedResId === trip.reservationId ? "opacity-50 scale-95" : "opacity-100"
                } ${
                  trip.isUrgent 
                    ? "bg-[#14141c] border-amber-400/80 shadow-gold-sm" 
                    : "bg-[#0e0e13] border-neutral-800"
                }`}
                style={{ animationDelay: `${idx * 50}ms`, animationFillMode: "both" }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-base text-white font-mono">{formatDateTime(trip.dateObj, trip.timezone || "UTC")}</div>
                  {trip.isUrgent && (
                    <div className="flex items-center text-[10px] font-bold text-neutral-950 bg-gold-gradient px-2 py-0.5 rounded font-mono shadow-gold-sm">
                      <AlertCircle size={12} className="mr-1 text-neutral-950" /> URGENT
                    </div>
                  )}
                </div>
                <div className="font-bold text-sm text-white mb-1">{trip.riderName}</div>
                <div className="text-xs text-neutral-400 truncate">{trip.pickup.line1 || ""}</div>
                <div className="mt-3 text-[10px] font-bold uppercase tracking-wider bg-neutral-900 border border-neutral-800 text-accent px-2.5 py-1 rounded-lg w-max font-mono">
                  {trip.className}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Timeline (75%) */}
        <div className="xl:col-span-3 flex flex-col h-[calc(100vh-160px)]">
          <h2 className="text-lg font-bold font-serif text-white mb-4 flex-shrink-0">Fleet Timeline Matrix</h2>
          
          <div className="bg-[#0e0e13] rounded-3xl border border-neutral-800 flex-1 flex flex-col overflow-hidden shadow-2xl">
            {/* Timeline Header */}
            <div className="flex border-b border-neutral-800 bg-[#0a0a0e]">
              <div className="w-48 flex-shrink-0 border-r border-neutral-800 p-4 font-bold text-xs uppercase tracking-wider text-neutral-400 flex items-center bg-[#0a0a0e]">
                Chauffeurs
              </div>
              <div className="flex-1 relative overflow-hidden min-w-[800px]">
                <div className="absolute inset-0 flex">
                  {hours.map(h => (
                    <div key={h} className="flex-1 border-r border-neutral-800/60 last:border-r-0 relative">
                      <span className="absolute top-2 left-2 text-[10px] font-bold font-mono text-neutral-500">
                        {h.toString().padStart(2, '0')}:00
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Timeline Body */}
            <div className="flex-1 overflow-y-auto overflow-x-auto no-scrollbar">
              {drivers.length === 0 && !loading && (
                <div className="p-8 text-center text-neutral-400 text-xs font-semibold">No active drivers found.</div>
              )}
              {drivers.map(driver => {
                const driverTrips = timeline.filter(t => t.driverId === driver.driverId);
                
                return (
                  <div key={driver.driverId} className="flex border-b border-neutral-800/80 group min-h-[80px]">
                    <div className="w-48 flex-shrink-0 border-r border-neutral-800 p-4 bg-[#0a0a0e] z-10 flex flex-col justify-center">
                      <div className="font-bold text-sm text-white truncate">{driver.displayName}</div>
                      <div className="text-[11px] text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {driver.active ? "Active Duty" : "Off Duty"}
                      </div>
                    </div>
                    
                    <div 
                      className="flex-1 relative min-w-[800px] bg-[#0e0e13] transition-colors duration-200 hover:bg-[#121218]"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, driver.driverId)}
                    >
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {hours.map(h => (
                          <div key={h} className="flex-1 border-r border-neutral-800/40 border-dashed last:border-r-0"></div>
                        ))}
                      </div>

                      {/* Render assigned trips */}
                      {driverTrips.map(trip => {
                        const tripHour = trip.dateObj.getHours();
                        const tripMinute = trip.dateObj.getMinutes();
                        const startPercent = ((tripHour + tripMinute / 60) / 24) * 100;
                        const durationHours = 2; 
                        const widthPercent = (durationHours / 24) * 100;
                        
                        let statusColor = "bg-[#181822] text-white border-neutral-700";
                        if (trip.status === "completed") statusColor = "bg-neutral-900/80 text-neutral-400 border-neutral-800";
                        else if (trip.status === "cancelled" || trip.status === "no_show") statusColor = "bg-red-950/40 text-red-400 border-red-900/40 line-through opacity-70";
                        else if (trip.status === "onboard") statusColor = "bg-emerald-950/60 text-emerald-300 border-emerald-500/40";
                        else if (trip.status === "arrived") statusColor = "bg-accent/20 text-accent border-accent/50 shadow-gold-sm";
                        else if (trip.status === "en_route") statusColor = "bg-amber-950/60 text-amber-300 border-amber-500/40";

                        return (
                          <div
                            key={trip.reservationId}
                            onClick={() => {
                              setPreSelectedDriverId(undefined);
                              setSelectedReservation(trip as Reservation);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setPreSelectedDriverId(undefined);
                                setSelectedReservation(trip as Reservation);
                              }
                            }}
                            tabIndex={0}
                            className={`absolute top-2 bottom-2 rounded-xl border p-2 text-xs font-semibold overflow-hidden shadow-md hover:shadow-gold-sm hover:-translate-y-0.5 transition-all cursor-pointer z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${statusColor}`}
                            style={{ 
                              left: `${startPercent}%`, 
                              width: `${widthPercent}%`,
                              minWidth: '80px'
                            }}
                            title={`${formatDateTime(trip.dateObj, trip.timezone || "UTC")} - ${trip.riderName}`}
                          >
                            <div className="truncate font-bold">{trip.riderName}</div>
                            <div className="truncate opacity-80 text-[10px] mt-0.5">{trip.pickup.line1}</div>
                            <div className="absolute bottom-1 right-2 text-[9px] font-bold uppercase font-mono opacity-80">
                              {trip.status.replace(/_/g, " ")}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Drawer */}
      {selectedReservation && (
        <ReservationDrawer 
          reservation={selectedReservation} 
          drivers={drivers}
          vehicles={vehicles}
          preSelectedDriverId={preSelectedDriverId}
          onClose={() => setSelectedReservation(null)} 
        />
      )}

    </div>
  );
}
