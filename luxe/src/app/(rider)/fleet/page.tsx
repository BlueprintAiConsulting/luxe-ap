"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  LUXURY_FLEET_SHOWCASE 
} from "@/lib/data/fleetShowcase";
import Vehicle360Viewer from "@/components/fleet/Vehicle360Viewer";
import InteriorSnapshotGallery from "@/components/fleet/InteriorSnapshotGallery";
import VehicleSpecHud from "@/components/fleet/VehicleSpecHud";
import { 
  Sparkles, 
  Car, 
  Shield, 
  Bus, 
  ArrowRight, 
  CheckCircle2, 
  DollarSign, 
  Lock,
  Star
} from "lucide-react";

export default function FleetPage() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("escalade_esv");

  const currentVehicle = 
    LUXURY_FLEET_SHOWCASE.find((v) => v.id === selectedVehicleId) || 
    LUXURY_FLEET_SHOWCASE[0];

  return (
    <div className="min-h-screen bg-[#050609] text-white selection:bg-accent selection:text-neutral-950 font-sans">
      
      {/* Hero Header Section */}
      <div className="relative pt-10 pb-8 px-4 sm:px-8 max-w-7xl mx-auto border-b border-neutral-800/80">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-[11px] font-bold uppercase tracking-widest font-mono shadow-gold-sm">
              <Sparkles size={12} className="text-accent" /> KLS Luxe Flagship Fleet Experience
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-serif text-white tracking-tight">
              Bespoke Luxury Livery
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 font-mono max-w-2xl mt-1">
              Explore our owned collection of pristine, late-model Cadillac Escalade ESVs, Mercedes-Benz S-Class sedans, and Custom Executive Sprinter Jet vans.
            </p>
          </div>

          {/* Quick Stats Banner */}
          <div className="flex items-center gap-4 bg-[#0a0d16] border border-neutral-800 p-3 rounded-2xl font-mono text-xs text-neutral-300">
            <div className="flex items-center gap-1.5">
              <Star size={14} className="text-accent fill-accent" />
              <span className="font-bold text-white">5.0★ Chauffeurs</span>
            </div>
            <div className="h-4 w-px bg-neutral-700" />
            <div className="flex items-center gap-1.5">
              <Shield size={14} className="text-emerald-400" />
              <span className="font-bold text-white">$10M Liability</span>
            </div>
          </div>
        </div>

        {/* Fleet Model Switcher Tabs */}
        <div className="flex overflow-x-auto no-scrollbar gap-3 pt-8 font-mono text-xs">
          {LUXURY_FLEET_SHOWCASE.map((vehicle) => {
            const isSelected = vehicle.id === selectedVehicleId;
            return (
              <button
                key={vehicle.id}
                onClick={() => setSelectedVehicleId(vehicle.id)}
                className={`min-h-[48px] px-6 py-3 rounded-2xl font-bold transition-all shrink-0 flex items-center gap-2.5 active:scale-95 ${
                  isSelected
                    ? "bg-gold-gradient text-neutral-950 shadow-gold-sm"
                    : "bg-[#0b0e17] border border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white"
                }`}
              >
                {vehicle.classId === "suv" ? (
                  <Shield size={16} />
                ) : vehicle.classId === "sedan" ? (
                  <Car size={16} />
                ) : (
                  <Bus size={16} />
                )}
                <span>{vehicle.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Showcase Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-12 animate-in fade-in duration-300">
        
        {/* Vehicle Headline & Reserve Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#101424] via-[#090b14] to-[#05060a] border border-accent/30 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono uppercase tracking-widest text-accent font-bold">
              {currentVehicle.model}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold font-serif text-white">
              {currentVehicle.name}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 font-sans max-w-xl">
              {currentVehicle.tagline}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
            <div className="font-mono text-right sm:text-left">
              <span className="text-[10px] uppercase text-neutral-400 font-bold block">Starting Estimate</span>
              <span className="text-xl font-bold text-accent font-serif">{currentVehicle.priceEstimate}</span>
            </div>

            <Link
              href={`/book?classId=${currentVehicle.classId}`}
              className="px-7 py-3.5 min-h-[48px] rounded-2xl bg-gold-gradient text-neutral-950 font-bold uppercase tracking-wider font-mono text-xs shadow-gold-sm hover:brightness-110 flex items-center gap-2 transition-all active:scale-95"
            >
              <span>Reserve This Flagship</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* 1. 360-Degree Virtual Exterior Turntable */}
        <div className="space-y-3">
          <Vehicle360Viewer vehicle={currentVehicle} />
        </div>

        {/* 2. Interior Snapshot Gallery & Ambience Tour */}
        <div className="space-y-3">
          <InteriorSnapshotGallery 
            snapshots={currentVehicle.interiorSnapshots} 
            vehicleName={currentVehicle.name} 
          />
        </div>

        {/* 3. Aviation-Inspired Telemetry & Cabin Spec HUD */}
        <div className="space-y-3">
          <VehicleSpecHud 
            passengers={currentVehicle.passengers} 
            luggage={currentVehicle.luggage} 
            classId={currentVehicle.classId} 
          />
        </div>

        {/* Final Bottom Reservation Banner */}
        <div className="p-8 rounded-3xl bg-[#0a0d16] border border-neutral-800 text-center space-y-4 shadow-xl">
          <h3 className="text-2xl font-bold font-serif text-white">Experience Unmatched Executive Standard</h3>
          <p className="text-xs font-mono text-neutral-400 max-w-xl mx-auto">
            All charters include complimentary flight tracking, 15-minute curbside buffer, and dedicated chauffeur dispatch coordination.
          </p>
          <div className="pt-2">
            <Link
              href={`/book?classId=${currentVehicle.classId}`}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gold-gradient text-neutral-950 font-bold uppercase tracking-wider font-mono text-xs shadow-gold-sm hover:brightness-110 transition-all active:scale-95"
            >
              <span>Book Your Chauffeur Now</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
