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

  const isToday = pathname.startsWith("/driver/today");
  const isPast = pathname.startsWith("/driver/past");

  const searchParams = useSearchParams();
  const dParam = searchParams?.get("d") ? `?d=${searchParams.get("d")}` : "";

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col">
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-neutral-900 border-t border-neutral-800 px-6 py-4 flex justify-between items-center z-50">
        <Link href={`/driver/portal${dParam}`} className={`flex flex-col items-center ${pathname.startsWith("/driver/portal") ? "text-white" : "text-neutral-500 hover:text-neutral-300"}`}>
          <LayoutDashboard size={24} />
          <span className="text-xs font-bold mt-1">Portal</span>
        </Link>
        <Link href={`/driver/today${dParam}`} className={`flex flex-col items-center ${isToday ? "text-white" : "text-neutral-500 hover:text-neutral-300"}`}>
          <Calendar size={24} />
          <span className="text-xs font-bold mt-1">Today</span>
        </Link>
        <Link href={`/driver/past${dParam}`} className={`flex flex-col items-center ${isPast ? "text-white" : "text-neutral-500 hover:text-neutral-300"}`}>
          <Clock size={24} />
          <span className="text-xs font-bold mt-1">History</span>
        </Link>
      </nav>
    </div>
  );
}
