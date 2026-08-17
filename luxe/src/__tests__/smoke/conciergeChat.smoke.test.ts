import { describe, it, expect } from "vitest";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "rider" | "driver" | "admin";
  text: string;
}

export function validateChatMessage(msg: Partial<ChatMessage>): { valid: boolean; error?: string } {
  if (!msg.senderId || msg.senderId.trim() === "") return { valid: false, error: "Missing senderId" };
  if (!msg.text || msg.text.trim() === "") return { valid: false, error: "Message text cannot be empty" };
  if (!msg.senderRole || !["rider", "driver", "admin"].includes(msg.senderRole)) {
    return { valid: false, error: "Invalid sender role" };
  }
  if (msg.text.length > 500) return { valid: false, error: "Exceeds 500 char max limit" };
  return { valid: true };
}

describe("Concierge Chat Channel — Smoke Tests", () => {
  it("Smoke Test 1: Validates legitimate VIP rider message", () => {
    const res = validateChatMessage({
      senderId: "rider_123",
      senderName: "Alexander Vance",
      senderRole: "rider",
      text: "Curbside at Terminal 4 Door 4B"
    });
    expect(res.valid).toBe(true);
  });

  it("Smoke Test 2: Validates chauffeur status message", () => {
    const res = validateChatMessage({
      senderId: "driver_456",
      senderName: "Marcus Bennett",
      senderRole: "driver",
      text: "Curbside in staging, hazards on in Black S-Class"
    });
    expect(res.valid).toBe(true);
  });

  it("Smoke Test 3: Rejects empty or whitespace-only messages", () => {
    const res = validateChatMessage({
      senderId: "rider_123",
      senderRole: "rider",
      text: "   "
    });
    expect(res.valid).toBe(false);
    expect(res.error).toBe("Message text cannot be empty");
  });

  it("Smoke Test 4: Rejects unauthorized role types", () => {
    const res = validateChatMessage({
      senderId: "anon_999",
      senderRole: "bot" as any,
      text: "Hello"
    });
    expect(res.valid).toBe(false);
    expect(res.error).toBe("Invalid sender role");
  });
});
