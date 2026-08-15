"use client";

import { auth } from "@/lib/firebase/client";
import { signOut } from "firebase/auth";
import { useAuth } from "@/lib/firebase/auth";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, ReactNode } from "react";
import Link from "next/link";
import { Calendar, Clock, LogOut, LayoutDashboard } from "lucide-react";

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
    return <div className="flex h-screen items-center justify-center bg-black text-white">Loading...</div>;
  }

  const isToday = pathname.startsWith("/today");
  const isPast = pathname.startsWith("/past");
  const isPortal = pathname.startsWith("/portal");

  const searchParams = useSearchParams();
  const dParam = searchParams?.get("d") ? `?d=${searchParams.get("d")}` : "";

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col">
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-neutral-900/95 backdrop-blur-lg border-t border-neutral-800 px-6 py-4 flex justify-between items-center z-50">
        <Link href={`/portal${dParam}`} className={`flex flex-col items-center ${isPortal ? "text-accent" : "text-neutral-500 hover:text-neutral-300"}`}>
          <LayoutDashboard size={22} />
          <span className="text-[11px] font-bold mt-1 uppercase tracking-wider">Portal</span>
        </Link>
        <Link href={`/today${dParam}`} className={`flex flex-col items-center ${isToday ? "text-accent" : "text-neutral-500 hover:text-neutral-300"}`}>
          <Calendar size={22} />
          <span className="text-[11px] font-bold mt-1 uppercase tracking-wider">Today</span>
        </Link>
        <Link href={`/past${dParam}`} className={`flex flex-col items-center ${isPast ? "text-accent" : "text-neutral-500 hover:text-neutral-300"}`}>
          <Clock size={22} />
          <span className="text-[11px] font-bold mt-1 uppercase tracking-wider">History</span>
        </Link>
      </nav>
    </div>
  );
}
