"use client";

import { useAuth } from "@/lib/firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode } from "react";
import Link from "next/link";
import { PlusCircle, Clock, Car, Sliders, Sparkles } from "lucide-react";

export default function RiderLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
    }
  }, [user, loading, router, pathname]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium tracking-wide text-neutral-400">Loading LUXE Concierge...</span>
        </div>
      </div>
    );
  }

  const isBook = pathname === "/book";
  const isDashboard = pathname === "/dashboard";
  const isFleet = pathname === "/fleet";
  const isPreferences = pathname === "/preferences";

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col selection:bg-accent selection:text-neutral-950">
      <main className="flex-1 pb-24 sm:pb-16">
        {children}
      </main>

      {/* Floating iOS Luxury Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-900/90 backdrop-blur-2xl border-t border-white/10 px-4 py-2 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-md mx-auto flex items-center justify-around">
          
          <Link 
            href="/book" 
            className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all duration-200 active:scale-90 ${
              isBook 
                ? "text-accent" 
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${isBook ? "bg-accent/15" : ""}`}>
              <PlusCircle size={22} className={isBook ? "text-accent stroke-[2.5]" : ""} />
            </div>
            <span className="text-[10px] font-bold tracking-wider uppercase mt-0.5">Book</span>
          </Link>

          <Link 
            href="/dashboard" 
            className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all duration-200 active:scale-90 ${
              isDashboard 
                ? "text-accent" 
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${isDashboard ? "bg-accent/15" : ""}`}>
              <Clock size={22} className={isDashboard ? "text-accent stroke-[2.5]" : ""} />
            </div>
            <span className="text-[10px] font-bold tracking-wider uppercase mt-0.5">Trips</span>
          </Link>

          <Link 
            href="/fleet" 
            className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all duration-200 active:scale-90 ${
              isFleet 
                ? "text-accent" 
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${isFleet ? "bg-accent/15" : ""}`}>
              <Car size={22} className={isFleet ? "text-accent stroke-[2.5]" : ""} />
            </div>
            <span className="text-[10px] font-bold tracking-wider uppercase mt-0.5">Fleet</span>
          </Link>

          <Link 
            href="/preferences" 
            className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all duration-200 active:scale-90 ${
              isPreferences 
                ? "text-accent" 
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${isPreferences ? "bg-accent/15" : ""}`}>
              <Sliders size={22} className={isPreferences ? "text-accent stroke-[2.5]" : ""} />
            </div>
            <span className="text-[10px] font-bold tracking-wider uppercase mt-0.5">Prefs</span>
          </Link>

        </div>
      </nav>
    </div>
  );
}
