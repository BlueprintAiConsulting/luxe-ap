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
  Clock,
  Mic,
  MicOff,
  Paperclip,
  Image as ImageIcon,
  Play,
  Pause,
  Trash2,
  Maximize2
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  // Voice Memo Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Voice recording timer
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  if (!isOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputVal.trim() && !selectedImage) || sending) return;

    const msg = inputVal;
    const img = selectedImage;

    setInputVal("");
    setSelectedImage(null);

    try {
      if (img) {
        await sendMessage(msg || "Attached Boarding Pass / Photo", {
          mediaUrl: img,
          mediaType: "image",
        });
      } else {
        await sendMessage(msg);
      }
    } catch (err) {
      setInputVal(msg);
      setSelectedImage(img);
    }
  };

  const handleStartVoiceRecording = () => {
    setIsRecording(true);
  };

  const handleStopAndSendVoiceRecording = async () => {
    setIsRecording(false);
    const duration = recordingSeconds || 3;
    try {
      // Simulate/Send encoded voice memo
      await sendMessage(`🎙️ Voice Memo (${duration}s)`, {
        mediaUrl: "audio_memo_simulated",
        mediaType: "audio",
        audioDurationSeconds: duration,
      });
    } catch (err) {
      console.warn("Failed to send voice memo:", err);
    }
  };

  const handleCancelVoiceRecording = () => {
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setSelectedImage(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleAudioPlayback = (msgId: string) => {
    if (playingAudioId === msgId) {
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(msgId);
      setTimeout(() => {
        setPlayingAudioId(null);
      }, 4000);
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
    "Hazards on in Black Escalade",
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
      <div className="relative w-full max-w-md bg-[#09090d] text-white h-dvh max-h-dvh shadow-2xl border-l border-neutral-800 flex flex-col z-10 font-sans">
        
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

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full font-bold hidden sm:inline-block">
              RADAR SYNCED
            </span>
            <button
              type="button"
              aria-label="Close concierge chat"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-[#181822] border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quick Action Chips */}
        <div className="p-3 bg-[#060608] border-b border-neutral-800/80 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
          {quickChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleQuickChip(chip)}
              disabled={sending || isRecording}
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
                Coordinate pickup, curbside terminal doors, boarding passes, and voice memos directly with your chauffeur and operations dispatch.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === currentUserId;
              const isDriver = msg.senderRole === "driver";
              const isAdmin = msg.senderRole === "admin";
              const isSystem = msg.senderRole === "system";

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
                      isSystem
                        ? "bg-emerald-950/80 border border-emerald-700/90 text-emerald-300"
                        : isAdmin 
                          ? "bg-purple-950/60 border border-purple-800/80 text-purple-300"
                          : isDriver 
                            ? "bg-blue-950/60 border border-blue-800/80 text-blue-300"
                            : "bg-[#241a0e] border border-accent/40 text-accent"
                    }`}>
                      {msg.senderRole}
                    </span>
                  </div>

                  {/* Audio Voice Memo Bubble */}
                  {msg.mediaType === "audio" ? (
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl border flex items-center gap-3 shadow-md ${
                        isMine 
                          ? "bg-[#1f1910] border-accent/40 text-accent rounded-tr-sm" 
                          : "bg-[#181822] border-neutral-800 text-white rounded-tl-sm"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleAudioPlayback(msg.id)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          playingAudioId === msg.id 
                            ? "bg-accent text-neutral-950 shadow-gold-sm" 
                            : "bg-[#0e0e13] border border-neutral-700 text-accent hover:border-accent"
                        }`}
                      >
                        {playingAudioId === msg.id ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
                      </button>
                      
                      <div className="flex-1 min-w-[120px]">
                        <div className="flex items-center justify-between text-[10px] font-mono font-bold mb-1">
                          <span className="text-accent uppercase tracking-wider">Voice Memo</span>
                          <span className="text-neutral-400">0:0{msg.audioDurationSeconds || 4}</span>
                        </div>
                        {/* Audio Waveform Simulator */}
                        <div className="flex items-center gap-0.5 h-3">
                          {[40, 70, 90, 60, 30, 80, 100, 50, 60, 40, 80, 50, 30, 60].map((height, i) => (
                            <div
                              key={i}
                              style={{ height: `${height}%` }}
                              className={`w-1 rounded-full transition-all ${
                                playingAudioId === msg.id ? "bg-accent animate-pulse" : "bg-neutral-600"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : msg.mediaType === "image" && msg.mediaUrl ? (
                    /* Image / Boarding Pass Attachment Bubble */
                    <div className="space-y-1.5 max-w-[85%]">
                      <div 
                        onClick={() => setZoomedImage(msg.mediaUrl || null)}
                        className="relative rounded-2xl overflow-hidden border border-neutral-700 cursor-pointer group shadow-lg"
                      >
                        <img 
                          src={msg.mediaUrl} 
                          alt="Boarding Pass / Attachment" 
                          className="w-full max-h-48 object-cover group-hover:scale-105 transition-transform" 
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Maximize2 size={18} />
                        </div>
                      </div>
                      {msg.text && (
                        <div
                          className={`px-4 py-2 rounded-2xl text-xs break-words ${
                            isMine
                              ? "bg-gold-gradient text-neutral-950 font-medium rounded-tr-sm"
                              : "bg-[#181822] border border-neutral-800 text-neutral-100 rounded-tl-sm"
                          }`}
                        >
                          {msg.text}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Standard Text Bubble */
                    <div
                      className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs break-words shadow-sm ${
                        isSystem
                          ? "bg-[#0b1612] border border-emerald-800/80 text-emerald-100 rounded-tl-sm"
                          : isMine
                            ? "bg-gold-gradient text-neutral-950 font-medium rounded-tr-sm"
                            : "bg-[#181822] border border-neutral-800 text-neutral-100 rounded-tl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                  )}

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

        {/* Selected Image Thumbnail Preview Bar */}
        {selectedImage && (
          <div className="px-4 py-2 bg-[#121727] border-t border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={selectedImage} alt="Attachment Preview" className="w-10 h-10 object-cover rounded-lg border border-accent/40" />
              <span className="text-[11px] font-mono text-neutral-300">Boarding Pass / Photo Ready</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="p-1.5 text-neutral-400 hover:text-rose-400 rounded-lg hover:bg-neutral-800"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}

        {/* Active Voice Recording Bar */}
        {isRecording ? (
          <div className="p-3 sm:p-4 bg-[#120d0a] border-t border-amber-900/60 flex items-center justify-between gap-3 pb-safe animate-pulse">
            <div className="flex items-center gap-2 text-accent text-xs font-mono font-bold">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <span>Recording Voice Memo: 0:0{recordingSeconds}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelVoiceRecording}
                className="px-3 py-2 bg-neutral-900 border border-neutral-700 text-neutral-400 rounded-xl text-xs font-bold"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleStopAndSendVoiceRecording}
                className="px-4 py-2 bg-gold-gradient text-neutral-950 rounded-xl text-xs font-bold uppercase tracking-wider shadow-gold-sm"
              >
                Send Audio
              </button>
            </div>
          </div>
        ) : (
          /* Normal Input Form with Voice Memo & Attachment Triggers */
          <form onSubmit={handleSend} className="p-3 sm:p-4 bg-[#0e0e13] border-t border-neutral-800 flex items-center gap-2 pb-safe">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept="image/*" 
              className="hidden" 
            />

            {/* Attach Photo / Boarding Pass */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-[#181822] border border-neutral-800 hover:border-accent text-neutral-400 hover:text-accent transition-all min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
              title="Attach Boarding Pass or Photo"
            >
              <Paperclip size={16} />
            </button>

            {/* Record Audio Voice Memo */}
            <button
              type="button"
              onClick={handleStartVoiceRecording}
              className="p-2.5 rounded-xl bg-[#181822] border border-neutral-800 hover:border-accent text-neutral-400 hover:text-accent transition-all min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
              title="Hold to Record Voice Memo"
            >
              <Mic size={16} />
            </button>

            <input
              type="text"
              placeholder="Curbside update or message..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              disabled={sending}
              maxLength={500}
              className="flex-1 bg-[#181822] border border-neutral-700 focus:border-accent text-white placeholder-neutral-500 rounded-2xl px-4 py-3 text-base sm:text-xs focus:outline-none transition-all"
            />

            <button
              type="submit"
              disabled={(!inputVal.trim() && !selectedImage) || sending}
              className="p-3 bg-gold-gradient hover:brightness-110 disabled:opacity-50 text-neutral-950 rounded-2xl transition-all active:scale-95 shadow-gold-sm min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            >
              <Send size={15} />
            </button>
          </form>
        )}

      </div>

      {/* Full-Screen Zoom Modal for Boarding Passes & Photos */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-lg w-full">
            <img src={zoomedImage} alt="Zoomed Attachment" className="w-full max-h-[80vh] object-contain rounded-2xl border border-neutral-800 shadow-2xl" />
            <button
              type="button"
              onClick={() => setZoomedImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/70 text-white hover:bg-black"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
