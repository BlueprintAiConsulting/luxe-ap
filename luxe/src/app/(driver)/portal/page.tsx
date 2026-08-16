"use client";

import { useAuth } from "@/lib/firebase/auth";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Reservation } from "@/lib/types";
import { Star, TrendingUp, DollarSign, Award, Clock } from "lucide-react";
import Link from "next/link";
import { User } from "@/lib/types/user";
import { useSearchParams } from "next/navigation";

export default function DriverPortalPage() {
  const { user, role } = useAuth();
  const searchParams = useSearchParams();
  const targetDriverId = searchParams?.get("d") && role === "admin" ? searchParams.get("d") : user?.uid;
  
  const [driverProfile, setDriverProfile] = useState<User | null>(null);
  const [totalEarningsCents, setTotalEarningsCents] = useState(0);
  const [completedTrips, setCompletedTrips] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetDriverId) return;

    const loadPortalData = async () => {
      try {
        // Load Driver Profile for Ratings & Total Rides
        const userRef = collection(db, "users");
        const userQ = query(userRef, where("uid", "==", targetDriverId));
        const userSnap = await getDocs(userQ);
        if (!userSnap.empty) {
          setDriverProfile(userSnap.docs[0].data() as User);
        }

        // Load Completed Trips for Earnings
        const resRef = collection(db, "reservations");
        const resQ = query(
          resRef, 
          where("driverId", "==", targetDriverId),
          where("status", "==", "completed")
        );
        const resSnap = await getDocs(resQ);
        
        let sumCents = 0;
        let count = 0;
        resSnap.forEach((doc) => {
          const res = doc.data() as Reservation;
          count++;
          // Estimate Driver Payout: 80% of total reservation price, or flat fallback if unavailable.
          if (res.pricing && res.pricing.totalCents) {
            sumCents += Math.floor(res.pricing.totalCents * 0.8);
          } else {
            sumCents += 8500; // Flat $85.00 fallback
          }
        });

        setTotalEarningsCents(sumCents);
        setCompletedTrips(count);
      } catch (err) {
        console.error("Error loading portal data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPortalData();
  }, [user]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-white">Loading Portal...</div>;
  }

  const rating = (driverProfile as any)?.rating || 5.0;
  const totalRides = driverProfile?.totalRides || completedTrips;
  const ratingCount = (driverProfile as any)?.ratingCount || 0;

  return (
    <div className="p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="mt-4 mb-6">
        <h1 className="text-3xl font-bold text-white">Portal</h1>
        <p className="text-neutral-400">Chauffeur Dashboard</p>
      </div>

      {/* Main Earnings Card */}
      <div className="bg-brand rounded-2xl p-6 relative overflow-hidden shadow-xl border border-neutral-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-accent/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="text-neutral-400 font-semibold uppercase tracking-wider text-xs mb-2 flex items-center">
            <DollarSign size={14} className="mr-1 text-accent" />
            Lifetime Earnings
          </div>
          <div className="text-4xl font-bold text-white mb-1">
            ${(totalEarningsCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-emerald-400 text-sm font-semibold flex items-center mt-2">
            <TrendingUp size={16} className="mr-1" />
            Active driving status
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Rating Card */}
        <div className="bg-[#0e0e13] border border-neutral-800 rounded-2xl p-5 shadow-sm">
          <div className="text-accent mb-2 flex items-center justify-between">
            <Star size={24} className="fill-accent text-accent" />
            <div className="text-xs text-neutral-400 font-bold bg-neutral-800 px-2 py-1 rounded">{ratingCount} Reviews</div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{rating.toFixed(2)}</div>
          <div className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Avg Rating</div>
        </div>

        {/* Trips Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-sm">
          <div className="text-accent mb-2">
            <Award size={24} />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{totalRides}</div>
          <div className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Total Trips</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="pt-6">
        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4">Quick Actions</h3>
        <div className="space-y-3">
          <Link href={`/today${targetDriverId !== user?.uid ? `?d=${targetDriverId}` : ''}`} className="flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:bg-neutral-800 transition-colors">
            <div className="flex items-center">
              <Clock className="text-neutral-400 mr-3" size={20} />
              <span className="font-bold text-white">Today's Schedule</span>
            </div>
            <div className="text-neutral-500">&rarr;</div>
          </Link>
          <Link href={`/past${targetDriverId !== user?.uid ? `?d=${targetDriverId}` : ''}`} className="flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:bg-neutral-800 transition-colors">
            <div className="flex items-center">
              <DollarSign className="text-neutral-400 mr-3" size={20} />
              <span className="font-bold text-white">Trip History & Payouts</span>
            </div>
            <div className="text-neutral-500">&rarr;</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
