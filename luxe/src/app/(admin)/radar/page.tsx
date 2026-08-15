"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Reservation } from "@/lib/types";
import { AdminNav } from "@/app/(admin)/components/AdminNav";
import AirspaceGroundRadar from "@/components/AirspaceGroundRadar";
import { Radio, Plane, Car, Activity, Zap, ShieldCheck } from "lucide-react";

export default function RadarPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "reservations"),
      where("status", "in", ["confirmed", "assigned", "en_route", "arrived", "onboard"])
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: Reservation[] = [];
      snap.forEach(doc => list.push(doc.data() as Reservation));
      setReservations(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-accent text-sm font-semibold uppercase tracking-wider mb-1">
            <Radio size={16} className="animate-pulse" /> Live Airspace & Ground Fleet Command
          </div>
          <h1 className="text-3xl font-bold text-brand tracking-tight">Executive Telemetry Radar</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Real-time commercial and private jet inbound tracking synchronized with live chauffeur holding & curbside rendezvous.
          </p>
        </div>
      </div>

      {/* Holographic Canvas Radar */}
      <AirspaceGroundRadar reservations={reservations} />
    </div>
  );
}
