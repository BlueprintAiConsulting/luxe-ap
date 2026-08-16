"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff, RefreshCw } from "lucide-react";

export default function NetworkStatusBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-rose-600 text-white px-4 py-2 text-xs font-mono font-bold flex items-center justify-between shadow-2xl animate-in slide-in-from-top-2">
      <div className="flex items-center gap-2">
        <WifiOff size={15} className="animate-pulse shrink-0" />
        <span>Network Disconnected — Operating in Offline Cache Mode</span>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="px-2.5 py-1 bg-black/30 hover:bg-black/50 rounded-lg text-[10px] uppercase font-bold flex items-center gap-1 transition-all active:scale-95 shrink-0"
      >
        <RefreshCw size={11} />
        <span>Reconnect</span>
      </button>
    </div>
  );
}
