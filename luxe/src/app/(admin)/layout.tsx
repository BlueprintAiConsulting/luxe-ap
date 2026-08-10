"use client";

import { useAuth } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login?redirect=/admin");
      } else if (role !== "admin") {
        router.push("/");
      }
    }
  }, [user, role, loading, router]);

  if (loading || !user || role !== "admin") {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return <>{children}</>;
}
