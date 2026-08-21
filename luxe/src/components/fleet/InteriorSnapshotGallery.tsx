"use client";

import { useState } from "react";
import Image from "next/image";
import { 
  Sparkles, 
  Eye, 
  Maximize2, 
  X, 
  Moon, 
  Briefcase, 
  GlassWater, 
  Tv, 
  Volume2, 
  ShieldCheck,
  CheckCircle2
} from "lucide-react";

export interface InteriorSnapshot {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  tag: string;
  categoryIcon?: any;
}

interface InteriorSnapshotGalleryProps {
  snapshots: InteriorSnapshot[];
  vehicleName: string;
}

export default function InteriorSnapshotGallery({
  snapshots,
  vehicleName,
}: InteriorSnapshotGalleryProps) {
  const [selectedSnapshot, setSelectedSnapshot] = useState<InteriorSnapshot | null>(null);
  const [activeAmbience, setActiveAmbience] = useState<"starlight" | "executive" | "lounge">("starlight");

  return (
    <div className="space-y-6">
      
      {/* Gallery Header & Ambience Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent text-[10px] font-bold uppercase tracking-widest mb-1 font-mono shadow-gold-sm">
            <Sparkles size={11} className="text-accent" /> First-Class Cabin Experience
          </div>
          <h3 className="text-2xl font-bold font-serif text-white">Interior Craftsmanship &amp; Amenities</h3>
          <p className="text-xs font-mono text-neutral-400 mt-0.5">
            Designed for executive discretion, private work sessions, and restful airport commutes.
          </p>
        </div>

        {/* Ambience Lighting Profile Controls */}
        <div className="flex bg-[#0e0e14] border border-neutral-800 p-1.5 rounded-2xl shadow-gold-sm self-start sm:self-auto font-mono text-xs">
          <button
            onClick={() => setActiveAmbience("starlight")}
            className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeAmbience === "starlight" ? "bg-purple-950/80 border border-purple-600 text-purple-200 shadow-sm" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Moon size={13} className="text-purple-400" />
            <span>Starline Glow</span>
          </button>

          <button
            onClick={() => setActiveAmbience("executive")}
            className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeAmbience === "executive" ? "bg-accent/20 border border-accent text-white shadow-sm" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Briefcase size={13} className="text-accent" />
            <span>Quiet Cabin</span>
          </button>

          <button
            onClick={() => setActiveAmbience("lounge")}
            className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeAmbience === "lounge" ? "bg-amber-950/80 border border-amber-600 text-amber-200 shadow-sm" : "text-neutral-400 hover:text-white"
            }`}
          >
            <GlassWater size={13} className="text-amber-400" />
            <span>Refreshment Lounge</span>
          </button>
        </div>
      </div>

      {/* Snapshot Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {snapshots.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedSnapshot(item)}
            className="group relative rounded-3xl overflow-hidden bg-[#0c0e18] border border-neutral-800 hover:border-accent/60 cursor-pointer shadow-xl transition-all hover:scale-[1.02] flex flex-col"
          >
            {/* Image Container */}
            <div className="relative aspect-[16/10] w-full overflow-hidden">
              <Image
                src={item.imageUrl}
                alt={item.title}
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                className="object-cover transition-transform duration-500 group-hover:scale-108"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e18] via-transparent to-transparent opacity-80" />
              
              {/* Top Category Badge */}
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-full bg-[#05070c]/85 backdrop-blur-md border border-neutral-700 text-accent font-mono text-[10px] uppercase font-bold tracking-wider">
                  {item.tag}
                </span>
              </div>

              {/* View Snapshot Zoom Icon */}
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#05070c]/80 backdrop-blur-md border border-neutral-700 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 size={14} />
              </div>
            </div>

            {/* Content Details */}
            <div className="p-5 space-y-1.5 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="font-serif font-bold text-white text-base group-hover:text-accent transition-colors">
                  {item.title}
                </h4>
                <p className="text-xs text-neutral-400 leading-relaxed font-sans mt-1">
                  {item.description}
                </p>
              </div>

              <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-[11px] font-mono text-accent">
                <span>Inspect Cabin Spec</span>
                <span className="group-hover:translate-x-1 transition-transform">➔</span>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Full-Screen Snapshot Zoom Modal */}
      {selectedSnapshot && (
        <div 
          onClick={() => setSelectedSnapshot(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0e17] border border-accent/40 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl space-y-0"
          >
            {/* Modal Image */}
            <div className="relative aspect-[16/10] w-full">
              <Image
                src={selectedSnapshot.imageUrl}
                alt={selectedSnapshot.title}
                fill
                sizes="(max-width: 1024px) 100vw, 800px"
                className="object-cover"
              />
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/70 backdrop-blur-md border border-neutral-700 text-white flex items-center justify-center hover:scale-105 transition-transform"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Description */}
            <div className="p-6 sm:p-8 space-y-3 bg-[#0e121e]">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent font-mono text-[10px] uppercase font-bold tracking-widest">
                  {selectedSnapshot.tag} • {vehicleName}
                </span>
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={14} /> Standard In-Fleet Amenity
                </span>
              </div>
              <h3 className="text-2xl font-bold font-serif text-white">{selectedSnapshot.title}</h3>
              <p className="text-sm text-neutral-300 font-sans leading-relaxed">
                {selectedSnapshot.description}
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
