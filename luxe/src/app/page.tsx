"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Plane, 
  Car, 
  Clock, 
  PhoneCall, 
  MapPin, 
  Star, 
  Users, 
  CheckCircle2, 
  Radio, 
  Smartphone, 
  FileText, 
  Building2, 
  ChevronRight, 
  Compass, 
  Award,
  Lock,
  Volume2,
  Calendar,
  Zap,
  Globe,
  DollarSign,
  CreditCard
} from "lucide-react";

export default function HomePage() {
  const [selectedFleetTab, setSelectedFleetTab] = useState<number>(0);
  const [pickupCity, setPickupCity] = useState("The Beverly Hills Hotel, Beverly Hills");
  const [dropoffCity, setDropoffCity] = useState("Los Angeles International Airport (LAX)");
  const [selectedVehicleTier, setSelectedVehicleTier] = useState("first_class_sedan");

  const FLEET_VEHICLES = [
    {
      id: "first_class_sedan",
      name: "Mercedes-Benz S 580 4MATIC",
      tagline: "First-Class Executive Sedan",
      passengers: 3,
      luggage: 3,
      hourlyRate: "$145 / hr",
      airportBase: "$175 Base",
      features: [
        "Executive Rear Reclining Seats with Massage",
        "Burmester 4D High-End Surround Sound",
        "Chilled Fiji Water & Executive Console",
        "Acoustic Glass with Electronic Rear Privacy Shades"
      ],
      description: "The gold standard of world-class executive travel. Engineered for discreet CEOs, dignitaries, and discerning passengers requiring unmatched comfort and tranquility."
    },
    {
      id: "executive_suv",
      name: "Cadillac Escalade ESV Sport Platinum",
      tagline: "Extended Executive Flagship SUV",
      passengers: 6,
      luggage: 6,
      hourlyRate: "$165 / hr",
      airportBase: "$210 Base",
      features: [
        "Extended Wheelbase with Unrivaled Luggage Capacity",
        "High-Speed Encrypted Starlink 5G WiFi",
        "Chilled Captain's Chairs & Starline Ambient Headliner",
        "Tri-Zone Climate Control & USB-C Fast Charging"
      ],
      description: "Commanding road presence paired with presidential comfort. Perfect for families, executive delegations, and high-capacity airport luggage transfers."
    },
    {
      id: "yukon_denali",
      name: "GMC Yukon XL Denali Ultimate",
      tagline: "Premium Luxury Executive SUV",
      passengers: 6,
      luggage: 6,
      hourlyRate: "$155 / hr",
      airportBase: "$195 Base",
      features: [
        "Bose Performance Series 18-Speaker Audio",
        "Heated & Ventilated Perforated Leather Seating",
        "Panoramic Sunroof & Tinted Executive Privacy Glass",
        "San Pellegrino & Fiji Refreshments Included"
      ],
      description: "Understated luxury with generous legroom and refined ride quality. Ideal for corporate roadshows, airport transfers, and VIP event transportation."
    },
    {
      id: "sprinter_jet",
      name: "Mercedes-Benz Sprinter Executive",
      tagline: "Mobile Executive Boardroom",
      passengers: 10,
      luggage: 12,
      hourlyRate: "$250 / hr",
      airportBase: "$350 Base",
      features: [
        "Custom Aviation Captain's Chairs with Power Footrests",
        "Dual 4K Displays with Apple TV & HDMI Connectivity",
        "Full Nespresso Bar & Onboard Beverage Refrigerator",
        "Forward Privacy Partition for Confidential Meetings"
      ],
      description: "The ultimate mobile boardroom on wheels. Designed for executive teams, touring artists, financial roadshows, and multi-passenger group charters."
    }
  ];

  const currentVehicle = FLEET_VEHICLES[selectedFleetTab];

  return (
    <div className="min-h-screen bg-[#060608] text-white selection:bg-accent selection:text-neutral-950 font-sans overflow-x-hidden">
      
      {/* 1. FLOATING LUXURY TOP NAVIGATION BAR */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#060608]/85 backdrop-blur-xl border-b border-neutral-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1c1c28] to-[#0c0c12] border border-accent/40 flex items-center justify-center text-accent shadow-gold-sm group-hover:scale-105 transition-all">
              <Sparkles size={18} />
            </div>
            <div>
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-widest text-white uppercase group-hover:text-accent transition-colors">
                LUXE
              </span>
              <span className="block text-[9px] font-mono text-accent uppercase tracking-widest -mt-1">
                Executive Chauffeur Service
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-mono uppercase tracking-wider text-neutral-400">
            <a href="#fleet" className="hover:text-white transition-colors">The Fleet</a>
            <a href="#radar" className="hover:text-white transition-colors">Flight Radar Sync</a>
            <a href="#technology" className="hover:text-white transition-colors">AI Dispatch</a>
            <a href="#corporate" className="hover:text-white transition-colors">Corporate Accounts</a>
            <Link href="/pricing" className="hover:text-white transition-colors">Tariffs & Pricing</Link>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex px-4 py-2.5 rounded-xl border border-neutral-700 hover:border-accent text-neutral-300 hover:text-white text-xs font-mono font-bold transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/book"
              className="px-5 py-2.5 rounded-xl bg-gold-gradient hover:brightness-110 text-neutral-950 text-xs font-mono font-bold uppercase tracking-wider shadow-gold-sm transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>Book Charter</span>
              <ArrowRight size={14} />
            </Link>
          </div>

        </div>
      </header>

      {/* 2. CINEMATIC HERO SECTION */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-32 px-4 sm:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        
        {/* Ambient Radial Spotlight Illumination */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[400px] bg-[radial-gradient(ellipse_at_center,_var(--color-accent)_0%,_transparent_70%)] opacity-15 blur-3xl pointer-events-none" />

        {/* Top Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#12121a] border border-accent/30 text-accent text-xs font-mono font-bold uppercase tracking-widest mb-6 shadow-gold-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Sparkles size={13} className="text-accent" />
          <span>Premier Executive Black Car & Luxury Chauffeur Service</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold font-serif text-white tracking-tight max-w-5xl leading-[1.1] animate-in fade-in slide-in-from-bottom-3 duration-700">
          Executive Ground Transportation, Elevated to Perfection.
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-6 text-sm sm:text-lg text-neutral-400 font-mono max-w-3xl leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-1000">
          Punctual airport transfers, executive hourly charters, and point-to-point luxury travel powered by precision AI dispatch, live flight radar tracking, and a pristine flagship fleet.
        </p>

        {/* Interactive Instant Fare Estimator Card */}
        <div className="mt-12 w-full max-w-4xl bg-[#0c0c12]/95 backdrop-blur-2xl border border-accent/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-left relative overflow-hidden">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-2">
              <Compass size={16} className="text-accent" />
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-white">Instant Charter Estimator</span>
            </div>
            <span className="text-[11px] font-mono text-neutral-400">All-Inclusive Transparent Pricing • 0 Hidden Fees • Square Verified</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Origin */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1">
                <MapPin size={12} className="text-accent" /> Pickup Location
              </label>
              <input
                type="text"
                value={pickupCity}
                onChange={(e) => setPickupCity(e.target.value)}
                className="w-full bg-[#161622] border border-neutral-700 focus:border-accent rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-mono"
              />
            </div>

            {/* Destination */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1">
                <Plane size={12} className="text-accent" /> Destination / Airport
              </label>
              <input
                type="text"
                value={dropoffCity}
                onChange={(e) => setDropoffCity(e.target.value)}
                className="w-full bg-[#161622] border border-neutral-700 focus:border-accent rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-mono"
              />
            </div>

            {/* Vehicle Tier */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1">
                <Car size={12} className="text-accent" /> Vehicle Class
              </label>
              <select
                value={selectedVehicleTier}
                onChange={(e) => setSelectedVehicleTier(e.target.value)}
                className="w-full bg-[#161622] border border-neutral-700 focus:border-accent rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-mono"
              >
                <option value="first_class_sedan">Mercedes-Benz S 580 (Sedan)</option>
                <option value="executive_suv">Cadillac Escalade ESV (SUV)</option>
                <option value="yukon_denali">GMC Yukon XL Denali (SUV)</option>
                <option value="sprinter_jet">Mercedes Sprinter Executive</option>
              </select>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-4 text-xs font-mono text-neutral-400">
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <CheckCircle2 size={14} /> Live GPS Staged
              </span>
              <span className="flex items-center gap-1">
                <Clock size={14} className="text-accent" /> 15-Min Complimentary Wait Time
              </span>
            </div>

            <Link
              href="/book"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gold-gradient hover:brightness-110 text-neutral-950 font-mono text-xs font-bold uppercase tracking-wider shadow-gold-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Configure Booking & Itinerary</span>
              <ArrowRight size={15} />
            </Link>
          </div>

        </div>

        {/* Trust Badges Bar */}
        <div className="mt-14 pt-8 border-t border-neutral-800/80 w-full grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-xs font-mono text-neutral-400">
          <div className="space-y-1">
            <div className="text-xl font-bold font-serif text-white">100%</div>
            <div className="text-[11px] text-neutral-500 uppercase tracking-wider">On-Time Arrival Guarantee</div>
          </div>
          <div className="space-y-1">
            <div className="text-xl font-bold font-serif text-white">$10,000,000</div>
            <div className="text-[11px] text-neutral-500 uppercase tracking-wider">Commercial Liability Insurance</div>
          </div>
          <div className="space-y-1">
            <div className="text-xl font-bold font-serif text-white">Airport & FBO</div>
            <div className="text-[11px] text-neutral-500 uppercase tracking-wider">Full Commercial Livery Permitted</div>
          </div>
          <div className="space-y-1">
            <div className="text-xl font-bold font-serif text-accent">24 / 7 / 365</div>
            <div className="text-[11px] text-neutral-500 uppercase tracking-wider">AI Dispatch & Live Support</div>
          </div>
        </div>

      </section>

      {/* 3. THE FLAGSHIP FLEET SHOWCASE */}
      <section id="fleet" className="py-20 bg-[#08080c] border-y border-neutral-800/80 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-mono font-bold uppercase tracking-widest shadow-gold-sm">
              <Car size={13} className="text-accent" /> The Flagship Fleet
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold font-serif text-white tracking-tight">
              Pristine Fleet. Uncompromised Executive Luxury.
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-mono leading-relaxed">
              Every vehicle in our owned fleet is late-model, immaculate, and equipped with executive leather seating, high-speed WiFi, and bespoke cabin amenities.
            </p>
          </div>

          {/* Fleet Selector Tabs */}
          <div className="flex justify-center gap-2 overflow-x-auto no-scrollbar pb-2">
            {FLEET_VEHICLES.map((veh, idx) => (
              <button
                key={veh.id}
                onClick={() => setSelectedFleetTab(idx)}
                className={`px-5 py-3 rounded-2xl text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap active:scale-95 ${
                  selectedFleetTab === idx
                    ? "bg-gold-gradient text-neutral-950 shadow-gold-sm"
                    : "bg-[#121218] border border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                {veh.name.split(" ")[0]} {veh.name.split(" ")[1]}
              </button>
            ))}
          </div>

          {/* Selected Vehicle Card */}
          <div className="bg-[#0e0e14] border border-accent/20 rounded-3xl p-6 sm:p-10 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Specs */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-[10px] font-mono text-accent uppercase tracking-widest font-bold">
                  {currentVehicle.tagline}
                </span>
                <h3 className="text-2xl sm:text-4xl font-bold font-serif text-white mt-1">
                  {currentVehicle.name}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 font-mono mt-3 leading-relaxed">
                  {currentVehicle.description}
                </p>
              </div>

              {/* Specs Badges */}
              <div className="flex flex-wrap gap-4 py-2 border-y border-neutral-800 text-xs font-mono text-neutral-300">
                <div className="flex items-center gap-1.5">
                  <Users size={15} className="text-accent" />
                  <span>{currentVehicle.passengers} Passengers</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Car size={15} className="text-accent" />
                  <span>{currentVehicle.luggage} Executive Bags</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={15} className="text-accent" />
                  <span>{currentVehicle.hourlyRate}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Plane size={15} className="text-accent" />
                  <span>{currentVehicle.airportBase}</span>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-bold">
                  Bespoke Cabin Amenities
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-neutral-300">
                  {currentVehicle.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="text-accent shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center gap-4">
                <Link
                  href={`/book?vehicle=${currentVehicle.id}`}
                  className="px-6 py-3.5 rounded-xl bg-gold-gradient hover:brightness-110 text-neutral-950 font-mono text-xs font-bold uppercase tracking-wider shadow-gold-sm transition-all active:scale-95 flex items-center gap-2"
                >
                  <span>Reserve {currentVehicle.name.split(" ")[0]}</span>
                  <ArrowRight size={14} />
                </Link>
                <Link
                  href="/fleet"
                  className="px-4 py-3.5 rounded-xl border border-neutral-700 hover:border-accent text-neutral-300 hover:text-white font-mono text-xs font-bold transition-all"
                >
                  Full Fleet Gallery
                </Link>
              </div>
            </div>

            {/* Right Holographic Spec Box */}
            <div className="lg:col-span-5 bg-[#08080c] border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="text-xs font-mono uppercase tracking-wider text-accent font-bold flex items-center gap-2">
                <ShieldCheck size={16} /> White-Glove Standard
              </div>
              <ul className="text-xs font-mono text-neutral-400 space-y-3">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                  <span><strong>Chauffeur Attire:</strong> Dark tailored executive suit, tie, and black leather livery shoes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                  <span><strong>Meet & Greet:</strong> Digital tablet nameplate at baggage claim or curbside staging.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                  <span><strong>Discretion & Privacy:</strong> 100% strict passenger confidentiality and NDA protocols.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                  <span><strong>Sanitation Inspection:</strong> 40-point sanitation, detailing, and mechanical inspection before every trip.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* 4. FLIGHT RADAR SYNC & AIRPORT TRANSFERS */}
      <section id="radar" className="py-20 px-4 sm:px-8 max-w-7xl mx-auto space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-mono font-bold uppercase tracking-widest shadow-gold-sm">
              <Plane size={13} className="text-accent" /> Live Flight Radar Sync
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold font-serif text-white tracking-tight">
              Synchronized with Commercial & Private Airspace.
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-mono leading-relaxed">
              Never worry about delayed flights or curbside confusion. Our dispatch engine connects directly to live airline radar feeds, automatically tracking your flight number and positioning your chauffeur curbside the exact minute wheels touch down.
            </p>

            <div className="space-y-3 font-mono text-xs text-neutral-300">
              <div className="p-3.5 rounded-2xl bg-[#0e0e13] border border-neutral-800 flex items-center gap-3">
                <Radio size={18} className="text-emerald-400 shrink-0" />
                <span><strong>Major Airport & FBO Coverage:</strong> LAX, JFK, LGA, Burbank, Van Nuys, Teterboro.</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#0e0e13] border border-neutral-800 flex items-center gap-3">
                <Clock size={18} className="text-accent shrink-0" />
                <span><strong>Automated Delay Shift:</strong> If your flight is delayed 45 minutes, your chauffeur staging adjusts automatically.</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#0e0e13] border border-neutral-800 flex items-center gap-3">
                <ShieldCheck size={18} className="text-purple-400 shrink-0" />
                <span><strong>Flight Baggage Tracking:</strong> 45 minutes of complimentary wait time on all airport arrivals.</span>
              </div>
            </div>

            <Link
              href="/radar"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#14141c] hover:bg-[#1c1c28] border border-accent/40 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
            >
              <Radio size={14} className="text-accent" />
              <span>Explore Live Flight Radar Sync</span>
            </Link>
          </div>

          {/* Right Holographic Radar Mockup Card */}
          <div className="lg:col-span-6 bg-[#0c0c10] border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold font-mono text-white">Live Inbound Flight Telemetry</span>
              </div>
              <span className="text-[10px] font-mono text-accent">LAX Terminal 4 Staging</span>
            </div>

            {/* Radar Simulation Display */}
            <div className="bg-[#050508] border border-neutral-800/80 rounded-2xl p-5 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                <span>Inbound: Delta Flight DL 1420 (JFK ➔ LAX)</span>
                <span className="text-emerald-400 font-bold">On Final (6 mins)</span>
              </div>
              
              <div className="p-3 rounded-xl bg-[#0e0e14] border border-neutral-800 space-y-1">
                <div className="text-[10px] text-accent font-bold">Assigned Chauffeur Staging</div>
                <div className="text-white text-xs">Marcus Bennett • Cadillac Escalade ESV (LUXE-001)</div>
                <div className="text-[10px] text-neutral-500">Staged Curbside at Terminal 4, Outer Ring</div>
              </div>

              <div className="flex items-center justify-between pt-2 text-[10px] text-neutral-500">
                <span>Altitude: 1,800 ft</span>
                <span>Airspeed: 160 kts</span>
                <span className="text-accent">Zero Human Dispatch Delay</span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 font-mono text-center">
              Autonomous telemetry links VIP Passenger, Airline Status, and Chauffeur in real time.
            </p>
          </div>

        </div>
      </section>

      {/* 5. 24/7 AI VOICE & AUTONOMOUS DISPATCH SPOTLIGHT */}
      <section id="technology" className="py-20 bg-[#08080c] border-y border-neutral-800/80 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-mono font-bold uppercase tracking-widest shadow-gold-sm">
              <Volume2 size={13} className="text-accent" /> The Autonomous Concierge
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold font-serif text-white tracking-tight">
              24/7 AI Voice Dispatch. Zero Hold Time.
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-mono leading-relaxed">
              Experience the future of luxury dispatching. Our voice intelligence answers in 1 ring, quotes instant charters, streams live chauffeur GPS, and manages itinerary changes with bespoke executive personas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="p-6 rounded-3xl bg-[#0e0e14] border border-neutral-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center font-bold">
                <PhoneCall size={18} />
              </div>
              <h3 className="text-base font-bold text-white">Answers in 1 Ring</h3>
              <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                Never get placed on hold or sent to voicemail. The AI answers immediately 24 hours a day, 365 days a year.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#0e0e14] border border-neutral-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center font-bold">
                <DollarSign size={18} />
              </div>
              <h3 className="text-base font-bold text-white">Instant Square Quotes</h3>
              <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                Calculates exact mileage and tariff rules instantly, with secure card-on-file vaulting and Apple Pay confirmation links.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#0e0e14] border border-neutral-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center font-bold">
                <Car size={18} />
              </div>
              <h3 className="text-base font-bold text-white">Live Chauffeur GPS Tracking</h3>
              <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                Asks "Where is my car?" and receives instant real-time vehicle coordinates, license plate number, and arrival door.
              </p>
            </div>

          </div>

          <div className="pt-4 flex justify-center">
            <Link
              href="/ai-voice"
              className="px-8 py-3.5 rounded-2xl bg-gold-gradient hover:brightness-110 text-neutral-950 font-mono text-xs font-bold uppercase tracking-wider shadow-gold-sm transition-all active:scale-95 flex items-center gap-2"
            >
              <Volume2 size={16} />
              <span>Test the AI Voice Simulator in Your Browser</span>
              <ArrowRight size={14} />
            </Link>
          </div>

        </div>
      </section>

      {/* 6. CORPORATE ACCOUNTS & EXECUTIVE PORTAL */}
      <section id="corporate" className="py-20 px-4 sm:px-8 max-w-7xl mx-auto space-y-12">
        <div className="bg-gradient-to-br from-[#101018] to-[#08080c] border border-accent/30 rounded-3xl p-8 sm:p-14 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-8 space-y-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-mono font-bold uppercase tracking-widest shadow-gold-sm">
              <Building2 size={13} className="text-accent" /> Enterprise & Executive Travel
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold font-serif text-white tracking-tight">
              Dedicated Executive Assistant Portals & Net-30 Invoicing.
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-mono leading-relaxed">
              Designed for C-suite executive assistants, travel managers, and corporate accounts. Manage multi-city roadshows, book for multiple executives simultaneously, and receive consolidated monthly invoicing with itemized PDF tax receipts.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono text-neutral-300 pt-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-accent" />
                <span>Dedicated Account Concierge Manager</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-accent" />
                <span>Consolidated Net-30 Monthly Billing</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-accent" />
                <span>Duty-of-Care Live Telemetry Tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-accent" />
                <span>Priority Fleet Allocation 24/7/365</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-3">
            <Link
              href="/corporate"
              className="w-full py-3.5 rounded-xl bg-gold-gradient hover:brightness-110 text-neutral-950 text-center font-mono text-xs font-bold uppercase tracking-wider shadow-gold-sm transition-all active:scale-95"
            >
              Open Corporate Account
            </Link>
            <Link
              href="/pricing"
              className="w-full py-3.5 rounded-xl border border-neutral-700 hover:border-accent text-neutral-300 hover:text-white text-center font-mono text-xs font-bold transition-all"
            >
              View Transparent Tariff Rules
            </Link>
          </div>

        </div>
      </section>

      {/* 7. LUXURY FOOTER & PORTAL SWITCHER */}
      <footer className="bg-[#040406] border-t border-neutral-800/80 py-16 px-4 sm:px-8 text-neutral-400 font-mono text-xs">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-neutral-800/80">
          
          <div className="space-y-3">
            <div className="font-serif text-2xl font-bold text-white uppercase tracking-widest">LUXE</div>
            <p className="text-[11px] leading-relaxed text-neutral-500">
              Premier executive black car and luxury chauffeur ground transportation. Serving major airports, metropolitan corridors, and corporate travel desks worldwide.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-white font-bold uppercase text-[11px] tracking-wider">Quick Navigation</div>
            <ul className="space-y-1 text-[11px] text-neutral-500">
              <li><a href="#fleet" className="hover:text-white transition-colors">The Fleet</a></li>
              <li><a href="#radar" className="hover:text-white transition-colors">Flight Radar Sync</a></li>
              <li><a href="#technology" className="hover:text-white transition-colors">AI Dispatcher</a></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing & Tariffs</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="text-white font-bold uppercase text-[11px] tracking-wider">Client & Driver Portals</div>
            <ul className="space-y-1 text-[11px] text-neutral-500">
              <li><Link href="/dashboard" className="hover:text-accent transition-colors">VIP Rider Dashboard</Link></li>
              <li><Link href="/today" className="hover:text-accent transition-colors">Chauffeur Cockpit</Link></li>
              <li><Link href="/dispatch" className="hover:text-accent transition-colors">Admin Dispatch Matrix</Link></li>
              <li><Link href="/corporate" className="hover:text-accent transition-colors">Corporate Portal</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="text-white font-bold uppercase text-[11px] tracking-wider">24/7 Operations Concierge</div>
            <p className="text-[11px] text-neutral-500">
              Direct Dispatch: +1 (800) 555-LUXE<br />
              Email: concierge@luxe-livery.com<br />
              Square PCI-DSS Verified
            </p>
          </div>

        </div>

        <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-neutral-600">
          <div>© {new Date().getFullYear()} LUXE Executive Chauffeur Service. All rights reserved.</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-neutral-400">Privacy Policy</a>
            <a href="#" className="hover:text-neutral-400">Terms of Service</a>
            <a href="#" className="hover:text-neutral-400">Security & Duty of Care</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
