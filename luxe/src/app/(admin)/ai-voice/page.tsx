"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  PhoneCall, 
  PhoneForwarded, 
  Clock, 
  Car, 
  Plane, 
  DollarSign, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw,
  Terminal,
  UserCheck,
  MessageSquare,
  AlertTriangle,
  Play
} from "lucide-react";

interface ToolExecution {
  id: string;
  name: string;
  args: Record<string, any>;
  result: string;
  timestamp: string;
}

interface ConversationTurn {
  sender: "user" | "ai" | "system";
  text: string;
  timestamp: string;
  toolCall?: ToolExecution;
}

const PRESET_SCENARIOS = [
  {
    title: "Driver Location & ETA",
    query: "Hi, where is my chauffeur for my pickup at LAX Terminal 4?",
    icon: Car,
    category: "40% of Calls",
    expectedAction: "Queries live GPS ➔ Marcus Bennett, Mercedes S-Class, 4 mins away"
  },
  {
    title: "Instant Charter Quote",
    query: "How much to take 4 passengers in an Escalade from Beverly Hills to LAX tomorrow at 6 AM?",
    icon: DollarSign,
    category: "30% of Calls",
    expectedAction: "Calculates tariff ➔ $245.00 all-inclusive ➔ Texts 1-tap checkout link"
  },
  {
    title: "Flight Delay Reschedule",
    query: "My flight Delta DL 1420 is delayed by 45 minutes, will my car still be there?",
    icon: Plane,
    category: "15% of Calls",
    expectedAction: "Monitors radar ➔ Shifts pickup to 7:45 PM ➔ Notifies driver Marcus"
  },
  {
    title: "Urgent VIP Escalation",
    query: "I have an urgent emergency and need to speak directly with Joe right now.",
    icon: AlertTriangle,
    category: "5% of Calls",
    expectedAction: "Identifies VIP crisis ➔ Warm-transfers to Joe's cell with audio brief"
  }
];

