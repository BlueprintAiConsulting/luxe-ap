"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { format, startOfToday, endOfToday } from "date-fns";
import { Calendar, UserCheck, Car, Activity, ArrowRight, Radio, Sparkles, Globe } from "lucide-react";
import Link from "next/link";
import { Reservation } from "@/lib/types";
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium tracking-wider uppercase text-neutral-400">Loading Operations Cockpit...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto font-sans text-white space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest mb-1.5 font-mono">
            <Radio size={11} className="animate-pulse" /> Operations Command
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-serif text-white tracking-tight">Operations Cockpit</h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">Live overview of today's executive charters, airspace inbounds, and fleet status.</p>
        </div>

        <Link
          href="/radar"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-900 border border-cyan-500/30 text-cyan-400 rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all active:scale-95 shadow-lg"
        >
          <Globe size={14} />
          <span>Launch Full Radar</span>
        </Link>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-xl">
          <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Today's Trips</span>
            <Calendar size={16} className="text-neutral-500" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold font-mono text-white">{stats.todayReservations}</div>
        </div>

        <div className="bg-neutral-900/90 border border-amber-400/40 rounded-2xl p-5 shadow-xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-amber-950/20">
          <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Needs Dispatch</span>
            <Car size={16} className="text-amber-400" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold font-mono text-amber-400">{stats.unassignedTrips}</div>
        </div>

        <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-xl">
          <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Active Drivers</span>
            <UserCheck size={16} className="text-neutral-500" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold font-mono text-white">{stats.activeDrivers}</div>
        </div>

        <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-xl">
          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>In Progress</span>
            <Activity size={16} className="text-emerald-400" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold font-mono text-emerald-400">{stats.inProgressTrips}</div>
        </div>
      </div>

      {/* Futuristic Live Airspace & Ground Radar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-tight">Live Airspace & Ground Fleet Radar</h2>
            <p className="text-xs text-neutral-400">Synchronized commercial/private jet inbounds & chauffeur rendezvous.</p>
          </div>
          <Link href="/radar" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
            <span>Enlarge Radar</span>
            <ArrowRight size={12} />
          </Link>
        </div>
        <AirspaceGroundRadar />
      </div>

      {/* Needs Attention Table */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-5 sm:p-6 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold font-serif text-white tracking-tight">Action Items & Dispatch Queue</h2>
          <Link href="/dispatch" className="text-xs font-bold text-accent hover:underline flex items-center gap-1 transition-colors">
            <span>Go to Dispatch Board</span>
            <ArrowRight size={12} />
          </Link>
        </div>
        
        {needsAttention.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400 font-medium">
            All active charter reservations are currently allocated to verified chauffeurs.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[500px]">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="p-4">Pickup Time</th>
                  <th className="p-4">Client</th>
                  <th className="p-4">Route</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-xs">
                {needsAttention.map((trip) => {
                  const pickupDate = typeof (trip.pickupAt as any)?.toDate === "function" ? (trip.pickupAt as any).toDate() : new Date();
                  return (
                    <tr key={trip.reservationId} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-white">{format(pickupDate, "MMM d, yyyy")}</div>
                        <div className="text-[11px] text-neutral-400 font-mono">{format(pickupDate, "h:mm a")}</div>
                      </td>
                      <td className="p-4 font-semibold text-white">{trip.riderName}</td>
                      <td className="p-4">
                        <div className="text-neutral-200 truncate max-w-[200px]">{trip.pickup?.formatted || trip.pickup?.line1}</div>
                        <div className="text-[11px] text-neutral-500 truncate max-w-[200px]">to {trip.dropoff?.formatted || trip.dropoff?.line1 || "As directed"}</div>
                      </td>
                      <td className="p-4 text-right">
                        <Link 
                          href={`/dispatch?tripId=${trip.reservationId}`} 
                          className="inline-block px-3 py-1.5 bg-accent text-neutral-950 text-xs font-bold rounded-xl hover:bg-accent/90 transition-all active:scale-95 shadow-md"
                        >
                          Allocate Chauffeur
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
