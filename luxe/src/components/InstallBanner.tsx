"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export default function InstallBanner() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  if (!isInstallable || dismissed) return null;

  return (
    <div className="bg-neutral-900 text-white p-3 flex items-center justify-between shadow-md">
      <div className="flex items-center space-x-3">
        <div className="bg-neutral-800 p-2 rounded-lg">
          <Download className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold text-sm">Install Luxe Driver</p>
          <p className="text-xs text-neutral-400">Add to home screen for quick access</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <button onClick={handleInstall} className="text-sm font-semibold text-blue-400">
          Install
        </button>
        <button onClick={() => setDismissed(true)} className="text-neutral-500">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
