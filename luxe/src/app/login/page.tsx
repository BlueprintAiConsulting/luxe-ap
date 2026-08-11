"use client";

import { useState, useEffect, Suspense } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | undefined;
  }
}

type AuthMode = "phone" | "email" | "profile";

function LoginContent() {
  const [mode, setMode] = useState<AuthMode>("phone");
  
  // Phone State
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  // Email State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Profile State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  
  // General State
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle Redirection and Profile Check
  useEffect(() => {
    if (user && mode !== "profile") {
      const checkProfile = async () => {
        setLoading(true);
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (!data.firstName || !data.lastName) {
              setMode("profile");
            } else {
              const redirect = searchParams.get("redirect") || "/dashboard";
              router.push(redirect);
            }
          } else {
            // Document not created by trigger yet? Wait a bit or show profile
            setMode("profile");
          }
        } catch (e) {
          console.error("Error checking profile:", e);
        } finally {
          setLoading(false);
        }
      };
      checkProfile();
    }
  }, [user, mode, router, searchParams]);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
    }
  }, []);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      let formattedPhone = phoneNumber.trim();
      if (!formattedPhone.startsWith("+")) {
        formattedPhone = "+1" + formattedPhone.replace(/\D/g, "");
      }
      
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError("Failed to send verification code. Please check your number.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setError("");
    setLoading(true);
    try {
      await confirmationResult.confirm(verificationCode);
      // user state changes, triggering useEffect
    } catch (err: any) {
      console.error(err);
      setError("Invalid or expired verification code.");
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // user state changes, triggering useEffect
    } catch (err: any) {
      console.error(err);
      setError("Invalid email or password.");
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: profileEmail.trim() || null,
        updatedAt: new Date()
      });
      const redirect = searchParams.get("redirect") || "/dashboard";
      router.push(redirect);
    } catch (err: any) {
      console.error(err);
      setError("Failed to save profile.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-sm p-6 bg-white border border-gray-200 rounded-xl shadow-lg sm:p-8">
        <div className="flex justify-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">LUXE</h1>
        </div>
        <h5 className="mb-6 text-xl font-medium text-center text-gray-900">
          {mode === "profile" ? "Complete your profile" : (mode === "phone" ? "Sign in to Luxe" : "Admin Sign In")}
        </h5>
        
        {error && (
          <div className="mb-4 p-3 text-sm text-red-800 rounded-lg bg-red-50 border border-red-200" role="alert">
            {error}
          </div>
        )}

        {mode === "phone" && !confirmationResult && (
          <form className="space-y-6" onSubmit={handleSendCode}>
            <div>
              <label htmlFor="phone" className="block mb-2 text-sm font-medium text-gray-900">Phone Number</label>
              <input
                type="tel"
                name="phone"
                id="phone"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-3"
                placeholder="(555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !phoneNumber}
              className="w-full text-white bg-black hover:bg-gray-800 focus:ring-4 focus:outline-none focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-3 text-center transition-colors disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Verification Code"}
            </button>
            <div className="text-center mt-6">
              <button type="button" onClick={() => setMode("email")} className="text-sm text-gray-500 hover:text-black transition-colors">
                Sign in with email (Admin)
              </button>
            </div>
          </form>
        )}

        {mode === "phone" && confirmationResult && (
          <form className="space-y-6" onSubmit={handleVerifyCode}>
            <div>
              <label htmlFor="code" className="block mb-2 text-sm font-medium text-gray-900">6-digit Verification Code</label>
              <input
                type="text"
                name="code"
                id="code"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-3 text-center tracking-widest text-lg"
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                maxLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading || verificationCode.length < 6}
              className="w-full text-white bg-black hover:bg-gray-800 focus:ring-4 focus:outline-none focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-3 text-center transition-colors disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>
            <button
              type="button"
              className="w-full text-sm text-gray-500 hover:text-black transition-colors mt-4 block text-center"
              onClick={() => {
                setConfirmationResult(null);
                setVerificationCode("");
                setError("");
              }}
            >
              Use a different phone number
            </button>
          </form>
        )}

        {mode === "email" && (
          <form className="space-y-6" onSubmit={handleEmailLogin}>
            <div>
              <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900">Email Address</label>
              <input
                type="email"
                id="email"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-3"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-900">Password</label>
              <input
                type="password"
                id="password"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-3"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full text-white bg-black hover:bg-gray-800 focus:ring-4 focus:outline-none focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-3 text-center transition-colors disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
            <div className="text-center mt-6">
              <button type="button" onClick={() => setMode("phone")} className="text-sm text-gray-500 hover:text-black transition-colors">
                Sign in with Phone (Rider)
              </button>
            </div>
          </form>
        )}

        {mode === "profile" && (
          <form className="space-y-6" onSubmit={handleSaveProfile}>
            <p className="text-sm text-gray-600 text-center mb-4">Welcome! Let's get your name before booking a ride.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block mb-2 text-sm font-medium text-gray-900">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-3"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block mb-2 text-sm font-medium text-gray-900">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-3"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="profileEmail" className="block mb-2 text-sm font-medium text-gray-900">Email <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input
                type="email"
                id="profileEmail"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-3"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                placeholder="For receipts"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !firstName || !lastName}
              className="w-full text-white bg-black hover:bg-gray-800 focus:ring-4 focus:outline-none focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-3 text-center transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Profile & Continue"}
            </button>
          </form>
        )}

        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
