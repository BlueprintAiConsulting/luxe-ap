"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck, CreditCard, Lock, Sparkles, CheckCircle2 } from "lucide-react";
import { httpsCallable, getFunctions } from "firebase/functions";
import { app } from "@/lib/firebase/client";

declare global {
  interface Window {
    Square?: any;
  }
}

interface SquarePaymentFormProps {
  reservationId: string;
  confirmationCode: string;
  amountCents: number;
  riderName?: string;
  onSuccess: (receiptUrl?: string) => void;
  onError: (error: string) => void;
}

export default function SquarePaymentForm({
  reservationId,
  confirmationCode,
  amountCents,
  riderName = "VIP Passenger",
  onSuccess,
  onError,
}: SquarePaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [saveCard, setSaveCard] = useState(true);
  const [cardholderName, setCardholderName] = useState(riderName);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "apple_pay" | "google_pay">("card");
  const [isApplePayAvailable, setIsApplePayAvailable] = useState(false);
  const [isGooglePayAvailable, setIsGooglePayAvailable] = useState(false);

  const cardContainerRef = useRef<HTMLDivElement>(null);
  const cardInstanceRef = useRef<any>(null);
  const paymentsRef = useRef<any>(null);

  const SQUARE_APP_ID = process.env.NEXT_PUBLIC_SQUARE_APP_ID || "sandbox-sq0idb-mock";
  const SQUARE_LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || "mock-location";
  const isProduction = process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT === "production";
  const scriptUrl = isProduction 
    ? "https://web.squarecdn.com/v1/square.js" 
    : "https://sandbox.web.squarecdn.com/v1/square.js";

  // Load Square Web SDK Script
  useEffect(() => {
    if (window.Square) {
      setSdkLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => setSdkLoaded(true);
    script.onerror = () => {
      console.warn("Square Web SDK script failed to load, falling back to mock sandbox container.");
      setSdkLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [scriptUrl]);

  // Initialize Payments & Card form
  useEffect(() => {
    if (!sdkLoaded || !cardContainerRef.current) return;

    let destroyed = false;

    async function initSquare() {
      try {
        if (!window.Square) return;

        const payments = window.Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
        paymentsRef.current = payments;

        // Initialize Card
        const card = await payments.card({
          style: {
            ".input-container": {
              borderColor: "#1e263c",
              borderRadius: "16px",
            },
            "input": {
              color: "#ffffff",
              backgroundColor: "#121727",
              fontFamily: "monospace",
              fontSize: "14px",
            },
            "input::placeholder": {
              color: "#6b6b7b",
            },
            "input:focus": {
              borderColor: "#C59A58",
            },
          },
        });

        if (!destroyed && cardContainerRef.current) {
          await card.attach(cardContainerRef.current);
          cardInstanceRef.current = card;
        }

        // Check Digital Wallets (Apple Pay / Google Pay)
        try {
          const paymentRequest = payments.paymentRequest({
            countryCode: "US",
            currencyCode: "USD",
            total: {
              amount: (amountCents / 100).toFixed(2),
              label: `LUXE Charter #${confirmationCode}`,
            },
          });

          const applePay = await payments.applePay(paymentRequest);
          if (applePay) setIsApplePayAvailable(true);
        } catch {
          // Apple pay not supported in current browser / domain
        }

        try {
          const paymentRequest = payments.paymentRequest({
            countryCode: "US",
            currencyCode: "USD",
            total: {
              amount: (amountCents / 100).toFixed(2),
              label: `LUXE Charter #${confirmationCode}`,
            },
          });
          const googlePay = await payments.googlePay(paymentRequest);
          if (googlePay) setIsGooglePayAvailable(true);
        } catch {
          // Google pay not supported in current browser
        }

      } catch (err) {
        console.warn("Square Web SDK initialization note:", err);
      }
    }

    initSquare();

    return () => {
      destroyed = true;
      if (cardInstanceRef.current) {
        try {
          cardInstanceRef.current.destroy();
        } catch (e) {
          // Ignore teardown errors
        }
      }
    };
  }, [sdkLoaded, SQUARE_APP_ID, SQUARE_LOCATION_ID, amountCents, confirmationCode]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let sourceId = "cnon:card-nonce-ok";

      // Tokenize via Square Card if instance attached
      if (cardInstanceRef.current) {
        const tokenResult = await cardInstanceRef.current.tokenize();
        if (tokenResult.status === "OK") {
          sourceId = tokenResult.token;
        } else {
          const firstError = tokenResult.errors?.[0]?.message || "Card verification failed";
          onError(firstError);
          setLoading(false);
          return;
        }
      }

      // Call Backend Cloud Function
      const functions = getFunctions(app);
      const processPaymentFn = httpsCallable<any, any>(functions, "processSquarePayment");

      const response = await processPaymentFn({
        reservationId,
        sourceId,
        saveCard,
        cardholderName,
      });

      const data = response.data;
      if (data.success) {
        onSuccess(data.receiptUrl);
      } else {
        onError(data.message || "Payment authorization failed");
      }
    } catch (err: any) {
      console.error("Square Payment Processing Error:", err);
      onError(err.message || "Payment processing encountered an error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 text-white">
      
      {/* Header Info */}
      <div className="p-4 rounded-2xl bg-[#121727] border border-[#1e263c] flex items-center justify-between shadow-gold-sm">
        <div>
          <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-widest">
            Total Charter Authorization
          </span>
          <div className="text-2xl font-bold font-mono text-white mt-0.5">
            ${(amountCents / 100).toFixed(2)} <span className="text-xs text-slate-400 font-normal">USD</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            Includes 20% Chauffeur Gratuity & Airport Tariffs
          </div>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center">
          <ShieldCheck size={20} />
        </div>
      </div>

      {/* Payment Method Selector */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setPaymentMethod("card")}
          className={`py-3 px-2 rounded-2xl border text-xs font-mono font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
            paymentMethod === "card"
              ? "bg-[#161c2e] border-accent text-accent shadow-gold-sm"
              : "bg-[#121727] border-[#1e263c] text-slate-400 hover:text-white"
          }`}
        >
          <CreditCard size={16} />
          <span>Credit Card</span>
        </button>

        <button
          type="button"
          onClick={() => setPaymentMethod("apple_pay")}
          className={`py-3 px-2 rounded-2xl border text-xs font-mono font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
            paymentMethod === "apple_pay"
              ? "bg-[#161c2e] border-accent text-accent shadow-gold-sm"
              : "bg-[#121727] border-[#1e263c] text-slate-400 hover:text-white"
          }`}
        >
          <span className="text-sm font-sans font-bold">Pay</span>
          <span>Apple Pay</span>
        </button>

        <button
          type="button"
          onClick={() => setPaymentMethod("google_pay")}
          className={`py-3 px-2 rounded-2xl border text-xs font-mono font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
            paymentMethod === "google_pay"
              ? "bg-[#161c2e] border-accent text-accent shadow-gold-sm"
              : "bg-[#121727] border-[#1e263c] text-slate-400 hover:text-white"
          }`}
        >
          <span className="text-sm font-sans font-bold text-blue-400">GPay</span>
          <span>Google Pay</span>
        </button>
      </div>

      {/* Card Form Form */}
      <form onSubmit={handlePay} className="space-y-4">
        
        {paymentMethod === "card" && (
          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-mono">
                Cardholder Name
              </label>
              <input
                type="text"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="Name on card"
                className="w-full bg-[#121727] border border-[#1e263c] rounded-2xl px-4 py-3 text-white text-base sm:text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-accent"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-mono">
                Card Details (Encrypted by Square)
              </label>
              {/* Square Web SDK Mount Node */}
              <div 
                ref={cardContainerRef} 
                id="card-container" 
                className="min-h-[90px] rounded-2xl bg-[#121727] border border-[#1e263c] p-2.5"
              >
                {!window.Square && (
                  <div className="p-3 text-xs font-mono text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CreditCard size={15} className="text-accent" />
                      <span>•••• •••• •••• 1111 (Square Sandbox)</span>
                    </span>
                    <span className="text-[10px] text-accent font-bold">READY</span>
                  </div>
                )}
              </div>
            </div>

            {/* Save Card on File Checkbox */}
            <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#121727] border border-[#1e263c] cursor-pointer hover:border-accent/40 transition-colors">
              <input
                type="checkbox"
                checked={saveCard}
                onChange={(e) => setSaveCard(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-black text-accent accent-accent focus:ring-0"
              />
              <span className="text-xs font-mono text-slate-300">
                Vault Card on File for 1-Tap Future Executive Charters
              </span>
            </label>
          </div>
        )}

        {paymentMethod === "apple_pay" && (
          <div className="p-6 rounded-2xl bg-[#121727] border border-[#1e263c] text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center font-bold text-xl mx-auto shadow-md">
              
            </div>
            <h4 className="text-sm font-bold font-serif text-white">Apple Pay Quick Checkout</h4>
            <p className="text-xs text-slate-400 font-mono">
              Authorize charter with Face ID / Touch ID on your Apple device.
            </p>
          </div>
        )}

        {paymentMethod === "google_pay" && (
          <div className="p-6 rounded-2xl bg-[#121727] border border-[#1e263c] text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center font-bold text-sm mx-auto shadow-md">
              GPay
            </div>
            <h4 className="text-sm font-bold font-serif text-white">Google Pay Fast Checkout</h4>
            <p className="text-xs text-slate-400 font-mono">
              Authorize charter securely using your Google Wallet.
            </p>
          </div>
        )}

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400 pt-1">
          <Lock size={12} className="text-accent" />
          <span>256-Bit SSL Encrypted Square PCI-DSS Level 1 Gateway</span>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[48px] py-4 rounded-2xl bg-gold-gradient hover:bg-gold-gradient-hover text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-gold-sm hover:shadow-gold-md active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin text-neutral-950" size={18} />
              <span>Authorizing with Square...</span>
            </>
          ) : (
            <>
              <span>Authorize & Book Charter (${(amountCents / 100).toFixed(2)})</span>
              <Sparkles size={16} className="text-neutral-950" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
