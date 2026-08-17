"use client";

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  PhoneCall, 
  Car, 
  DollarSign, 
  Plane, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Globe, 
  Smartphone, 
  Radio, 
  TrendingUp, 
  Zap,
  Users,
  Award,
  Lock,
  ExternalLink
} from "lucide-react";
import Link from "next/link";

interface Slide {
  id: number;
  tag: string;
  title: string;
  subtitle: string;
  content: React.ReactNode;
}

export default function MeetingPresentationDeckPage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: Slide[] = [
    // Slide 1: Title & Vision
    {
      id: 1,
      tag: "Executive Strategy",
      title: "The 24/7 AI Livery Dispatcher & VIP Ecosystem",
      subtitle: "Eliminating the phone ringing bottleneck while elevating your luxury chauffeur brand to private aviation standards.",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="p-6 rounded-3xl bg-[#121218] border border-neutral-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center font-bold">
                <PhoneCall size={20} />
              </div>
              <h3 className="text-base font-bold text-white">24/7 AI Voice Dispatch</h3>
              <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                Answers in 1 ring, quotes exact fares, provides driver ETAs, and auto-reschedules delayed flights.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#121218] border border-neutral-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center font-bold">
                <Smartphone size={20} />
              </div>
              <h3 className="text-base font-bold text-white">VIP Rider & Driver Apps</h3>
              <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                Live GPS vector map, curbside concierge chat, comfort checklists, and instant 1-tap Apple Pay.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#121218] border border-neutral-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center font-bold">
                <Globe size={20} />
              </div>
              <h3 className="text-base font-bold text-white">Web & Google Domination</h3>
              <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                High-converting booking portal for executive assistants + Google Business review automation.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-between text-xs font-mono text-neutral-400">
            <span>Prepared for Owner Strategy Session</span>
            <span className="text-accent font-bold">14-Day Zero-Risk Pilot Ready</span>
          </div>
        </div>
      )
    },

    // Slide 2: The Core Problem
    {
      id: 2,
      tag: "The Bottleneck",
      title: "Why Your Phone Rings Every Minute",
      subtitle: "In luxury livery, the owner becomes a 24/7 human switchboard—trapped on calls while driving or sleeping.",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-[#121727] border border-rose-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-rose-400 font-bold">40% of Calls</span>
                <Car size={16} className="text-rose-400" />
              </div>
              <h4 className="text-sm font-bold text-white">"Where is my driver?"</h4>
              <p className="text-xs text-slate-400 font-mono">
                Clients standing at LAX Door 4 calling for ETAs, license plates, and driver phone numbers.
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-[#141b30] border border-accent/40 space-y-2 shadow-gold-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-accent font-bold">30% of Calls</span>
                <DollarSign size={16} className="text-accent" />
              </div>
              <h4 className="text-sm font-bold text-white">"How much for tomorrow morning?"</h4>
              <p className="text-xs text-slate-400 font-mono">
                Manual quote calculations, writing notes on napkins, and typing credit cards over the phone.
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-[#121727] border border-blue-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-blue-400 font-bold">15% of Calls</span>
                <Plane size={16} className="text-blue-400" />
              </div>
              <h4 className="text-sm font-bold text-white">"My flight was delayed 2 hours"</h4>
              <p className="text-xs text-slate-400 font-mono">
                Scrambling driver staging times at midnight and calling drivers to adjust routes.
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-[#121727] border border-purple-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-purple-400 font-bold">Missed Revenue</span>
                <Zap size={16} className="text-purple-400" />
              </div>
              <h4 className="text-sm font-bold text-white">The "Busy Line" Trap</h4>
              <p className="text-xs text-slate-400 font-mono">
                When you're on a call with one client, a $1,200 multi-day charter calls in, hits voicemail, and calls your competitor.
              </p>
            </div>
          </div>
        </div>
      )
    },

    // Slide 3: The 360° Solution
    {
      id: 3,
      tag: "The Solution",
      title: "The 360° Luxury Livery Machine",
      subtitle: "A unified ecosystem that protects your time, elevates customer experience, and scales revenue.",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-[#121727] border border-[#1e263c] space-y-3">
              <div className="flex items-center gap-2 text-accent font-bold text-xs font-mono">
                <PhoneCall size={15} /> 1. 24/7 AI Voice & SMS Dispatcher
              </div>
              <ul className="text-xs text-slate-300 font-mono space-y-1.5 list-disc list-inside">
                <li>Answers in 1 ring with natural luxury British/American voice</li>
                <li>Queries live GPS and texts tracking link in 3 seconds</li>
                <li>Calculates exact tariffs & texts 1-tap Apple Pay checkout</li>
                <li>Auto-monitors flight radar and updates driver staging</li>
              </ul>
            </div>

            <div className="p-5 rounded-3xl bg-[#121727] border border-[#1e263c] space-y-3">
              <div className="flex items-center gap-2 text-accent font-bold text-xs font-mono">
                <Globe size={15} /> 2. Web Portal & Google SEO Engine
              </div>
              <ul className="text-xs text-slate-300 font-mono space-y-1.5 list-disc list-inside">
                <li>High-converting booking page for Executive Assistants</li>
                <li>Corporate billing & invoice portals</li>
                <li>Google Business Profile review automation</li>
                <li>Dominates local FBO / Airport luxury keywords</li>
              </ul>
            </div>

            <div className="p-5 rounded-3xl bg-[#121727] border border-[#1e263c] space-y-3">
              <div className="flex items-center gap-2 text-accent font-bold text-xs font-mono">
                <Smartphone size={15} /> 3. VIP Rider Mobile Experience
              </div>
              <ul className="text-xs text-slate-300 font-mono space-y-1.5 list-disc list-inside">
                <li>Live GPS vector map of assigned Mercedes/Escalade</li>
                <li>Curbside real-time concierge chat with quick chips</li>
                <li>Executive PDF tax invoices & itinerary export</li>
                <li>Custom cabin preferences (Fiji water, 68° temp)</li>
              </ul>
            </div>

            <div className="p-5 rounded-3xl bg-[#121727] border border-[#1e263c] space-y-3">
              <div className="flex items-center gap-2 text-accent font-bold text-xs font-mono">
                <Radio size={15} /> 4. Chauffeur Cockpit & Radar
              </div>
              <ul className="text-xs text-slate-300 font-mono space-y-1.5 list-disc list-inside">
                <li>Driver journey checklist with VIP passenger notes</li>
                <li>Automated GPS telemetry broadcaster</li>
                <li>Airspace & ground fleet radar synchronization</li>
                <li>Actuals logger (Tolls, Parking, Wait time)</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },

    // Slide 4: Live Interactive Scenarios
    {
      id: 4,
      tag: "Live Demo",
      title: "Experience the AI Dispatcher in Action",
      subtitle: "See how Eleanor and Julian resolve the 4 most common phone calls with zero human effort.",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            <div className="p-4 rounded-3xl bg-[#121218] border border-neutral-800 space-y-2">
              <div className="text-[10px] font-mono text-accent uppercase font-bold">Scenario A • 40% of Calls</div>
              <h4 className="text-sm font-bold text-white">"Where is my driver at LAX?"</h4>
              <p className="text-xs text-neutral-400 font-mono">
                AI queries GPS ➔ Speaks Marcus ETA (4 mins away, Plate LUXE-77) ➔ Texts live map link.
              </p>
            </div>

            <div className="p-4 rounded-3xl bg-[#121218] border border-neutral-800 space-y-2">
              <div className="text-[10px] font-mono text-accent uppercase font-bold">Scenario B • 30% of Calls</div>
              <h4 className="text-sm font-bold text-white">"Quote for Escalade tomorrow at 6 AM?"</h4>
              <p className="text-xs text-neutral-400 font-mono">
                AI calculates exact tariff ➔ Quotes $245 all-inclusive ➔ Texts 1-tap Apple Pay link.
              </p>
            </div>

            <div className="p-4 rounded-3xl bg-[#121218] border border-neutral-800 space-y-2">
              <div className="text-[10px] font-mono text-accent uppercase font-bold">Scenario C • 15% of Calls</div>
              <h4 className="text-sm font-bold text-white">"Flight DL 1420 delayed 45 mins"</h4>
              <p className="text-xs text-neutral-400 font-mono">
                AI syncs with radar ➔ Shifts pickup to 7:45 PM ➔ Notifies driver Marcus automatically.
              </p>
            </div>

            <div className="p-4 rounded-3xl bg-[#121218] border border-neutral-800 space-y-2">
              <div className="text-[10px] font-mono text-accent uppercase font-bold">Scenario D • 5% of Calls</div>
              <h4 className="text-sm font-bold text-white">"Urgent emergency / Need Joe"</h4>
              <p className="text-xs text-neutral-400 font-mono">
                AI identifies VIP priority ➔ Warm-transfers to Joe's cell with 3-second audio briefing.
              </p>
            </div>

          </div>

          <div className="pt-2 flex justify-center">
            <Link
              href="/ai-voice"
              className="px-6 py-3 rounded-2xl bg-gold-gradient hover:brightness-110 text-neutral-950 font-bold font-mono text-xs uppercase tracking-wider shadow-gold-sm transition-all active:scale-95 flex items-center gap-2"
            >
              <PhoneCall size={16} />
              <span>Launch Live Audio Simulator Now</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )
    },

    // Slide 5: ROI Matrix
    {
      id: 5,
      tag: "Business Impact",
      title: "The Operational & Financial ROI",
      subtitle: "Transforming your business from a manual hustle into an automated luxury machine.",
      content: (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-neutral-800 bg-[#0d0d12]">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-neutral-800 bg-[#14141c] text-neutral-400">
                  <th className="p-4 font-bold">Operational Metric</th>
                  <th className="p-4 font-bold text-rose-400">Before (Manual Hustle)</th>
                  <th className="p-4 font-bold text-accent">After (AI Co-Pilot)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-neutral-300">
                <tr>
                  <td className="p-4 font-bold text-white">Inbound Calls to Owner</td>
                  <td className="p-4 text-rose-400 font-bold">40 – 80 calls / day</td>
                  <td className="p-4 text-emerald-400 font-bold">2 – 4 calls / day (95% drop)</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-white">Call Response Speed</td>
                  <td className="p-4 text-neutral-400">5 – 20 mins (voicemail tag)</td>
                  <td className="p-4 text-accent font-bold">&lt; 3 seconds (24/7/365)</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-white">Missed Booking Loss</td>
                  <td className="p-4 text-rose-400">~25% lost on busy line</td>
                  <td className="p-4 text-emerald-400 font-bold">0% (Infinite concurrent lines)</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-white">Credit Card Processing</td>
                  <td className="p-4 text-neutral-400">Manual phone typing / text</td>
                  <td className="p-4 text-accent font-bold">1-Tap Apple Pay & Stripe links</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-white">Owner Time Saved</td>
                  <td className="p-4 text-neutral-500">—</td>
                  <td className="p-4 text-emerald-400 font-bold">4 to 6 hours every day</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )
    },

    // Slide 6: Zero-Risk Rollout Plan
    {
      id: 6,
      tag: "Next Steps",
      title: "The 14-Day Zero-Risk Pilot Plan",
      subtitle: "We don't switch your entire phone system overnight. We start where it matters most.",
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="p-5 rounded-3xl bg-[#121218] border border-accent/40 space-y-2">
              <div className="text-[10px] font-mono text-accent font-bold uppercase">Week 1–2 • Step 1</div>
              <h4 className="text-sm font-bold text-white">Overflow & After-Hours AI</h4>
              <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                Connect your business line to AI on ring 3 or after 10 PM. You take calls when free, AI catches the rest.
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-[#121218] border border-neutral-800 space-y-2">
              <div className="text-[10px] font-mono text-neutral-400 font-bold uppercase">Week 3–4 • Step 2</div>
              <h4 className="text-sm font-bold text-white">VIP App & Driver Cockpit</h4>
              <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                Roll out the live GPS tracking map and driver checklists to your fleet and executive clients.
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-[#121218] border border-neutral-800 space-y-2">
              <div className="text-[10px] font-mono text-neutral-400 font-bold uppercase">Month 2+ • Step 3</div>
              <h4 className="text-sm font-bold text-white">Corporate & FBO Expansion</h4>
              <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                Launch dedicated booking portals for private jet FBOs and executive assistants with net-30 billing.
              </p>
            </div>

          </div>

          <div className="p-5 rounded-3xl bg-gold-gradient text-neutral-950 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-gold-sm">
            <div>
              <h4 className="text-base font-bold font-serif">Ready to start the 14-Day Pilot?</h4>
              <p className="text-xs font-mono opacity-80">90% of the platform is already built. We can plug your pricing in today.</p>
            </div>
            <Link
              href="/admin-dashboard"
              className="px-5 py-3 rounded-2xl bg-neutral-950 text-white font-bold font-mono text-xs uppercase tracking-wider hover:bg-neutral-900 transition-all shrink-0"
            >
              Enter Dispatch Command
            </Link>
          </div>
        </div>
      )
    }
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) setCurrentSlide(currentSlide + 1);
  };

  const prevSlide = () => {
    if (currentSlide > 0) setCurrentSlide(currentSlide - 1);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlide]);

  const slide = slides[currentSlide];

  return (
    <div className="min-h-[85vh] flex flex-col justify-between p-4 sm:p-8 max-w-6xl mx-auto font-sans">
      
      {/* Slide Navigation Top Bar */}
      <div className="flex items-center justify-between border-b border-neutral-800/80 pb-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shadow-gold-sm">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="text-[10px] font-mono text-accent uppercase font-bold">Executive Strategy Deck</div>
            <div className="text-xs font-bold text-white">Owner Pitch Presentation</div>
          </div>
        </div>

        {/* Slide Counter & Dots */}
        <div className="flex items-center gap-2">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-2 rounded-full transition-all ${
                currentSlide === idx ? "w-6 bg-accent" : "w-2 bg-neutral-800 hover:bg-neutral-700"
              }`}
            />
          ))}
          <span className="text-xs font-mono text-neutral-400 ml-2">
            {currentSlide + 1} / {slides.length}
          </span>
        </div>
      </div>

      {/* Main Slide Card */}
      <div className="bg-[#0c0c10] border border-neutral-800 rounded-3xl p-6 sm:p-10 shadow-2xl flex-1 flex flex-col justify-between animate-in fade-in duration-300">
        
        {/* Slide Header */}
        <div className="space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-bold uppercase tracking-widest font-mono shadow-gold-sm">
            {slide.tag}
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold font-serif text-white tracking-tight">
            {slide.title}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 font-mono max-w-3xl leading-relaxed">
            {slide.subtitle}
          </p>
        </div>

        {/* Slide Dynamic Content */}
        <div className="flex-1 my-auto">
          {slide.content}
        </div>

        {/* Bottom Control Bar */}
        <div className="flex items-center justify-between pt-6 border-t border-neutral-800/80 mt-6">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="px-4 py-2.5 rounded-xl bg-[#14141c] hover:bg-[#1c1c28] border border-neutral-700 text-white font-mono text-xs font-bold flex items-center gap-1.5 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>

          <div className="text-[11px] font-mono text-neutral-500 hidden sm:block">
            Use Left / Right Arrow keys to navigate
          </div>

          <button
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
            className="px-5 py-2.5 rounded-xl bg-gold-gradient hover:brightness-110 text-neutral-950 font-mono text-xs font-bold flex items-center gap-1.5 disabled:opacity-30 disabled:pointer-events-none shadow-gold-sm transition-all active:scale-95"
          >
            <span>Next Slide</span>
            <ChevronRight size={16} />
          </button>
        </div>

      </div>

    </div>
  );
}
