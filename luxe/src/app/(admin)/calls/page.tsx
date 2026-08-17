"use client";

import React, { useState } from "react";
import { 
  PhoneCall, 
  PhoneIncoming, 
  PhoneForwarded, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  Car, 
  DollarSign, 
  Plane, 
  AlertTriangle, 
  Search, 
  Filter, 
  Play, 
  Pause,
  MessageSquare,
  ArrowUpRight,
  ShieldCheck,
  User
} from "lucide-react";
import Link from "next/link";

interface CallLog {
  id: string;
  callerName: string;
  callerPhone: string;
  timestamp: string;
  duration: string;
  intent: "driver_eta" | "charter_quote" | "flight_reschedule" | "owner_escalation" | "general_inquiry";
  intentLabel: string;
  resolutionStatus: "resolved_ai" | "transferred_owner" | "quote_sent";
  revenueCapturedCents?: number;
  summary: string;
  transcript: { sender: "caller" | "ai"; text: string; time: string }[];
}

const MOCK_CALLS: CallLog[] = [
  {
    id: "call_01",
    callerName: "Alexander Vance (Vance Capital)",
    callerPhone: "+1 (310) 555-0199",
    timestamp: "10 minutes ago",
    duration: "1m 12s",
    intent: "driver_eta",
    intentLabel: "Driver Status & Live GPS",
    resolutionStatus: "resolved_ai",
    summary: "Provided live GPS location for chauffeur Marcus Bennett in Mercedes S-Class (4 mins away at LAX T4). Sent live vector tracking link via SMS.",
    transcript: [
      { sender: "ai", text: "Good afternoon, Mr. Vance. Thank you for calling LUXE Executive Dispatch. Are you calling regarding your LAX pickup with Marcus?", time: "0:02" },
      { sender: "caller", text: "Yes, I just walked out of Terminal 4 door 4B. Where is he?", time: "0:08" },
      { sender: "ai", text: "Marcus is 4 minutes away in a Black Mercedes-Benz S580, license plate LUXE-77, pulling into the lower arrivals loop. I just texted his live tracking map to your phone.", time: "0:18" },
      { sender: "caller", text: "Perfect, thank you!", time: "0:22" }
    ]
  },
  {
    id: "call_02",
    callerName: "Sarah Jenkins (Executive Assistant)",
    callerPhone: "+1 (212) 555-9012",
    timestamp: "32 minutes ago",
    duration: "1m 48s",
    intent: "charter_quote",
    intentLabel: "Instant Charter Quote & Booking",
    resolutionStatus: "quote_sent",
    revenueCapturedCents: 24500,
    summary: "Quoted $245.00 for Cadillac Escalade ESV from Beverly Hills to LAX tomorrow at 6:00 AM. Dispatched 1-tap Apple Pay confirmation link via SMS.",
    transcript: [
      { sender: "ai", text: "Good afternoon. Thank you for calling LUXE Dispatch. How may I assist you with your executive charter?", time: "0:02" },
      { sender: "caller", text: "Hi, I need to book a car for our CEO tomorrow morning at 6 AM from the Beverly Hills Hotel to LAX for 4 passengers with luggage.", time: "0:12" },
      { sender: "ai", text: "Certainly. For 4 passengers with executive luggage, our Cadillac Escalade ESV is $245.00 all-inclusive with 20% chauffeur gratuity. Would you like me to send a 1-tap confirmation link?", time: "0:25" },
      { sender: "caller", text: "Yes please, send it to this number.", time: "0:30" },
      { sender: "ai", text: "Sent! You'll find the secure Apple Pay link in your messages now.", time: "0:35" }
    ]
  },
  {
    id: "call_03",
    callerName: "David Sterling",
    callerPhone: "+1 (415) 555-3481",
    timestamp: "1 hour ago",
    duration: "0m 54s",
    intent: "flight_reschedule",
    intentLabel: "Flight Delay Auto-Reschedule",
    resolutionStatus: "resolved_ai",
    summary: "Synchronized with Delta DL 1420 radar delay (+45m). Shifted chauffeur pickup to 7:45 PM and notified driver Marcus.",
    transcript: [
      { sender: "ai", text: "Hello Mr. Sterling. Calling regarding Delta Flight 1420?", time: "0:02" },
      { sender: "caller", text: "Yeah, our flight was delayed leaving JFK, we're landing 45 minutes late.", time: "0:08" },
      { sender: "ai", text: "No worries at all. Our live flight radar has already adjusted your chauffeur Marcus's staging time to 7:45 PM. He will be holding curbside when you land.", time: "0:19" },
      { sender: "caller", text: "Incredible, appreciate it!", time: "0:23" }
    ]
  },
  {
    id: "call_04",
    callerName: "Elena Rostova",
    callerPhone: "+1 (305) 555-8820",
    timestamp: "3 hours ago",
    duration: "2m 04s",
    intent: "owner_escalation",
    intentLabel: "VIP Priority Escalation",
    resolutionStatus: "transferred_owner",
    summary: "Caller requested custom 3-day multi-city private jet tarmac transfer. Warm-transferred to Joe with full audio briefing.",
    transcript: [
      { sender: "ai", text: "Thank you for calling LUXE. How may I assist you?", time: "0:02" },
      { sender: "caller", text: "I have a complex multi-city charter request for our private jet arrival tomorrow and need to speak directly with Joe.", time: "0:12" },
      { sender: "ai", text: "Understood Ms. Rostova. Connecting you directly to Joe on his priority line right now with your briefing. Please hold.", time: "0:22" }
    ]
  }
];

