"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { format, startOfToday, endOfToday } from "date-fns";
import { Calendar, UserCheck, Car, Activity, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Reservation, Driver } from "@/lib/types";

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand uppercase tracking-tight">Operations Cockpit</h1>
        <p className="text-neutral-500 mt-2">Overview of today's operations and tasks needing attention.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-neutral-500 mb-1">Today's Trips</div>
            <div className="text-3xl font-bold text-brand">{stats.todayReservations}</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-600">
            <Calendar size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-neutral-500 mb-1">Needs Dispatch</div>
            <div className="text-3xl font-bold text-amber-500">{stats.unassignedTrips}</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <Car size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-neutral-500 mb-1">Active Drivers</div>
            <div className="text-3xl font-bold text-emerald-500">{stats.activeDrivers}</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <UserCheck size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-neutral-500 mb-1">In Progress</div>
            <div className="text-3xl font-bold text-blue-500">{stats.inProgressTrips}</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Activity size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand">Needs Attention</h2>
          <Link href="/dispatch" className="text-sm font-semibold text-neutral-500 hover:text-brand flex items-center gap-1 transition-colors">
            Go to Dispatch <ArrowRight size={16} />
          </Link>
        </div>
        
        {needsAttention.length === 0 ? (
          <div className="p-8 text-center text-neutral-500">
            All confirmed trips have been assigned. Great job!
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-bold">Pickup</th>
                <th className="p-4 font-bold">Client</th>
                <th className="p-4 font-bold">Route</th>
                <th className="p-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {needsAttention.map((trip) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const pickupDate = typeof (trip.pickupAt as any)?.toDate === "function" ? (trip.pickupAt as any).toDate() : new Date();
                return (
                  <tr key={trip.reservationId} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-sm">{format(pickupDate, "MMM d, yyyy")}</div>
                      <div className="text-xs text-neutral-500">{format(pickupDate, "h:mm a")}</div>
                    </td>
                    <td className="p-4 text-sm font-semibold">{trip.riderName}</td>
                    <td className="p-4">
                      <div className="text-sm font-semibold truncate max-w-[200px]">{trip.pickup?.formatted}</div>
                      <div className="text-xs text-neutral-500">to {trip.dropoff?.formatted || "As directed"}</div>
                    </td>
                    <td className="p-4 text-right">
                      <Link href={`/dispatch?tripId=${trip.reservationId}`} className="inline-block px-4 py-2 bg-black text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition-colors">
                        Assign
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
