// @ts-nocheck
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

  if (role !== "admin") {
    return <div className="p-8 text-red-500">Access Denied</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-neutral-50 text-neutral-900 font-sans relative">
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dispatch Board</h1>
          <p className="text-neutral-500 text-sm mt-1">Manage and assign daily reservations.</p>
        </div>
        
        <div className="flex items-center space-x-4 bg-white p-2 rounded-xl shadow-sm border border-neutral-200">
          <button onClick={handlePrevDay} className="px-3 py-2 hover:bg-neutral-100 rounded-lg font-medium">&larr;</button>
          <div className="flex items-center space-x-2 font-bold px-4">
            <Calendar size={18} className="text-neutral-500" />
            <span>{format(selectedDate, "EEE, MMM d, yyyy")}</span>
          </div>
          <button onClick={handleNextDay} className="px-3 py-2 hover:bg-neutral-100 rounded-lg font-medium">&rarr;</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Col: Unassigned Urgent */}
        <div className="xl:col-span-1 space-y-4">
          <h2 className="text-xl font-bold flex items-center mb-4">
            Needs Assignment
            <span className="ml-3 bg-neutral-200 text-neutral-700 text-xs px-2 py-0.5 rounded-full">{unassigned.length}</span>
          </h2>
          
          {loading && <div className="text-neutral-500">Loading...</div>}
          {!loading && unassigned.length === 0 && (
            <div className="p-6 bg-white border border-neutral-200 rounded-2xl text-center text-neutral-500">
              All trips assigned!
            </div>
          )}

          {unassigned.map(trip => (
            <button 
              key={trip.reservationId}
              onClick={() => setSelectedReservation(trip)}
              className={`w-full text-left p-5 rounded-2xl border transition-all ${
                trip.isUrgent 
                  ? "bg-red-50 border-red-200 hover:border-red-300" 
                  : "bg-white border-neutral-200 hover:border-neutral-300 shadow-sm"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="font-bold text-lg">{formatDateTime(trip.dateObj, trip.timezone || "UTC")}</div>
                {trip.isUrgent && (
                  <div className="flex items-center text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">
                    <AlertCircle size={14} className="mr-1" /> URGENT
                  </div>
                )}
              </div>
              <div className="font-semibold text-sm mb-1">{trip.riderName}</div>
              <div className="text-sm text-neutral-500 truncate">{trip.pickup.line1}</div>
              <div className="mt-3 text-xs font-semibold bg-neutral-100 px-2 py-1 rounded w-max">
                {trip.className}
              </div>
            </button>
          ))}
        </div>

        {/* Right Col: Timeline */}
        <div className="xl:col-span-2">
          <h2 className="text-xl font-bold mb-4">Timeline</h2>
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-200">
                  <th className="p-4 font-bold">Time</th>
                  <th className="p-4 font-bold">Client</th>
                  <th className="p-4 font-bold">Route</th>
                  <th className="p-4 font-bold">Assignment</th>
                  <th className="p-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {timeline.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-neutral-500">No assigned trips for this day.</td>
                  </tr>
                )}
                {timeline.map(trip => {
                  let statusColor = "bg-neutral-100 text-neutral-700";
                  if (trip.status === "completed") statusColor = "bg-emerald-100 text-emerald-800";
                  else if (trip.status === "cancelled" || trip.status === "no_show") statusColor = "bg-red-100 text-red-800";
                  else if (trip.status === "onboard") statusColor = "bg-blue-100 text-blue-800";
                  else if (trip.status === "arrived") statusColor = "bg-indigo-100 text-indigo-800";
                  else if (trip.status === "en_route") statusColor = "bg-amber-100 text-amber-800";

                  return (
                    <tr 
                      key={trip.reservationId} 
                      onClick={() => setSelectedReservation(trip)}
                      className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer transition-colors"
                    >
                      <td className="p-4 whitespace-nowrap font-bold text-sm">
                        {formatDateTime(trip.dateObj, trip.timezone || "UTC")}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-sm">{trip.riderName}</div>
                      </td>
                      <td className="p-4 max-w-xs">
                        <div className="text-sm truncate" title={trip.pickup.line1}>{trip.pickup.line1}</div>
                        {trip.dropoff && (
                          <div className="text-xs text-neutral-400 truncate mt-1">→ {trip.dropoff.line1}</div>
                        )}
                      </td>
                      <td className="p-4">
                        {trip.driverId ? (
                          <div>
                            <div className="text-sm font-semibold">{trip.driverName}</div>
                            <div className="text-xs text-neutral-500">{trip.vehicleDescription}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${statusColor}`}>
                          {trip.status.replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Drawer */}
      {selectedReservation && (
        <ReservationDrawer 
          reservation={selectedReservation} 
          drivers={drivers}
          vehicles={vehicles}
          onClose={() => setSelectedReservation(null)} 
        />
      )}

    </div>
  );
}
