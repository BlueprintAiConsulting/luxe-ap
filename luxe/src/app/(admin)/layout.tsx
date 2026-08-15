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
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium tracking-wide text-neutral-400">Loading Dispatch Command...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-neutral-950 font-sans text-white selection:bg-cyan-500 selection:text-neutral-950">
      <AdminNav />
      <div className="flex-1 lg:ml-64 pt-16 lg:pt-0 min-w-0">
        {children}
      </div>
    </div>
  );
}