export default function AiVoiceDispatchSimulatorPage() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicePersona, setVoicePersona] = useState<"eleanor" | "julian">("eleanor");
  const [audioMuted, setAudioMuted] = useState(false);
  const [conversation, setConversation] = useState<ConversationTurn[]>([
    {
      sender: "ai",
      text: "Good afternoon. Thank you for calling LUXE Private Chauffeur & Executive Aviation Dispatch. How may I assist with your ground charter today?",
      timestamp: "Just now"
    }
  ]);
  const [toolLogs, setToolLogs] = useState<ToolExecution[]>([]);
  const [transcriptInput, setTranscriptInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hardened cleanup: stop any speaking on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation, toolLogs]);

  const handlePersonaChange = (newPersona: "eleanor" | "julian") => {
    setVoicePersona(newPersona);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleResetConversation = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setConversation([
      {
        sender: "ai",
        text: "Good afternoon. Thank you for calling LUXE Private Chauffeur & Executive Aviation Dispatch. How may I assist with your ground charter today?",
        timestamp: "Just now"
      }
    ]);
    setToolLogs([]);
  };

  const speakText = (text: string) => {
    if (audioMuted || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = voicePersona === "eleanor" ? 1.05 : 0.95;
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      voicePersona === "eleanor" 
        ? (v.name.includes("Victoria") || v.name.includes("Samantha") || v.name.includes("Female") || v.lang.includes("en-GB"))
        : (v.name.includes("Daniel") || v.name.includes("Alex") || v.name.includes("Male") || v.lang.includes("en-US"))
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const executeScenario = async (userPrompt: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    // 1. Add user message
    const updatedConvo: ConversationTurn[] = [
      ...conversation,
      { sender: "user", text: userPrompt, timestamp: now }
    ];
    setConversation(updatedConvo);

    // Simulate AI thinking and function calling
    setTimeout(() => {
      let aiResponse = "";
      let toolExec: ToolExecution | undefined = undefined;

      const lower = userPrompt.toLowerCase();

      if (lower.includes("emergency") || lower.includes("joe") || lower.includes("human") || lower.includes("urgent")) {
        toolExec = {
          id: "tool_" + Math.random().toString(36).slice(2, 7),
          name: "warm_transfer_to_owner_dispatch",
          args: { reason: "Urgent VIP Escalation", caller: "Alexander Vance", priority: "HIGH" },
          result: "Call bridging initiated to Joe (Owner Direct Line). Whisper context payload transmitted.",
          timestamp: now
        };
        aiResponse = "I understand completely. I am connecting you directly to Joe on his priority line right now with your full trip briefing. Please hold for one moment.";
      } else if (lower.includes("how much") || lower.includes("quote") || lower.includes("price") || lower.includes("rate") || lower.includes("cost") || lower.includes("book")) {
        toolExec = {
          id: "tool_" + Math.random().toString(36).slice(2, 7),
          name: "calculate_executive_charter_quote",
          args: { pickup: "Beverly Hills Hotel", dropoff: "LAX Terminal 4", vehicleClass: "Executive SUV (Cadillac Escalade ESV)", passengers: 4 },
          result: "Base: $185.00 | Mileage: $20.00 | Airport Access: $15.00 | Gratuity (20%): $44.00 | Total: $245.00 USD",
          timestamp: now
        };
        aiResponse = "For 4 passengers from Beverly Hills to LAX in our Cadillac Escalade ESV tomorrow at 6:00 AM, the total is $245.00 all-inclusive with airport fees and 20% gratuity. I have just generated a draft charter and texted a secure 1-tap Apple Pay confirmation link to your phone.";
      } else if (lower.includes("delay") || lower.includes("flight") || lower.includes("1420") || lower.includes("dl") || lower.includes("gate")) {
        toolExec = {
          id: "tool_" + Math.random().toString(36).slice(2, 7),
          name: "update_flight_radar_schedule",
          args: { flightNumber: "DL1420", delayMinutes: 45, newPickupAt: "7:45 PM" },
          result: "Radar synced: Delta DL 1420 landed delay +45m. Chauffeur staging shifted to 7:45 PM. Marcus notified.",
          timestamp: now
        };
        aiResponse = "No problem at all. Our live airspace radar has automatically synchronized with Delta Flight 1420. Your chauffeur Marcus has been notified and will be holding in the VIP curbside staging area when your flight touches down at 7:45 PM.";
      } else if (lower.includes("where") || lower.includes("eta") || lower.includes("driver") || lower.includes("pickup") || lower.includes("chauffeur") || lower.includes("car")) {
        toolExec = {
          id: "tool_" + Math.random().toString(36).slice(2, 7),
          name: "check_driver_live_gps_telemetry",
          args: { riderPhone: "(310) 555-0199", destination: "LAX Terminal 4" },
          result: "Assigned: Marcus Bennett | Vehicle: Black Mercedes-Benz S580 (LUXE-77) | Speed: 38mph | Distance: 1.4mi | ETA: 4 mins",
          timestamp: now
        };
        aiResponse = "I have your reservation on screen, Mr. Vance. Your assigned chauffeur Marcus is currently 4 minutes away in a Black Mercedes-Benz S580, license plate LUXE-77, approaching the lower arrivals loop. I have just sent his live vector GPS tracking link directly to your mobile phone.";
      } else {
        toolExec = {
          id: "tool_" + Math.random().toString(36).slice(2, 7),
          name: "query_luxe_concierge_knowledge",
          args: { query: userPrompt },
          result: "24/7 livery services, FBO private terminal access, hourly charters, and executive fleet ready.",
          timestamp: now
        };
        aiResponse = "Certainly. LUXE provides 24/7 executive ground transportation and private aviation tarmac livery. Would you like me to check an existing itinerary, provide an instant charter quote, or connect you with dispatch?";
      }

      if (toolExec) {
        setToolLogs(prev => [...prev, toolExec!]);
      }

      setConversation(prev => [
        ...prev,
        {
          sender: "ai",
          text: aiResponse,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          toolCall: toolExec
        }
      ]);

      speakText(aiResponse);
      setIsProcessing(false);
    }, 1000);
  };

  const handleStartMic = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser. Please use text input or scenario buttons.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setIsListening(false);
      executeScenario(speechToText);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-bold uppercase tracking-widest font-mono mb-2 shadow-gold-sm">
            <Sparkles size={13} className="text-accent" /> 24/7 AI Autonomous Dispatcher
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">
            Voice AI Dispatch Simulator
          </h1>
          <p className="text-sm text-neutral-400 font-mono mt-1">
            Test how the AI handles inbound client calls, quotes charters, updates delayed flights, and frees Joe from the phone.
          </p>
        </div>

        {/* Voice Persona Selector & Reset */}
        <div className="flex flex-wrap items-center gap-2 bg-[#0e0e13] border border-neutral-800 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => handlePersonaChange("eleanor")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
              voicePersona === "eleanor"
                ? "bg-gold-gradient text-neutral-950 shadow-gold-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Eleanor (British Concierge)
          </button>
          <button
            type="button"
            onClick={() => handlePersonaChange("julian")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
              voicePersona === "julian"
                ? "bg-gold-gradient text-neutral-950 shadow-gold-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Julian (Executive Dispatch)
          </button>
          <button
            type="button"
            onClick={() => {
              setAudioMuted(!audioMuted);
              if (!audioMuted && typeof window !== "undefined") window.speechSynthesis.cancel();
            }}
            aria-label={audioMuted ? "Unmute voice synthesis" : "Mute voice synthesis"}
            className="p-2 rounded-xl bg-[#181822] text-neutral-400 hover:text-white transition-colors"
          >
            {audioMuted ? <VolumeX size={16} /> : <Volume2 size={16} className="text-accent" />}
          </button>
          <button
            type="button"
            onClick={handleResetConversation}
            aria-label="Reset simulation history"
            title="Reset Simulation History"
            className="p-2 rounded-xl bg-[#181822] hover:border-accent border border-neutral-700 text-neutral-400 hover:text-white transition-all active:scale-95 flex items-center gap-1 text-xs font-mono"
          >
            <RefreshCw size={14} className="text-accent" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Live Voice Center + Live Tool Execution Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Interactive Call Experience */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Audio Visualizer & Call Stage */}
          <div className="bg-[#0c0c10] border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center text-center min-h-[340px]">
            
            {/* Holographic Glowing Rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <div className={`w-72 h-72 rounded-full border border-accent transition-all duration-700 ${isSpeaking ? "scale-125 animate-ping opacity-30" : "scale-100"}`} />
              <div className={`w-52 h-52 rounded-full border border-accent transition-all duration-500 ${isListening ? "scale-110 animate-pulse opacity-50" : "scale-100"}`} />
            </div>

            {/* Status Crest */}
            <div className="relative z-10 space-y-4">
              <div className="relative mx-auto w-24 h-24 rounded-full bg-gradient-to-b from-[#1c1c28] to-[#0d0d14] border-2 border-accent/40 flex items-center justify-center shadow-gold-sm">
                {isListening ? (
                  <Mic size={36} className="text-rose-400 animate-bounce" />
                ) : isSpeaking ? (
                  <Volume2 size={36} className="text-accent animate-pulse" />
                ) : isProcessing ? (
                  <RefreshCw size={32} className="text-accent animate-spin" />
                ) : (
                  <PhoneCall size={32} className="text-accent" />
                )}
              </div>

              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181822] border border-neutral-700 text-xs font-mono text-neutral-300">
                  <span className={`w-2 h-2 rounded-full ${isListening ? "bg-rose-400 animate-ping" : isSpeaking ? "bg-emerald-400 animate-pulse" : "bg-accent"}`} />
                  {isListening ? "Listening to Caller..." : isSpeaking ? "AI Speaking Aloud..." : isProcessing ? "Executing Dispatch Tools..." : "Voice Line Active & Standing By"}
                </div>
                <h3 className="text-lg font-bold font-serif text-white mt-2">
                  {voicePersona === "eleanor" ? "Eleanor — British Luxury AI Concierge" : "Julian — Executive Livery Dispatcher"}
                </h3>
              </div>

              {/* Push-to-Talk Mic Trigger */}
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleStartMic}
                  disabled={isListening || isProcessing}
                  className="px-6 py-3.5 rounded-2xl bg-gold-gradient hover:brightness-110 text-neutral-950 font-bold font-mono text-xs uppercase tracking-wider shadow-gold-sm transition-all active:scale-95 flex items-center gap-2 min-h-[48px]"
                >
                  <Mic size={16} />
                  <span>{isListening ? "Listening Now..." : "Tap & Speak to AI"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Test Scenarios for Joe to Tap */}
          <div className="space-y-3">
            <div className="text-xs font-mono uppercase tracking-widest text-neutral-400 font-bold flex items-center gap-2">
              <Sparkles size={13} className="text-accent" /> 1-Click Interactive Test Scenarios for Joe
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESET_SCENARIOS.map((scen, idx) => {
                const Icon = scen.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => executeScenario(scen.query)}
                    disabled={isProcessing}
                    className="p-4 rounded-2xl bg-[#0e0e13] hover:bg-[#15151e] border border-neutral-800 hover:border-accent text-left transition-all active:scale-95 group space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-accent uppercase">
                        {scen.category}
                      </span>
                      <Icon size={16} className="text-neutral-400 group-hover:text-accent transition-colors" />
                    </div>
                    <div className="text-xs font-bold text-white group-hover:text-accent transition-colors">
                      {scen.title}
                    </div>
                    <div className="text-[11px] text-neutral-400 font-mono line-clamp-2">
                      "{scen.query}"
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manual Text Prompt Input */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (transcriptInput.trim()) {
                executeScenario(transcriptInput);
                setTranscriptInput("");
              }
            }}
            className="flex items-center gap-2 bg-[#0e0e13] border border-neutral-800 p-2 rounded-2xl"
          >
            <input
              type="text"
              placeholder="Or type a custom scenario (e.g. 'Can I book a flight pickup tonight?')..."
              value={transcriptInput}
              onChange={(e) => setTranscriptInput(e.target.value)}
              disabled={isProcessing}
              className="flex-1 bg-transparent px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none font-mono"
            />
            <button
              type="submit"
              disabled={!transcriptInput.trim() || isProcessing}
              className="px-4 py-2.5 rounded-xl bg-gold-gradient hover:brightness-110 text-neutral-950 font-bold font-mono text-xs shadow-gold-sm transition-all disabled:opacity-50"
            >
              Simulate
            </button>
          </form>

        </div>

        {/* Right Column: Live Conversation Transcript + Real-Time Tool Execution Terminal */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          
          {/* Conversation Feed */}
          <div className="bg-[#0a0a0e] border border-neutral-800 rounded-3xl p-5 shadow-2xl flex-1 flex flex-col min-h-[420px]">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-accent" />
                <span className="text-xs font-bold font-mono text-white">Live Call Audio Transcript</span>
              </div>
              <span className="text-[10px] font-mono text-neutral-500">Encrypted Audio Channel</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 max-h-[380px]">
              {conversation.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"} space-y-1`}
                >
                  <div className="text-[10px] font-mono text-neutral-500 px-1">
                    {msg.sender === "user" ? "Client (Caller)" : "LUXE AI Concierge"} • {msg.timestamp}
                  </div>
                  <div className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[90%] shadow-sm ${
                    msg.sender === "user"
                      ? "bg-gold-gradient text-neutral-950 font-medium rounded-tr-sm"
                      : "bg-[#14141c] border border-neutral-800 text-neutral-200 rounded-tl-sm font-sans"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          </div>

          {/* Real-Time Tool Execution Terminal */}
          <div className="bg-[#050508] border border-neutral-800 rounded-3xl p-5 shadow-2xl font-mono text-xs space-y-3">
            <div className="flex items-center justify-between text-neutral-400 pb-2 border-b border-neutral-800/80">
              <div className="flex items-center gap-2 text-accent">
                <Terminal size={14} />
                <span className="font-bold text-[11px] uppercase tracking-wider">Automated Dispatch Engine Logs</span>
              </div>
              <span className="text-[10px] text-emerald-400 animate-pulse">0ms latency</span>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {toolLogs.length === 0 ? (
                <div className="text-neutral-600 text-[11px] py-4 text-center">
                  Awaiting incoming voice or text scenario...
                </div>
              ) : (
                toolLogs.map((log) => (
                  <div key={log.id} className="p-2.5 rounded-xl bg-[#0e0e14] border border-neutral-800 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-accent font-bold">⚡ {log.name}</span>
                      <span className="text-neutral-500">{log.timestamp}</span>
                    </div>
                    <div className="text-[11px] text-neutral-300 font-sans">
                      {log.result}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
