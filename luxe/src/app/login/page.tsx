"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithGoogleEnsureProfile } from "@/lib/firebase/googleAuth";
import { signInWithAppleEnsureProfile } from "@/lib/firebase/appleAuth";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Shield, Mail, KeyRound, ChevronDown, ChevronUp } from "lucide-react";

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  function navigateAfterAuth(path: string) {
    router.replace(path);
  }

  async function handleGoogleSignIn() {
    setError("");
    setGoogleLoading(true);
    try {
      const nextPath = searchParams.get("redirect") || "/dashboard";
      await signInWithGoogleEnsureProfile();
      navigateAfterAuth(nextPath);
    } catch (err: any) {
      console.error(err);
      if (err?.code === "auth/popup-closed-by-user") {
        // User closed the popup — no error needed.
      } else {
        setError(`Google sign-in failed: ${err?.code || ""} ${err?.message || String(err)}`);
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleAppleSignIn() {
    setError("");
    setAppleLoading(true);
    try {
      const nextPath = searchParams.get("redirect") || "/dashboard";
      await signInWithAppleEnsureProfile();
      navigateAfterAuth(nextPath);
    } catch (err: any) {
      console.error(err);
      if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") {
        // User closed the popup — no error needed.
      } else {
        setError(`Apple sign-in failed: ${err?.code || ""} ${err?.message || String(err)}`);
      }
    } finally {
      setAppleLoading(false);
    }
  }

  async function handleAdminSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAdminLoading(true);

    const cleanEmail = adminEmail.trim().toLowerCase();
    const cleanPassword = adminPassword.trim();

    if (!cleanEmail || !cleanPassword) {
      setError("Please enter your admin email and password.");
      setAdminLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      // Ensure admin users go straight to dispatch/admin view or their specific redirect
      const nextPath = searchParams.get("redirect") || "/dispatch";
      navigateAfterAuth(nextPath);
    } catch (err: any) {
      console.error("Admin sign in failed:", err);
      setError(err?.message || "Admin login failed. Check email & password.");
    } finally {
      setAdminLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      <div className="max-w-md w-full relative z-10 transition-all duration-500">
        <div className="space-y-8 bg-white p-8 sm:p-10 rounded-2xl border border-neutral-200 shadow-xl relative overflow-hidden">
          
          <div className="relative flex flex-col items-center">
            <div className="space-y-2 text-center mb-6">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-brand uppercase leading-none">
                LUXE
              </h1>
              <p className="text-sm text-neutral-500 font-medium">
                Sign in to book or manage rides.
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-4 rounded-xl flex items-start gap-3">
              <div className="w-1 h-full bg-red-500 rounded-full mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || appleLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl bg-white border border-neutral-300 text-brand font-semibold text-base transition-all hover:bg-neutral-50 disabled:opacity-50"
            >
              <GoogleIcon />
              <span>
                {googleLoading ? "Authenticating..." : "Continue with Google"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleAppleSignIn}
              disabled={googleLoading || appleLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl bg-brand text-white font-semibold text-base transition-all hover:bg-neutral-900 disabled:opacity-50"
            >
              <AppleIcon />
              <span>
                {appleLoading ? "Authenticating..." : "Continue with Apple"}
              </span>
            </button>
          </div>

          {/* Staff & Admin Login Section */}
          <div className="mt-8 pt-6 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setShowAdminLogin(!showAdminLogin)}
              className="w-full flex items-center justify-between text-sm font-semibold text-neutral-500 hover:text-brand transition-colors py-3 px-3 rounded-lg"
            >
              <span className="flex items-center gap-2">
                <Shield size={16} aria-hidden="true" /> Staff & Admin Login
              </span>
              {showAdminLogin ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
            </button>

            {showAdminLogin && (
              <form onSubmit={handleAdminSignIn} className="mt-4 space-y-4 bg-neutral-50 p-5 rounded-xl">
                <div className="text-sm font-semibold text-neutral-600 mb-2 flex items-center justify-between">
                  <span>Admin Credentials</span>
                  <span className="text-xs text-neutral-400 font-normal">Staff Portal</span>
                </div>
                <div>
                  <label htmlFor="admin-email" className="block text-sm font-semibold text-neutral-700 mb-1">Admin Email</label>
                  <div className="relative">
                    <Mail size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      id="admin-email"
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@luxe.com"
                      className="w-full pl-9 pr-3 py-3 bg-white border border-neutral-300 rounded-lg text-base text-brand focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand placeholder:text-neutral-400"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="admin-password" className="block text-sm font-semibold text-neutral-700 mb-1">Password</label>
                  <div className="relative">
                    <KeyRound size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      id="admin-password"
                      type="password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter admin password"
                      className="w-full pl-9 pr-3 py-3 bg-white border border-neutral-300 rounded-lg text-base text-brand focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand placeholder:text-neutral-400"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={adminLoading}
                  className="w-full mt-4 py-3 px-4 rounded-xl bg-brand text-white font-semibold text-base hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Shield size={16} aria-hidden="true" />
                  {adminLoading ? "Authenticating Admin..." : "Sign In as Admin"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center bg-neutral-50 py-12 px-4" />}>
      <LoginContent />
    </Suspense>
  );
}
