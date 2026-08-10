"use client";

import { useAuth } from "@/lib/firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode } from "react";

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
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return <>{children}</>;
}
