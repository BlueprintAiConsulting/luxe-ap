"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  Send, 
  MessageSquare, 
  ShieldCheck, 
  User, 
  Car, 
  Headphones, 
  Sparkles,
  Plane,
  Clock
} from "lucide-react";
import { useReservationChat, ChatMessage } from "@/hooks/useReservationChat";
import { format } from "date-fns";

interface ReservationChatDrawerProps {
  reservationId: string;
  confirmationCode?: string;
  currentUserId?: string;
  currentUserName?: string;
  currentUserRole?: "rider" | "driver" | "admin";
  isOpen: boolean;
  onClose: () => void;
}

export default function ReservationChatDrawer({
  reservationId,
  confirmationCode,
  currentUserId,
  currentUserName,
  currentUserRole = "rider",
  isOpen,
  onClose,
}: ReservationChatDrawerProps) {
  const { messages, loading, sending, sendMessage } = useReservationChat(
    reservationId,
    currentUserId,
    currentUserName,
    currentUserRole
  );

  const [inputVal, setInputVal] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || sending) return;

    const msg = inputVal;
    setInputVal("");
    try {
      await sendMessage(msg);
    } catch (err) {
      setInputVal(msg);
    }
  };

  const handleQuickChip = (text: string) => {
    sendMessage(text);
  };

  const quickChips = currentUserRole === "rider" ? [
    "Curbside Door 4",
    "Flight has touched down",
    "Luggage collected",
    "Delayed at customs",
    "Need 5 more minutes"
  ] : currentUserRole === "driver" ? [
    "Curbside in staging",
    "Arriving in 3 minutes",
    "Waiting at Baggage Claim",
    "Hazards on in Black S-Class",
    "Passenger onboard"
  ] : [
    "Flight radar monitored",
    "Chauffeur on standby",
    "Operations concierge assistance ready"
  ];

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="concierge-channel-title"
      className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose} 
      />

      {/* Slide-out Drawer */}
      <div className="relative w-full max-w-md bg-[#09090d] text-white h-dvh max-h-dvh shadow-2xl border-l border-neutral-800 flex flex-col z-10">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 bg-[#0e0e13] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#181822] border border-accent/30 flex items-center justify-center text-accent shadow-gold-sm">
              <MessageSquare size={16} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 id="concierge-channel-title" className="text-sm font-bold font-serif text-white">Live Concierge Channel</h2>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-[10px] font-mono text-neutral-400">
                Charter #{confirmationCode || reservationId.slice(-8).toUpperCase()}
              </div>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close concierge chat"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-[#181822] border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Action Chips */}
        <div className="p-3 bg-[#060608] border-b border-neutral-800/80 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
          {quickChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleQuickChip(chip)}
              disabled={sending}
              className="px-3.5 py-2 rounded-full bg-[#181822] hover:border-accent border border-neutral-800 text-xs font-mono text-neutral-300 hover:text-white whitespace-nowrap transition-all active:scale-95 shrink-0 min-h-[36px]"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Message Feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 font-sans">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-500 space-y-2">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <div className="text-xs font-mono">Connecting to Secure Channel...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-neutral-500 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#121218] border border-neutral-800 flex items-center justify-center text-accent">
                <Sparkles size={20} />
              </div>
              <div className="text-sm font-bold text-neutral-300">Direct Concierge Link Active</div>
              <p className="text-xs text-neutral-500 max-w-xs leading-relaxed font-mono">
                Coordinate pickup, curbside terminal doors, and flight updates directly with your chauffeur and operations dispatch.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === currentUserId;
              const isDriver = msg.senderRole === "driver";
              const isAdmin = msg.senderRole === "admin";

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? "items-end" : "items-start"} space-y-1`}
                >
                  {/* Sender Label */}
                  <div className="flex items-center gap-1.5 px-1">
                    <span className="text-[10px] font-mono font-bold text-neutral-400">
                      {isMine ? "You" : msg.senderName}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase tracking-wider ${
                      isAdmin 
                        ? "bg-purple-950/60 border border-purple-800/80 text-purple-300"
                        : isDriver 
                          ? "bg-blue-950/60 border border-blue-800/80 text-blue-300"
                          : "bg-[#241a0e] border border-accent/40 text-accent"
                    }`}>
                      {msg.senderRole}
                    </span>
                  </div>

                  {/* Bubble */}
                  <div
                    className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-xs break-words shadow-sm ${
                      isMine
                        ? "bg-gold-gradient text-neutral-950 font-medium rounded-tr-sm"
                        : "bg-[#181822] border border-neutral-800 text-neutral-100 rounded-tl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Timestamp */}
                  {msg.createdAt && (
                    <div className="text-[9px] font-mono text-neutral-500 px-1">
                      {msg.createdAt.toDate ? format(msg.createdAt.toDate(), "h:mm a") : "Just now"}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-3 sm:p-4 bg-[#0e0e13] border-t border-neutral-800 flex items-center gap-2 pb-safe">
          <input
            type="text"
            placeholder="Type curbside update or message..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={sending}
            maxLength={500}
            className="flex-1 bg-[#181822] border border-neutral-700 focus:border-accent text-white placeholder-neutral-500 rounded-2xl px-4 py-3 text-base sm:text-xs focus:outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!inputVal.trim() || sending}
            className="p-3 bg-gold-gradient hover:brightness-110 disabled:opacity-50 text-neutral-950 rounded-2xl transition-all active:scale-95 shadow-gold-sm min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
          >
            <Send size={15} />
          </button>
        </form>

      </div>
    </div>
  );
}
