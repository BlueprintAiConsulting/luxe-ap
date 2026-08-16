"use client";

import { useAuth } from "@/lib/firebase/auth";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, ReactNode } from "react";
import Link from "next/link";
import { Calendar, Clock, LayoutDashboard, Car } from "lucide-react";

export default function DriverLayout({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (role !== "driver" && role !== "admin") {
        router.push("/");
      }
    }
  }, [user, role, loading, router, pathname]);

  if (loading || !user || (role !== "driver" && role !== "admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050507] text-white">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium tracking-wide text-neutral-400">Loading Chauffeur HUD...</span>
        </div>
      </div>
    );
  }

  const isToday = pathname.startsWith("/today") || pathname.startsWith("/trip");
  const isPast = pathname.startsWith("/past");
  const isPortal = pathname.startsWith("/portal");

  const searchParams = useSearchParams();
  const dParam = searchParams?.get("d") ? `?d=${searchParams.get("d")}` : "";

  return (
    <div className="min-h-screen bg-[#060608] text-white font-sans flex flex-col selection:bg-accent selection:text-neutral-950">
      <main className="flex-1 pb-24 sm:pb-20">
        {children}
      </main>

      {/* Driver Cockpit Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0e0e13]/90 backdrop-blur-2xl border-t border-white/10 px-6 py-2 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-md mx-auto flex justify-around items-center">
          
          <Link 
            href={`/portal${dParam}`} 
            className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all duration-200 active:scale-90 ${
              isPortal 
                ? "text-accent" 
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${isPortal ? "bg-accent/15" : ""}`}>
              <LayoutDashboard size={22} className={isPortal ? "text-accent stroke-[2.5]" : ""} />
            </div>
            <span className="text-[10px] font-bold tracking-wider uppercase mt-0.5">Cockpit</span>
          </Link>

          <Link 
            href={`/today${dParam}`} 
            className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all duration-200 active:scale-90 ${
              isToday 
                ? "text-accent" 
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${isToday ? "bg-accent/15" : ""}`}>
              <Calendar size={22} className={isToday ? "text-accent stroke-[2.5]" : ""} />
            </div>
            <span className="text-[10px] font-bold tracking-wider uppercase mt-0.5">Today</span>
          </Link>

          <Link 
            href={`/past${dParam}`} 
            className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all duration-200 active:scale-90 ${
              isPast 
                ? "text-accent" 
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${isPast ? "bg-accent/15" : ""}`}>
              <Clock size={22} className={isPast ? "text-accent stroke-[2.5]" : ""} />
            </div>
            <span className="text-[10px] font-bold tracking-wider uppercase mt-0.5">History</span>
          </Link>

        </div>
      </nav>
    </div>
  );
}
