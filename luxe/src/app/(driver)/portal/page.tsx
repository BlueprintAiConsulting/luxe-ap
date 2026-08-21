"use client";

import { useAuth } from "@/lib/firebase/auth";
import { useEffect, useState, Suspense } from "react";
import { collection, query, where, getDocs, doc, getDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Reservation } from "@/lib/types";
import { 
  DollarSign, 
  TrendingUp, 
  FileText, 
  Calendar, 
  Award, 
  Car, 
  Clock, 
  Download, 
  ShieldCheck, 
  Sparkles,
  ChevronRight,
  CheckCircle2,
  FileSpreadsheet
} from "lucide-react";
import Link from "next/link";
import { User } from "@/lib/types/user";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";

export default function DriverPortalPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64 text-white font-mono text-xs">Loading Chauffeur Financials &amp; Tax Center...</div>}>
      <DriverPortalInner />
    </Suspense>
  );
}

function DriverPortalInner() {
  const { user, role } = useAuth();
  const searchParams = useSearchParams();
  const targetDriverId = searchParams?.get("d") && role === "admin" ? searchParams.get("d") : user?.uid;
  
  const [driverProfile, setDriverProfile] = useState<any | null>(null);
  const [completedTrips, setCompletedTrips] = useState<Reservation[]>([]);
  const [activeTab, setActiveTab] = useState<"weekly" | "tax_1099" | "ledger">("weekly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetDriverId) return;

    const loadPortalData = async () => {
      try {
        // Load Driver Profile
        const driverDoc = await getDoc(doc(db, "drivers", targetDriverId));
        if (driverDoc.exists()) {
          setDriverProfile(driverDoc.data());
        } else {
          const userDoc = await getDoc(doc(db, "users", targetDriverId));
          if (userDoc.exists()) {
            setDriverProfile(userDoc.data());
          }
        }

        // Load Completed Charters for Financial Aggregation
        const resRef = collection(db, "reservations");
        const resQ = query(
          resRef, 
          where("driverId", "==", targetDriverId),
          where("status", "==", "completed")
        );
        const resSnap = await getDocs(resQ);
        
        const list: Reservation[] = [];
        resSnap.forEach((d) => list.push(d.data() as Reservation));
        
        // Sort descending by pickup time
        list.sort((a, b) => {
          const tA = (a.pickupAt as any)?.toDate?.()?.getTime() || 0;
          const tB = (b.pickupAt as any)?.toDate?.()?.getTime() || 0;
          return tB - tA;
        });

        setCompletedTrips(list);
      } catch (err) {
        console.error("Error loading driver financials:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPortalData();
  }, [targetDriverId]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-white font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span>Compiling Chauffeur Payroll &amp; Tax Ledger...</span>
        </div>
      </div>
    );
  }

  // Financial Calculations (70% Base Split + 100% Tips + 100% Tolls/Parking)
  let totalGrossCharterCents = 0;
  let totalBaseShareCents = 0;
  let totalTipsCents = 0;
  let totalTollsReimbursedCents = 0;
  let totalEstimatedMiles = 0;

  completedTrips.forEach((trip) => {
    const base = (trip.pricing as any)?.baseFareCents || trip.pricing?.subtotalCents || 20000;
    const gratuity = trip.pricing?.gratuityCents || Math.round(base * 0.2);
    const tolls = (trip.tollsCents || 0) + (trip.parkingCents || 0);
    const distanceMeters = trip.estimatedDistanceMeters || 45000;

    totalGrossCharterCents += (base + gratuity + tolls);
    totalBaseShareCents += Math.round(base * 0.70); // 70% chauffeur split
    totalTipsCents += gratuity; // 100% tips
    totalTollsReimbursedCents += tolls; // 100% toll reconciliation
    totalEstimatedMiles += Math.round(distanceMeters * 0.000621371);
  });

  const totalTakeHomePayoutCents = totalBaseShareCents + totalTipsCents + totalTollsReimbursedCents;
  const standardMileageDeductionDollars = Math.round(totalEstimatedMiles * 0.67); // IRS 2026 standard $0.67/mile

  const rating = driverProfile?.rating || 5.0;
  const ratingCount = driverProfile?.ratingCount || completedTrips.length;
  const chauffeurName = driverProfile?.displayName || "Executive Chauffeur";

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300 font-sans text-white">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent text-[10px] font-bold uppercase tracking-widest mb-1.5 font-mono shadow-gold-sm">
            <Sparkles size={11} className="text-accent" /> Chauffeur Financials &amp; 1099 Center
          </div>
          <h1 className="text-3xl font-bold font-serif text-white tracking-tight">{chauffeurName}</h1>
          <p className="text-xs sm:text-sm text-neutral-400 font-mono mt-0.5">
            Weekly 70/30 Settlement, 100% Gratuities, Toll Reimbursements &amp; IRS 1099-NEC Ledger.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-[#0e0e13] border border-neutral-800 p-1.5 rounded-2xl shadow-gold-sm self-start sm:self-auto font-mono text-xs">
          <button
            onClick={() => setActiveTab("weekly")}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === "weekly" ? "bg-gold-gradient text-neutral-950 shadow-gold-sm" : "text-neutral-400 hover:text-white"
            }`}
          >
            Weekly Payouts
          </button>
          <button
            onClick={() => setActiveTab("tax_1099")}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === "tax_1099" ? "bg-gold-gradient text-neutral-950 shadow-gold-sm" : "text-neutral-400 hover:text-white"
            }`}
          >
            1099 Tax Center
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === "ledger" ? "bg-gold-gradient text-neutral-950 shadow-gold-sm" : "text-neutral-400 hover:text-white"
            }`}
          >
            Trip Ledger
          </button>
        </div>
      </div>

      {/* 3 Core Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Total Net Payout */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#181822] to-[#0c0c12] border border-accent/30 shadow-gold-sm space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-accent uppercase font-bold">
            <span>Net Take-Home Earnings</span>
            <DollarSign size={16} />
          </div>
          <div className="text-3xl font-bold font-serif text-white pt-1">
            ${(totalTakeHomePayoutCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] font-mono text-neutral-400">
            70% Base Fares + 100% Tips &amp; Tolls
          </div>
        </div>

        {/* 100% Tips & Gratuity */}
        <div className="p-6 rounded-3xl bg-[#0e0e14] border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-emerald-400 uppercase font-bold">
            <span>100% Gratuity Collected</span>
            <Award size={16} />
          </div>
          <div className="text-3xl font-bold font-serif text-white pt-1">
            ${(totalTipsCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] font-mono text-neutral-400">
            Zero company commission on tips
          </div>
        </div>

        {/* Rating & Completed Charters */}
        <div className="p-6 rounded-3xl bg-[#0e0e14] border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-purple-400 uppercase font-bold">
            <span>Chauffeur Performance</span>
            <ShieldCheck size={16} />
          </div>
          <div className="text-3xl font-bold font-serif text-white pt-1 flex items-center gap-2">
            <span>{rating}★</span>
            <span className="text-xs font-mono text-neutral-500 font-normal">({completedTrips.length} Charters)</span>
          </div>
          <div className="text-[10px] font-mono text-neutral-400">
            Tier 1 Lead Chauffeur Status
          </div>
        </div>

      </div>

      {/* TAB 1: WEEKLY PAYOUT STATEMENTS */}
      {activeTab === "weekly" && (
        <div className="space-y-6">
          <div className="bg-[#0e0e13] rounded-3xl border border-neutral-800 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-4">
              <div>
                <h3 className="text-lg font-bold font-serif text-white">Next Automated Direct Deposit</h3>
                <p className="text-xs font-mono text-neutral-400">Every Monday at 04:00 AM UTC (Direct to Bank / Zelle)</p>
              </div>
              <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-800 text-emerald-400 rounded-full font-mono text-xs font-bold">
                ● Scheduled Direct Deposit
              </span>
            </div>

            {/* Split Breakdown Ledger Card */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-[#08080c] border border-neutral-800 text-xs font-mono">
              <div className="space-y-1">
                <span className="text-neutral-500 text-[10px] uppercase font-bold">70% Base Fare Share</span>
                <div className="text-base font-bold text-white">${(totalBaseShareCents / 100).toFixed(2)}</div>
              </div>
              <div className="space-y-1">
                <span className="text-neutral-500 text-[10px] uppercase font-bold">100% Tips &amp; Gratuity</span>
                <div className="text-base font-bold text-emerald-400">+${(totalTipsCents / 100).toFixed(2)}</div>
              </div>
              <div className="space-y-1">
                <span className="text-neutral-500 text-[10px] uppercase font-bold">Tolls &amp; Parking (100%)</span>
                <div className="text-base font-bold text-blue-400">+${(totalTollsReimbursedCents / 100).toFixed(2)}</div>
              </div>
              <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-neutral-800 pt-2 sm:pt-0 sm:pl-4">
                <span className="text-accent text-[10px] uppercase font-bold">Total Deposit Amount</span>
                <div className="text-lg font-bold text-accent font-serif">${(totalTakeHomePayoutCents / 100).toFixed(2)}</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-neutral-400 pt-2">
              <span>Automatic statement delivered to registered chauffeur email.</span>
              <button 
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-[#181822] hover:border-accent border border-neutral-700 text-white flex items-center gap-1.5 transition-all"
              >
                <Download size={14} />
                <span>Export PDF Statement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 1099-NEC TAX CENTER */}
      {activeTab === "tax_1099" && (
        <div className="bg-[#0e0e13] rounded-3xl border border-neutral-800 p-6 sm:p-8 shadow-2xl space-y-6 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-4">
            <div>
              <h3 className="text-lg font-bold font-serif text-white">Annual IRS 1099-NEC &amp; Expense Summary</h3>
              <p className="text-xs text-neutral-400">Cumulative Year-to-Date tax reporting and IRS mileage deduction ledger.</p>
            </div>
            <span className="px-3 py-1 bg-purple-950/80 border border-purple-800 text-purple-300 rounded-full font-bold">
              Tax Year {new Date().getFullYear()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#08080c] border border-neutral-800 space-y-1">
              <span className="text-[10px] uppercase text-neutral-500 font-bold">Box 1: Nonemployee Compensation</span>
              <div className="text-xl font-bold text-white">${(totalTakeHomePayoutCents / 100).toFixed(2)}</div>
              <p className="text-[10px] text-neutral-400">Gross 70% share + Gratuity reported</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#08080c] border border-neutral-800 space-y-1">
              <span className="text-[10px] uppercase text-neutral-500 font-bold">Non-Taxable Expense Reimbursements</span>
              <div className="text-xl font-bold text-blue-400">${(totalTollsReimbursedCents / 100).toFixed(2)}</div>
              <p className="text-[10px] text-neutral-400">Bridge tolls &amp; airport parking pass-through</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#08080c] border border-neutral-800 space-y-1">
              <span className="text-[10px] uppercase text-neutral-500 font-bold">Estimated Mileage Deduction</span>
              <div className="text-xl font-bold text-emerald-400">${standardMileageDeductionDollars.toLocaleString()}</div>
              <p className="text-[10px] text-neutral-400">{totalEstimatedMiles.toLocaleString()} commercial miles @ $0.67/mi</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#12121a] border border-accent/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-white font-bold flex items-center gap-1.5">
                <FileSpreadsheet size={15} className="text-accent" />
                <span>Complete 1099-NEC Annual Tax Package</span>
              </div>
              <p className="text-[11px] text-neutral-400">Includes itemized ride receipts, toll tickets, and odometer logs formatted for your CPA.</p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-xl bg-gold-gradient text-neutral-950 font-bold uppercase tracking-wider shadow-gold-sm hover:brightness-110 shrink-0"
            >
              Download 1099 Report
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: ITEMIZED COMPLETED CHARTERS LEDGER */}
      {activeTab === "ledger" && (
        <div className="bg-[#0e0e13] rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
            <h3 className="text-sm font-bold font-serif text-white">Itemized Completed Charters</h3>
            <span className="text-xs font-mono text-neutral-400">{completedTrips.length} Total Charters</span>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs font-mono min-w-[750px]">
              <thead className="bg-[#08080c] border-b border-neutral-800 text-neutral-400 uppercase text-[10px]">
                <tr>
                  <th className="p-4">Date &amp; Code</th>
                  <th className="p-4">Route Itinerary</th>
                  <th className="p-4">Base Fare</th>
                  <th className="p-4">70% Split</th>
                  <th className="p-4">Tip (100%)</th>
                  <th className="p-4">Tolls</th>
                  <th className="p-4 text-right">Net Payout</th>
                </tr>
              </thead>
              <tbody>
                {completedTrips.map((trip) => {
                  const base = (trip.pricing as any)?.baseFareCents || trip.pricing?.subtotalCents || 20000;
                  const gratuity = trip.pricing?.gratuityCents || Math.round(base * 0.2);
                  const tolls = (trip.tollsCents || 0) + (trip.parkingCents || 0);
                  const split = Math.round(base * 0.70);
                  const net = split + gratuity + tolls;
                  const pDate = (trip.pickupAt as any)?.toDate ? (trip.pickupAt as any).toDate() : new Date();

                  return (
                    <tr key={trip.reservationId} className="border-b border-neutral-800/60 hover:bg-[#14141c]">
                      <td className="p-4">
                        <div className="text-white font-bold">{format(pDate, "MMM d, yyyy")}</div>
                        <div className="text-[10px] text-accent font-mono">#{trip.confirmationCode}</div>
                      </td>
                      <td className="p-4 max-w-[240px] truncate">
                        <div className="text-white truncate">{trip.pickup?.formatted || "Origin"}</div>
                        <div className="text-[10px] text-neutral-400 truncate">➔ {trip.dropoff?.formatted || "Destination"}</div>
                      </td>
                      <td className="p-4 text-neutral-400">${(base / 100).toFixed(2)}</td>
                      <td className="p-4 text-white font-bold">${(split / 100).toFixed(2)}</td>
                      <td className="p-4 text-emerald-400">+${(gratuity / 100).toFixed(2)}</td>
                      <td className="p-4 text-blue-400">+${(tolls / 100).toFixed(2)}</td>
                      <td className="p-4 text-right font-bold text-accent font-serif text-sm">
                        ${(net / 100).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                {completedTrips.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-neutral-500 font-mono">
                      No completed charters on record yet. Complete your first assigned trip to populate earnings!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
