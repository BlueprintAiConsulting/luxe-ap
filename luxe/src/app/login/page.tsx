"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithGoogleEnsureProfile } from "@/lib/firebase/googleAuth";
import { signInWithAppleEnsureProfile } from "@/lib/firebase/appleAuth";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Role } from "@/lib/firebase/auth";
import { homeForRole } from "@/lib/auth/roleHome";
import { 
  Shield, 
  User, 
  Car, 
  ArrowLeft, 
  Sparkles, 
  Radio, 
  Check, 
  Loader2,
  ChevronRight,
  Send
} from "lucide-react";

const GoogleIcon = () => (
  <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const AppleIcon = () => (
  <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.641-.026 2.677-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.689.827-1.35 2.272-1.156 3.65 1.35.104 2.607-.636 3.443-1.638z" />
  </svg>
);

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [portal, setPortal] = useState<"select" | "rider" | "driver" | "admin">("select");
  const [copiedSms, setCopiedSms] = useState(false);

  // Handle URL parameter auto-login: /login?demo=rider | driver | admin
  useEffect(() => {
    const demoParam = searchParams.get("demo");
    if (demoParam === "rider" || demoParam === "driver" || demoParam === "admin") {
      handleDemoLogin(demoParam);
    }
  }, [searchParams]);

  async function resolveRoleAndNavigate() {
    if (!auth.currentUser) return;
    const token = await auth.currentUser.getIdTokenResult(true);
    const role = (token.claims.role as Role) || "rider";
    const redirectUrl = searchParams.get("redirect");
    
    if (redirectUrl) {
      if (role === "admin" && !redirectUrl.startsWith("/admin") && !redirectUrl.startsWith("/dispatch") && !redirectUrl.startsWith("/radar")) {
        router.replace(homeForRole(role));
        return;
      }
      if (role === "driver" && !redirectUrl.startsWith("/today") && !redirectUrl.startsWith("/portal") && !redirectUrl.startsWith("/trip")) {
        router.replace(homeForRole(role));
        return;
      }
      router.replace(redirectUrl);
    } else {
      router.replace(homeForRole(role));
    }
  }

  // 1-Click Instant Demo Login via Custom Token
  async function handleDemoLogin(targetRole: "rider" | "driver" | "admin") {
    setError("");
    setLoading(true);
    setLoadingRole(targetRole);
    try {
      const { getFunctions, httpsCallable } = await import("firebase/functions");
      const { app } = await import("@/lib/firebase/client");
      
      const loginFn = httpsCallable<{ role: string }, { customToken: string; role: Role; displayName: string }>(
        getFunctions(app),
        "loginAsDemoUser"
      );
      
      const res = await loginFn({ role: targetRole });
      if (res.data?.customToken) {
        await signInWithCustomToken(auth, res.data.customToken);
        const redirectUrl = searchParams.get("redirect");
        if (redirectUrl) {
          router.replace(redirectUrl);
        } else if (targetRole === "admin") {
          router.replace("/radar");
        } else if (targetRole === "driver") {
          router.replace("/today");
        } else {
          router.replace("/book");
        }
      }
    } catch (err: any) {
      console.error("Demo login error:", err);
      setError(`Instant demo login error: ${err.message || String(err)}`);
      setLoading(false);
      setLoadingRole(null);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogleEnsureProfile();
      if (portal === "admin") {
        const { getFunctions, httpsCallable } = await import("firebase/functions");
        const { app } = await import("@/lib/firebase/client");
        const promoteFn = httpsCallable(getFunctions(app), "demoPromoteToAdmin");
        await promoteFn();
        await auth.currentUser?.getIdToken(true);
      }
      await resolveRoleAndNavigate();
    } catch (err: any) {
      console.error(err);
      if (err?.code !== "auth/popup-closed-by-user") {
        setError(`Google sign-in failed: ${err?.code || ""} ${err?.message || String(err)}`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleSignIn() {
    setError("");
    setLoading(true);
    try {
      await signInWithAppleEnsureProfile();
      if (portal === "admin") {
        const { getFunctions, httpsCallable } = await import("firebase/functions");
        const { app } = await import("@/lib/firebase/client");
        const promoteFn = httpsCallable(getFunctions(app), "demoPromoteToAdmin");
        await promoteFn();
        await auth.currentUser?.getIdToken(true);
      }
      await resolveRoleAndNavigate();
    } catch (err: any) {
      console.error(err);
      if (err?.code !== "auth/popup-closed-by-user" && err?.code !== "auth/cancelled-popup-request") {
        setError(`Apple sign-in failed: ${err?.code || ""} ${err?.message || String(err)}`);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleCopyClientMessage() {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://luxe-app-1786335311.web.app";
    const text = `Here is the interactive demo for the LUXE Chauffeured Platform:

👑 VIP Rider Experience:
${origin}/login?demo=rider

🚘 Executive Chauffeur HUD:
${origin}/login?demo=driver

📡 Live Airspace & Ground Radar (Admin):
${origin}/login?demo=admin

(Each link logs you in instantly with zero passwords required)`;

    navigator.clipboard.writeText(text);
    setCopiedSms(true);
    setTimeout(() => setCopiedSms(false), 3000);
  }

  const renderSocialButtons = () => (
    <div className="space-y-3 pt-2">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-white border border-neutral-300 text-neutral-900 font-bold text-sm transition-all hover:bg-neutral-100 active:scale-[0.98] disabled:opacity-50 shadow-md"
      >
        <GoogleIcon />
        <span>{loading ? "Authenticating..." : "Continue with Google"}</span>
      </button>

      <button
        type="button"
        onClick={handleAppleSignIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-neutral-900 hover:bg-black border border-neutral-800 text-white font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 shadow-md"
      >
        <AppleIcon />
        <span>{loading ? "Authenticating..." : "Continue with Apple"}</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-neutral-950 py-10 px-4 sm:px-6 lg:px-8 relative selection:bg-accent selection:text-neutral-950">
      {/* Ambient background lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-neutral-950/80 to-neutral-950 pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        
        {/* Luxury Glass Card */}
        <div className="bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          
          {/* Header */}
          <div className="relative flex flex-col items-center text-center">
            {portal !== "select" && (
              <button 
                onClick={() => setPortal("select")} 
                className="absolute left-0 top-1 text-neutral-400 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-neutral-800"
                title="Back to portal selection"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[11px] font-bold uppercase tracking-widest mb-3">
              <Sparkles size={12} /> Executive Mobility System
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white uppercase leading-none font-serif">
              LUXE
            </h1>
            <p className="text-xs text-neutral-400 mt-2 font-medium">
              {portal === "select" && "Select a portal or tap a 1-click demo to begin"}
              {portal === "rider" && "Sign in as a VIP Client with Google or Apple"}
              {portal === "driver" && "Sign in to Chauffeur Cockpit with Google or Apple"}
              {portal === "admin" && "Sign in to Dispatch & Radar with Google or Apple"}
            </p>
          </div>

          {error && (
            <div className="bg-red-950/50 border border-red-800/80 text-red-200 text-xs p-4 rounded-2xl flex items-start gap-3">
              <div className="w-1.5 h-full bg-red-500 rounded-full shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* MAIN PORTAL SELECTOR & 1-CLICK DEMO LAUNCHER */}
          {portal === "select" && (
            <div className="space-y-4">
              
              {/* 1-Click Instant Demo Launchers */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                  <span>1-Click Client Demo Access</span>
                  <span className="text-accent font-semibold flex items-center gap-1 text-[10px]">
                    <Sparkles size={11} /> Instant Launch
                  </span>
                </div>

                {/* Demo: VIP Rider */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoLogin("rider")}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-neutral-800/90 to-neutral-850 border border-neutral-700/80 hover:border-accent rounded-2xl transition-all group text-left active:scale-[0.98] shadow-md"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                      <User size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white group-hover:text-accent transition-colors flex items-center gap-2">
                        VIP Rider Experience
                        <span className="text-[9px] font-mono bg-accent/20 text-accent px-1.5 py-0.5 rounded font-bold uppercase">Client</span>
                      </div>
                      <div className="text-xs text-neutral-400">Luxury 6-Step Booking & Live Tracking</div>
                    </div>
                  </div>
                  {loading && loadingRole === "rider" ? (
                    <Loader2 size={18} className="animate-spin text-accent" />
                  ) : (
                    <ChevronRight size={18} className="text-neutral-500 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                  )}
                </button>

                {/* Demo: Chauffeur */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoLogin("driver")}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-neutral-800/90 to-neutral-850 border border-neutral-700/80 hover:border-amber-400 rounded-2xl transition-all group text-left active:scale-[0.98] shadow-md"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                      <Car size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors flex items-center gap-2">
                        Executive Chauffeur HUD
                        <span className="text-[9px] font-mono bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase">Cockpit</span>
                      </div>
                      <div className="text-xs text-neutral-400">Active Schedule, Grace Countdown & Actuals</div>
                    </div>
                  </div>
                  {loading && loadingRole === "driver" ? (
                    <Loader2 size={18} className="animate-spin text-amber-400" />
                  ) : (
                    <ChevronRight size={18} className="text-neutral-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  )}
                </button>

                {/* Demo: Admin & Live Radar */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoLogin("admin")}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-neutral-800/90 to-neutral-850 border border-neutral-700/80 hover:border-cyan-400 rounded-2xl transition-all group text-left active:scale-[0.98] shadow-md"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-cyan-400/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                      <Radio size={20} className="animate-pulse" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors flex items-center gap-2">
                        Airspace Radar & Dispatch
                        <span className="text-[9px] font-mono bg-cyan-400/20 text-cyan-400 px-1.5 py-0.5 rounded font-bold uppercase">Command</span>
                      </div>
                      <div className="text-xs text-neutral-400">60fps Live Planes, Fleet & Affiliate Vault</div>
                    </div>
                  </div>
                  {loading && loadingRole === "admin" ? (
                    <Loader2 size={18} className="animate-spin text-cyan-400" />
                  ) : (
                    <ChevronRight size={18} className="text-neutral-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                  )}
                </button>
              </div>

              {/* Share / Text Client Box */}
              <div className="pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={handleCopyClientMessage}
                  className="w-full py-3.5 px-4 bg-accent hover:bg-accent/90 text-neutral-950 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
                >
                  {copiedSms ? (
                    <>
                      <Check size={16} className="text-neutral-950 font-bold" /> Copied Text Message to Clipboard!
                    </>
                  ) : (
                    <>
                      <Send size={15} /> Copy SMS / Email Demo Text for Client
                    </>
                  )}
                </button>
                <p className="text-[10px] text-neutral-500 text-center mt-2 font-medium">
                  Copies pre-formatted direct deep links for your client to tap and open on iPhone or Android.
                </p>
              </div>

              {/* Social Login Direct Launchers */}
              <div className="pt-3 border-t border-neutral-800">
                <div className="text-xs text-neutral-400 text-center mb-3">Or sign in with your verified account:</div>
                {renderSocialButtons()}
              </div>

            </div>
          )}

          {/* DEDICATED ROLE SELECTION GOOGLE/APPLE SIGN IN */}
          {(portal === "rider" || portal === "driver" || portal === "admin") && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center p-4 bg-neutral-950/70 border border-neutral-800/80 rounded-2xl">
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Authenticating For</div>
                <div className="text-base font-bold text-white flex items-center justify-center gap-2">
                  {portal === "rider" && <><User size={16} className="text-accent" /> VIP Rider / Client Portal</>}
                  {portal === "driver" && <><Car size={16} className="text-amber-400" /> Executive Chauffeur Cockpit</>}
                  {portal === "admin" && <><Shield size={16} className="text-cyan-400" /> Operations & Radar Admin</>}
                </div>
              </div>
              
              {renderSocialButtons()}
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="text-center">
          <p className="text-[11px] text-neutral-600 font-medium">
            LUXE Chauffeured Mobility &copy; 2026. Private & Confidential.
          </p>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center bg-neutral-950 py-12 px-4" />}>
      <LoginContent />
    </Suspense>
  );
}
