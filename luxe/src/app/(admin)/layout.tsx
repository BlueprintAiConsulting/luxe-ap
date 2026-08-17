"use client";

import { useAuth } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { AdminNav } from "./components/AdminNav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login?redirect=/admin-dashboard");
      } else if (role !== "admin") {
        router.push("/");
      }
    }
  }, [user, role, loading, router]);

  if (loading || !user || role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0d14] text-white">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium tracking-wide text-slate-400">Loading Dispatch Command...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0a0d14] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(30,41,59,0.5),rgba(10,13,20,1))] font-sans text-slate-100 selection:bg-accent selection:text-neutral-950">
      <AdminNav />
      <div className="flex-1 lg:ml-64 pt-16 lg:pt-0 min-w-0">
        {children}
      </div>
    </div>
  );
}
