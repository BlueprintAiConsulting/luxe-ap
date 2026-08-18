"use client";

import { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "rider" | "driver" | "admin" | "system";
  text: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "audio" | "document" | null;
  audioDurationSeconds?: number | null;
  createdAt: any;
}

export interface SendMessageOptions {
  mediaUrl?: string | null;
  mediaType?: "image" | "audio" | "document" | null;
  audioDurationSeconds?: number | null;
}

export function useReservationChat(
  reservationId: string | undefined,
  currentUserId: string | undefined,
  currentUserName: string | undefined,
  currentUserRole: "rider" | "driver" | "admin" = "rider"
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!reservationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const messagesRef = collection(db, "reservations", reservationId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: ChatMessage[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            senderId: data.senderId,
            senderName: data.senderName || (data.senderRole === "system" ? "LUXE Concierge" : "User"),
            senderRole: data.senderRole || "rider",
            text: data.text || data.content || "",
            mediaUrl: data.mediaUrl || null,
            mediaType: data.mediaType || null,
            audioDurationSeconds: data.audioDurationSeconds || null,
            createdAt: data.createdAt,
          });
        });
        setMessages(list);
        setLoading(false);
      },
      (err) => {
        console.warn("Reservation chat subscribe error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [reservationId]);

  const sendMessage = async (text: string, options?: SendMessageOptions) => {
    if (!reservationId || !currentUserId || (!text.trim() && !options?.mediaUrl)) return;

    setSending(true);
    try {
      const messagesRef = collection(db, "reservations", reservationId, "messages");
      await addDoc(messagesRef, {
        senderId: currentUserId,
        senderName: currentUserName || (currentUserRole === "driver" ? "Executive Chauffeur" : currentUserRole === "admin" ? "Dispatch Ops" : "VIP Client"),
        senderRole: currentUserRole,
        text: text.trim(),
        mediaUrl: options?.mediaUrl || null,
        mediaType: options?.mediaType || null,
        audioDurationSeconds: options?.audioDurationSeconds || null,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to send chat message:", err);
      throw err;
    } finally {
      setSending(false);
    }
  };

  return {
    messages,
    loading,
    sending,
    sendMessage,
  };
}