export default function CallCenterPage() {
  const [calls] = useState<CallLog[]>(MOCK_CALLS);
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(MOCK_CALLS[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterIntent, setFilterIntent] = useState<string>("all");

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const filteredCalls = calls.filter((c) => {
    const matchesSearch = c.callerName.toLowerCase().includes(searchQuery.toLowerCase()) || c.callerPhone.includes(searchQuery);
    const matchesFilter = filterIntent === "all" || c.intent === filterIntent;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-bold uppercase tracking-widest font-mono mb-2 shadow-gold-sm">
            <Sparkles size={13} className="text-accent" /> 24/7 AI Voice Dispatch Telemetry
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">
            AI Call Center & Voice Transcripts
          </h1>
          <p className="text-sm text-neutral-400 font-mono mt-1">
            Real-time logs of calls intercepted, quoted, and dispatched by your AI Voice Concierge.
          </p>
        </div>

        <Link
          href="/ai-voice"
          className="px-5 py-3 rounded-2xl bg-gold-gradient hover:brightness-110 text-neutral-950 font-bold font-mono text-xs uppercase tracking-wider shadow-gold-sm transition-all active:scale-95 flex items-center gap-2 self-start sm:self-auto"
        >
          <PhoneCall size={15} />
          <span>Open Voice Simulator</span>
        </Link>
      </div>

      {/* Top Metric Cards for Joe */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-[#0c0c10] border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-bold">Calls Handled Today</div>
          <div className="text-2xl sm:text-3xl font-bold font-serif text-white">28 <span className="text-xs font-mono text-emerald-400 font-normal">+100% automated</span></div>
          <div className="text-[10px] text-neutral-500 font-mono">0 dropped calls • 24/7 active</div>
        </div>

        <div className="bg-[#0c0c10] border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-bold">AI Resolution Rate</div>
          <div className="text-2xl sm:text-3xl font-bold font-serif text-accent">92.8%</div>
          <div className="text-[10px] text-emerald-400 font-mono">26/28 resolved with 0 human effort</div>
        </div>

        <div className="bg-[#0c0c10] border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-bold">Revenue Captured via AI</div>
          <div className="text-2xl sm:text-3xl font-bold font-serif text-emerald-400">$3,680 <span className="text-xs text-white">USD</span></div>
          <div className="text-[10px] text-neutral-500 font-mono">1-tap Stripe checkout links</div>
        </div>

        <div className="bg-[#0c0c10] border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-bold">Hours Saved for Joe</div>
          <div className="text-2xl sm:text-3xl font-bold font-serif text-white">2.4 <span className="text-xs font-mono text-accent">Hours</span></div>
          <div className="text-[10px] text-neutral-500 font-mono">No phone tag or manual card typing</div>
        </div>

      </div>

      {/* Main Two-Column Layout: Call Feed List + Selected Transcript Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Call Feed */}
        <div className="lg:col-span-6 space-y-4">
          
          {/* Search & Filter Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Search by caller name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[#0e0e13] border border-neutral-800 rounded-2xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-accent font-mono"
              />
            </div>
            <select
              value={filterIntent}
              onChange={(e) => setFilterIntent(e.target.value)}
              className="bg-[#0e0e13] border border-neutral-800 text-neutral-300 text-xs rounded-2xl px-3 py-2.5 font-mono focus:outline-none"
            >
              <option value="all">All Call Types</option>
              <option value="driver_eta">Driver Status / ETA</option>
              <option value="charter_quote">Instant Quote</option>
              <option value="flight_reschedule">Flight Delay</option>
              <option value="owner_escalation">Transferred to Joe</option>
            </select>
          </div>

          {/* List of Calls */}
          <div className="space-y-3">
            {filteredCalls.length === 0 ? (
              <div className="p-8 text-center bg-[#0a0a0e] border border-neutral-800 rounded-3xl space-y-3">
                <PhoneCall size={24} className="mx-auto text-neutral-600" />
                <div className="text-xs font-bold text-neutral-300 font-mono">No call logs found</div>
                <button
                  type="button"
                  onClick={() => { setSearchQuery(""); setFilterIntent("all"); }}
                  className="text-xs text-accent font-mono underline hover:text-white"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              filteredCalls.map((call) => {
                const isSelected = selectedCall?.id === call.id;
                return (
                  <div
                    key={call.id}
                    onClick={() => setSelectedCall(call)}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer space-y-3 ${
                      isSelected
                        ? "bg-[#14141d] border-accent shadow-gold-sm"
                        : "bg-[#0a0a0e] border-neutral-800 hover:border-neutral-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-[#181822] border border-neutral-800 flex items-center justify-center text-accent">
                          {call.intent === "driver_eta" ? <Car size={15} /> : call.intent === "charter_quote" ? <DollarSign size={15} /> : call.intent === "flight_reschedule" ? <Plane size={15} /> : <AlertTriangle size={15} className="text-amber-400" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{call.callerName}</div>
                          <div className="text-[10px] font-mono text-neutral-500">{call.callerPhone}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          call.resolutionStatus === "resolved_ai"
                            ? "bg-emerald-950/60 border-emerald-800/80 text-emerald-400"
                            : call.resolutionStatus === "quote_sent"
                              ? "bg-amber-950/60 border-amber-800/80 text-accent"
                              : "bg-purple-950/60 border-purple-800/80 text-purple-300"
                        }`}>
                          {call.resolutionStatus.replace(/_/g, " ")}
                        </span>
                        <div className="text-[10px] font-mono text-neutral-500 mt-1">{call.timestamp} • {call.duration}</div>
                      </div>
                    </div>

                    <p className="text-[11px] text-neutral-400 font-mono line-clamp-2 leading-relaxed">
                      {call.summary}
                    </p>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Right: Selected Call Audio Player & Full Transcript Detail */}
        <div className="lg:col-span-6">
          {selectedCall ? (
            <div className="bg-[#0c0c10] border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-6 sticky top-6">
              
              {/* Transcript Header */}
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div>
                  <span className="text-[10px] font-mono text-accent uppercase tracking-widest font-bold">
                    {selectedCall.intentLabel}
                  </span>
                  <h3 className="text-lg font-bold font-serif text-white">{selectedCall.callerName}</h3>
                  <div className="text-xs font-mono text-neutral-400">{selectedCall.callerPhone} • {selectedCall.timestamp}</div>
                </div>

                <a
                  href={`tel:${selectedCall.callerPhone}`}
                  className="px-4 py-2 bg-[#181822] hover:border-accent border border-neutral-700 text-white rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 min-h-[44px]"
                >
                  <PhoneCall size={13} className="text-accent" />
                  <span>Call Back</span>
                </a>
              </div>

              {/* Interactive Audio Player Waveform */}
              <div className="p-4 rounded-2xl bg-[#060608] border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
                  <button
                    type="button"
                    onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                    className="flex items-center gap-2 text-accent font-bold hover:underline"
                  >
                    {isPlayingAudio ? <Pause size={14} className="text-accent" /> : <Play size={14} className="text-accent" />}
                    <span>{isPlayingAudio ? "Pause Audio Replay" : "Play Recorded Call"}</span>
                  </button>
                  <span className="text-neutral-500 font-mono">{isPlayingAudio ? "Streaming Audio..." : selectedCall.duration}</span>
                </div>
                
                {/* Waveform bars */}
                <div className="flex items-center gap-1 h-8 px-2 overflow-hidden">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all duration-300 ${
                        isPlayingAudio 
                          ? i % 2 === 0 ? "bg-accent h-7 animate-pulse" : "bg-gold-light h-4 animate-bounce" 
                          : i % 3 === 0 ? "bg-accent h-6" : i % 2 === 0 ? "bg-neutral-600 h-4" : "bg-neutral-800 h-2"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Dialogue Transcript Feed */}
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                <div className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-bold">
                  Verbatim Call Transcript
                </div>

                {selectedCall.transcript.map((t, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${t.sender === "caller" ? "items-end" : "items-start"} space-y-1`}
                  >
                    <div className="text-[9px] font-mono text-neutral-500 px-1">
                      {t.sender === "caller" ? "Caller" : "LUXE AI Concierge"} • {t.time}
                    </div>
                    <div
                      className={`p-3 rounded-2xl text-xs max-w-[88%] leading-relaxed ${
                        t.sender === "caller"
                          ? "bg-gold-gradient text-neutral-950 font-medium rounded-tr-sm"
                          : "bg-[#161622] border border-neutral-800 text-neutral-100 rounded-tl-sm"
                      }`}
                    >
                      {t.text}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-12 text-center text-neutral-500 font-mono text-xs border border-neutral-800 rounded-3xl">
              Select a call to inspect the audio transcript and AI actions.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
