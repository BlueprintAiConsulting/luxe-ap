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
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen bg-neutral-50 font-sans text-neutral-900">
      <AdminNav />
      <div className="flex-1 lg:ml-64 pt-16 lg:pt-0">
        {children}
      </div>
    </div>
  );
}
