"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function MeetingPresentationDeckPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin-dashboard");
  }, [router]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center text-neutral-400 font-mono">
      <Loader2 className="w-8 h-8 animate-spin text-accent mb-4" />
      <p className="text-xs">Presentation deck archived. Redirecting to Operations Dashboard...</p>
    </div>
  );
}
