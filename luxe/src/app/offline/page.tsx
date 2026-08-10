"use client";

import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-white dark:bg-neutral-950">
      <div className="p-4 rounded-full bg-neutral-100 dark:bg-neutral-900 mb-4">
        <WifiOff className="w-12 h-12 text-neutral-400" />
      </div>
      <h1 className="text-2xl font-bold mb-2">You're offline</h1>
      <p className="text-neutral-500 mb-8 max-w-sm">
        Please check your internet connection to continue using Luxe.
      </p>
      <button 
        onClick={() => window.location.reload()} 
        className="bg-black text-white px-6 py-3 rounded-xl font-medium"
      >
        Try Again
      </button>
    </div>
  );
}
