"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/lib/firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | undefined;
  }
}

function LoginContent() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (user) {
      const redirect = searchParams.get("redirect") || "/";
      router.push(redirect);
    }
  }, [user, router, searchParams]);

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
      // Basic E.164 normalization (assuming US by default if missing +)
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
      // AuthProvider will detect the user and redirect automatically
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-verification-code") {
        setError("Invalid verification code. Please try again.");
      } else if (err.code === "auth/code-expired") {
        setError("Verification code expired. Please request a new one.");
      } else {
        setError("Failed to verify code.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow sm:p-8">
        <h5 className="mb-4 text-xl font-medium text-gray-900">Sign in to Luxe</h5>
        
        {error && (
          <div className="mb-4 p-3 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
            {error}
          </div>
        )}

        {!confirmationResult ? (
          <form className="space-y-6" onSubmit={handleSendCode}>
            <div>
              <label htmlFor="phone" className="block mb-2 text-sm font-medium text-gray-900">Phone Number</label>
              <input
                type="tel"
                name="phone"
                id="phone"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                placeholder="(555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !phoneNumber}
              className="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Verification Code"}
            </button>
          </form>
        ) : (
          <form className="space-y-6" onSubmit={handleVerifyCode}>
            <div>
              <label htmlFor="code" className="block mb-2 text-sm font-medium text-gray-900">Verification Code</label>
              <input
                type="text"
                name="code"
                id="code"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !verificationCode}
              className="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>
            <button
              type="button"
              className="w-full text-sm text-blue-700 hover:underline"
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
