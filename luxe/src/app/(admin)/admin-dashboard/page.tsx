"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { format, startOfToday, endOfToday } from "date-fns";
import { Calendar, UserCheck, Car, Activity, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Reservation, Driver } from "@/lib/types";
import AirspaceGroundRadar from "@/components/AirspaceGroundRadar";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    todayReservations: 0,
    unassignedTrips: 0,
    activeDrivers: 0,
    inProgressTrips: 0,
  });
  const [needsAttention, setNeedsAttention] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const todayStart = startOfToday();
        const todayEnd = endOfToday();

        // 1. Today's reservations
        const resQuery = query(
          collection(db, "reservations"),
          where("pickupAt", ">=", todayStart),
          where("pickupAt", "<=", todayEnd)
        );
        const resSnap = await getDocs(resQuery);

        // 2. Unassigned confirmed trips
        const unassignedQuery = query(
          collection(db, "reservations"),
          where("status", "==", "confirmed"),
          where("driverId", "==", null)
        );
        const unassignedSnap = await getDocs(unassignedQuery);
        const unassignedData = unassignedSnap.docs.map(d => d.data() as Reservation);

        // 3. Active drivers
        const driversQuery = query(
          collection(db, "drivers"),
          where("active", "==", true)
        );
        const driversSnap = await getDocs(driversQuery);

        // 4. In-progress trips
        const inProgressQuery = query(
          collection(db, "reservations"),
          where("status", "in", ["en_route", "arrived", "onboard"])
        );
        const inProgressSnap = await getDocs(inProgressQuery);

        setStats({
          todayReservations: resSnap.size,
          unassignedTrips: unassignedSnap.size,
          activeDrivers: driversSnap.size,
          inProgressTrips: inProgressSnap.size,
        });

        // Use top 5 for needs attention list
        setNeedsAttention(unassignedData.slice(0, 5));
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className="p-8 text-neutral-500">Loading dashboard...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-brand tracking-tight">Operations Cockpit</h1>
        <p className="text-neutral-500 mt-2 text-lg">Overview of today's operations and tasks needing attention.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm ring-1 ring-neutral-900/5 mb-12 flex flex-col lg:flex-row overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-neutral-100">
        <div className="p-10 flex-1 flex items-center justify-between group hover:bg-neutral-50/50 transition-colors">
          <div>
            <div className="text-sm font-semibold text-neutral-400 uppercase tracking-widest mb-3">Today's Trips</div>
            <div className="text-6xl font-bold text-brand tracking-tighter">{stats.todayReservations}</div>
          </div>
          <Calendar size={48} strokeWidth={1} className="text-neutral-200 group-hover:text-brand/20 transition-colors" />
        </div>

        <div className="p-10 flex-1 bg-brand flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-accent uppercase tracking-widest mb-3">Needs Dispatch</div>
            <div className="text-6xl font-bold text-white tracking-tighter">{stats.unassignedTrips}</div>
          </div>
          <Car size={48} strokeWidth={1} className="text-white/10" />
        </div>

        <div className="p-10 flex-1 flex items-center justify-between group hover:bg-neutral-50/50 transition-colors">
          <div>
            <div className="text-sm font-semibold text-neutral-400 uppercase tracking-widest mb-3">Active Drivers</div>
            <div className="text-6xl font-bold text-brand tracking-tighter">{stats.activeDrivers}</div>
          </div>
          <UserCheck size={48} strokeWidth={1} className="text-neutral-200 group-hover:text-brand/20 transition-colors" />
        </div>

        <div className="p-10 flex-1 flex items-center justify-between group hover:bg-neutral-50/50 transition-colors">
          <div>
            <div className="text-sm font-semibold text-neutral-400 uppercase tracking-widest mb-3">In Progress</div>
            <div className="text-6xl font-bold text-brand tracking-tighter">{stats.inProgressTrips}</div>
          </div>
          <Activity size={48} strokeWidth={1} className="text-neutral-200 group-hover:text-brand/20 transition-colors" />
        </div>
      </div>

      {/* Futuristic Live Airspace & Ground Radar */}
      <div className="mb-12 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-brand tracking-tight">Live Airspace & Ground Fleet Radar</h2>
            <p className="text-sm text-neutral-500">Real-time commercial/private jet inbounds and synchronized chauffeur curbside tracking.</p>
          </div>
          <Link href="/radar" className="text-sm font-semibold text-accent hover:underline flex items-center gap-1">
            Full Screen Radar &rarr;
          </Link>
        </div>
        <AirspaceGroundRadar />
      </div>

      <div className="bg-white rounded-3xl shadow-sm ring-1 ring-neutral-900/5 overflow-hidden">
        <div className="p-8 border-b border-neutral-100 flex items-center justify-between bg-white">
          <h2 className="text-2xl font-bold text-brand tracking-tight">Needs Attention</h2>
          <Link href="/dispatch" className="text-sm font-semibold text-neutral-400 hover:text-brand flex items-center gap-1 transition-colors">
            Go to Dispatch <ArrowRight size={16} />
          </Link>
        </div>
        
        {needsAttention.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 bg-white">
            All confirmed trips have been assigned. Great job!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left bg-white min-w-[600px]">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-500 text-xs font-semibold">
                  <th className="p-4 font-semibold">Pickup</th>
                <th className="p-4 font-semibold">Client</th>
                <th className="p-4 font-semibold">Route</th>
                <th className="p-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {needsAttention.map((trip) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const pickupDate = typeof (trip.pickupAt as any)?.toDate === "function" ? (trip.pickupAt as any).toDate() : new Date();
                return (
                  <tr key={trip.reservationId} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-sm text-brand">{format(pickupDate, "MMM d, yyyy")}</div>
                      <div className="text-xs text-neutral-500">{format(pickupDate, "h:mm a")}</div>
                    </td>
                    <td className="p-4 text-sm font-medium text-brand">{trip.riderName}</td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-brand truncate max-w-[200px]">{trip.pickup?.formatted}</div>
                      <div className="text-xs text-neutral-500">to {trip.dropoff?.formatted || "As directed"}</div>
                    </td>
                    <td className="p-4 text-right">
                      <Link href={`/dispatch?tripId=${trip.reservationId}`} className="inline-block px-4 py-2 bg-brand text-white text-xs font-semibold rounded-lg hover:bg-neutral-900 transition-colors">
                        Assign
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
