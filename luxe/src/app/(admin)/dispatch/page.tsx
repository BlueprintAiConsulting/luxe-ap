
"use client";
import { formatDateTime } from "@/lib/format";

import { useAuth } from "@/lib/firebase/auth";
import { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Reservation, Driver, Vehicle } from "@/lib/types";
import { format, startOfDay, endOfDay, addDays, subDays } from "date-fns";
import { Calendar, AlertCircle } from "lucide-react";
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
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-neutral-50 text-neutral-900 font-sans relative">
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dispatch Board</h1>
          <p className="text-neutral-500 text-sm mt-1 font-medium">Manage and assign daily reservations.</p>
        </div>
        
        <div className="flex items-center space-x-4 bg-neutral-50 p-2 rounded-xl">
          <button onClick={handlePrevDay} className="px-3 py-2 hover:bg-neutral-100 rounded-lg font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">&larr;</button>
          <div className="flex items-center space-x-2 font-bold px-4">
            <Calendar size={18} className="text-neutral-500" />
            <span>{format(selectedDate, "EEE, MMM d, yyyy")}</span>
          </div>
          <button onClick={handleNextDay} className="px-3 py-2 hover:bg-neutral-100 rounded-lg font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">&rarr;</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Left Col: Unassigned Trips (25%) */}
        <div className="xl:col-span-1 flex flex-col h-[calc(100vh-160px)]">
          <h2 className="text-xl font-semibold text-brand flex items-center mb-4 flex-shrink-0">
            Needs Assignment
            <span className="ml-3 bg-neutral-200 text-neutral-700 text-xs px-2 py-0.5 rounded-full">{unassigned.length}</span>
          </h2>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-20">
            {loading && <div className="text-neutral-500">Loading...</div>}
            {!loading && unassigned.length === 0 && (
              <div className="p-6 bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-2xl text-center text-neutral-500 font-semibold">
                All trips assigned!
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
                className={`w-full text-left p-4 rounded-2xl border transition-all cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 ${
                  draggedResId === trip.reservationId ? "opacity-50 scale-95" : "opacity-100"
                } ${
                  trip.isUrgent 
                    ? "bg-white border-brand hover:border-brand" 
                    : "bg-white border-neutral-200 hover:border-neutral-300"
                }`}
                style={{ animationDelay: `${idx * 50}ms`, animationFillMode: "both" }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-lg">{formatDateTime(trip.dateObj, trip.timezone || "UTC")}</div>
                  {trip.isUrgent && (
                    <div className="flex items-center text-xs font-bold text-white bg-brand px-2 py-1 rounded">
                      <AlertCircle size={14} className="mr-1" /> URGENT
                    </div>
                  )}
                </div>
                <div className="font-semibold text-sm mb-1">{trip.riderName}</div>
                <div className="text-xs text-neutral-500 truncate">{trip.pickup.line1 || ""}</div>
                <div className="mt-3 text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-600 px-2 py-1 rounded w-max">
                  {trip.className}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Timeline (75%) */}
        <div className="xl:col-span-3 flex flex-col h-[calc(100vh-160px)]">
          <h2 className="text-xl font-semibold text-brand mb-4 flex-shrink-0">Timeline</h2>
          
          <div className="bg-white rounded-2xl border border-neutral-200 flex-1 flex flex-col overflow-hidden shadow-sm">
            {/* Timeline Header */}
            <div className="flex border-b border-neutral-200 bg-neutral-50">
              <div className="w-48 flex-shrink-0 border-r border-neutral-200 p-4 font-bold text-sm text-neutral-500 flex items-center bg-neutral-50">
                Chauffeurs
              </div>
              <div className="flex-1 relative overflow-hidden min-w-[800px]">
                <div className="absolute inset-0 flex">
                  {hours.map(h => (
                    <div key={h} className="flex-1 border-r border-neutral-200 last:border-r-0 relative">
                      <span className="absolute top-2 left-2 text-xs font-semibold text-neutral-400">
                        {h.toString().padStart(2, '0')}:00
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Timeline Body */}
            <div className="flex-1 overflow-y-auto">
              {drivers.length === 0 && !loading && (
                <div className="p-8 text-center text-neutral-500 font-semibold">No active drivers found.</div>
              )}
              {drivers.map(driver => {
                const driverTrips = timeline.filter(t => t.driverId === driver.driverId);
                
                return (
                  <div key={driver.driverId} className="flex border-b border-neutral-100 group min-h-[80px]">
                    <div className="w-48 flex-shrink-0 border-r border-neutral-200 p-4 bg-white z-10 flex flex-col justify-center">
                      <div className="font-bold text-sm truncate">{driver.displayName}</div>
                      <div className="text-xs text-neutral-500 mt-0.5">{driver.active ? "Active" : "Inactive"}</div>
                    </div>
                    
                    <div 
                      className="flex-1 relative min-w-[800px] bg-white transition-colors duration-200 hover:bg-neutral-50"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, driver.driverId)}
                    >
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {hours.map(h => (
                          <div key={h} className="flex-1 border-r border-neutral-100 border-dashed last:border-r-0"></div>
                        ))}
                      </div>

                      {/* Render assigned trips */}
                      {driverTrips.map(trip => {
                        const tripHour = trip.dateObj.getHours();
                        const tripMinute = trip.dateObj.getMinutes();
                        const startPercent = ((tripHour + tripMinute / 60) / 24) * 100;
                        // Estimate 2 hours for duration if dropoff isn't easily calculable
                        const durationHours = 2; 
                        const widthPercent = (durationHours / 24) * 100;
                        
                        let statusColor = "bg-neutral-800 text-white border-neutral-900";
                        if (trip.status === "completed") statusColor = "bg-neutral-200 text-neutral-600 border-neutral-300";
                        else if (trip.status === "cancelled" || trip.status === "no_show") statusColor = "bg-red-100 text-red-600 border-red-200 line-through opacity-70";
                        else if (trip.status === "onboard") statusColor = "bg-brand text-white border-neutral-900";
                        else if (trip.status === "arrived") statusColor = "bg-accent text-neutral-900 border-accent/80";
                        else if (trip.status === "en_route") statusColor = "bg-amber-400 text-amber-900 border-amber-500";

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
                            className={`absolute top-2 bottom-2 rounded-lg border p-2 text-xs font-semibold overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${statusColor}`}
                            style={{ 
                              left: `${startPercent}%`, 
                              width: `${widthPercent}%`,
                              minWidth: '80px'
                            }}
                            title={`${formatDateTime(trip.dateObj, trip.timezone || "UTC")} - ${trip.riderName}`}
                          >
                            <div className="truncate">{trip.riderName}</div>
                            <div className="truncate opacity-80 text-[10px] mt-0.5">{trip.pickup.line1}</div>
                            <div className="absolute bottom-1 right-2 text-[9px] font-bold uppercase opacity-60">
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
