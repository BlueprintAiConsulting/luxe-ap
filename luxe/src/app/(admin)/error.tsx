"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center font-sans">
      <div className="p-4 rounded-full bg-rose-950/40 border border-rose-800/60 text-rose-400 mb-4">
        <AlertCircle className="w-10 h-10" />
      </div>
      <h2 className="text-xl font-bold font-serif text-white mb-2">Operational Interruption</h2>
      <p className="text-neutral-400 text-xs font-mono mb-6 max-w-sm">
        An unexpected exception occurred while loading this dispatch module.
      </p>
      <button
        onClick={() => reset()}
        className="min-h-[44px] bg-gold-gradient text-neutral-950 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:brightness-110 shadow-gold-sm transition-all"
      >
        Retry Interface
      </button>
    </div>
  );
}