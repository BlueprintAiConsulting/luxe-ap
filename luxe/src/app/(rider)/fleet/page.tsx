"use client";

import Link from "next/link";
import { 
  Car, 
  Shield, 
  Bus, 
  Wifi, 
  Sparkles, 
  User, 
  Luggage, 
  ArrowRight, 
  CheckCircle2, 
  Zap,
  Coffee,
  VolumeX,
  Smartphone
} from "lucide-react";

const FLEET_CLASSES = [
  {
    id: "sedan",
    name: "Executive Sedan",
    model: "Mercedes-Benz S580 / Maybach & BMW 7-Series",
    tagline: "Ultra-quiet flagship luxury for executive 1-to-3 passenger transfers",
    passengers: 3,
    luggage: 3,
    icon: Car,
    image: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=80",
    features: [
      "Executive rear reclining heated & ventilated massage seats",
      "High-speed Starlink / 5G encrypted In-Cabin Wi-Fi",
      "Complimentary chilled San Pellegrino & Fiji Water",
      "Acoustic noise-canceling cabin glass & wireless phone charging",
      "Curbside baggage assistance & flight arrival monitoring"
    ],
    startingFare: "$145.00"
  },
  {
    id: "suv",
    name: "Luxury SUV",
    model: "Cadillac Escalade ESV & Lincoln Navigator L Extended",
    tagline: "First-class spacious comfort for families, VIP security details, & luggage",
    passengers: 6,
    luggage: 6,
    icon: Shield,
    image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80",
    features: [
      "Extended wheelbase (ESV) with oversized luggage cargo space",
      "Tri-zone rear climate control & privacy window tint",
      "Complimentary refreshments & artisan confectionery",
      "Dual rear 12.6-inch entertainment screens & HDMI inputs",
      "All-wheel drive with certified defensive-driving chauffeurs"
    ],
    startingFare: "$195.00"
  },
  {
    id: "sprinter",
    name: "Executive Jet Sprinter",
    model: "Mercedes-Benz Custom Jet Van (Maybach Interior)",
    tagline: "A private jet cabin on wheels for corporate boards & roadshows",
    passengers: 12,
    luggage: 12,
    icon: Bus,
    image: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1200&q=80",
    features: [
      "6-foot 4-inch standing headroom with aircraft-style ambient lighting",
      "Custom Italian leather captain chairs with motorized footrests",
      "43-inch Smart 4K TV with Apple TV / HDMI conference casting",
      "Built-in bar refrigerator stocked with premium beverages",
      "Dedicated partition wall for total corporate confidentiality"
    ],
    startingFare: "$285.00"
  }
];

export default function FleetPage() {
  return (
    <div className="p-4 max-w-lg mx-auto w-full pt-6 pb-28 space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 selection:bg-accent selection:text-neutral-950">
      
      {/* Header */}
      <div className="mb-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-widest mb-1 font-mono">
          <Sparkles size={11} /> Executive Fleet
        </div>
        <h1 className="text-3xl font-bold font-serif text-white tracking-tight">Vehicle Showcase</h1>
        <p className="text-xs text-neutral-400 mt-1 font-medium">
          Meticulously detailed, late-model luxury vehicles piloted by executive-certified chauffeurs.
        </p>
      </div>

      {/* Fleet Cards */}
      <div className="space-y-6">
        {FLEET_CLASSES.map((vehicle) => {
          const Icon = vehicle.icon;
          return (
            <div 
              key={vehicle.id}
              className="bg-[#0e0e13]/90 backdrop-blur-xl border border-neutral-800 hover:border-amber-400/30 rounded-3xl overflow-hidden shadow-2xl space-y-4 group transition-all"
            >
              {/* Image Banner with Badge */}
              <div className="relative h-44 w-full overflow-hidden bg-neutral-950">
                <img 
                  src={vehicle.image} 
                  alt={vehicle.name} 
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
                
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent bg-[#060608]/90 px-2.5 py-0.5 rounded-md border border-amber-400/30 shadow-gold-sm">
                      {vehicle.startingFare} Base
                    </span>
                    <h2 className="text-xl font-bold font-serif text-white mt-1">{vehicle.name}</h2>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-[#060608]/90 border border-neutral-800 px-2.5 py-1 rounded-xl text-xs text-neutral-300 font-mono">
                    <div className="flex items-center gap-1">
                      <User size={12} className="text-accent" />
                      <span>{vehicle.passengers}</span>
                    </div>
                    <span>&bull;</span>
                    <div className="flex items-center gap-1">
                      <Luggage size={12} className="text-neutral-400" />
                      <span>{vehicle.luggage}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details & Amenities */}
              <div className="p-5 pt-0 space-y-4">
                <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                  {vehicle.tagline}
                </p>

                <div className="space-y-2 pt-2 border-t border-neutral-800/80">
                  {vehicle.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-neutral-300">
                      <CheckCircle2 size={14} className="text-accent shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <Link
                    href={`/book`}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gold-gradient hover:bg-gold-gradient-hover text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-gold-sm hover:shadow-gold-md"
                  >
                    <span>Reserve {vehicle.name}</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
