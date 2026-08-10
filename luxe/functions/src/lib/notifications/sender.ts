import { admin } from "../admin";
const adminDb = admin.firestore();
import * as logger from "firebase-functions/logger";
import twilio from "twilio";
import { formatInTimeZone } from "date-fns-tz";
import { FieldValue } from "firebase-admin/firestore";

// In production, these should be set via Firebase Secret Manager or Env Vars
const TWILIO_SID = process.env.TWILIO_SID || "dummy_sid";
const TWILIO_TOKEN = process.env.TWILIO_TOKEN || "dummy_token";
const TWILIO_FROM = process.env.TWILIO_FROM || "+1234567890";

// Only initialize if we have actual credentials (or mock in dev)
let twilioClient: twilio.Twilio | null = null;
if (TWILIO_SID !== "dummy_sid") {
  twilioClient = twilio(TWILIO_SID, TWILIO_TOKEN);
}


export interface DispatchParams {
  reservationId: string;
  type: string;
  channel: "sms" | "email";
  to: string;
  content: string; // Text for SMS, HTML for email
  urgent?: boolean;
  timezone: string;
}

/**
 * Checks if the current time in the given timezone falls within quiet hours (21:00 - 08:00).
 */
function isQuietHours(timezone: string): boolean {
  const hourStr = formatInTimeZone(new Date(), timezone, "H");
  const hour = parseInt(hourStr, 10);
  return hour >= 21 || hour < 8;
}

export async function dispatchNotification(params: DispatchParams) {
  const { reservationId, type, channel, to, content, urgent, timezone } = params;

  if (!to) {
    logger.warn(`No recipient for ${type} notification on reservation ${reservationId}`);
    return;
  }

  // Idempotency Check: notification doc ID
  const notificationId = `${reservationId}_${type}`;
  const notifRef = adminDb.collection("notifications").doc(notificationId);

  try {
    const sent = await adminDb.runTransaction(async (t: any) => {
      const doc = await t.get(notifRef);
      if (doc.exists) {
        return false; // Already sent
      }

      // Check quiet hours
      const suppressed = !urgent && isQuietHours(timezone);

      // Create record BEFORE sending to prevent double-send
      t.set(notifRef, {
        reservationId,
        type,
        channel,
        to,
        content,
        urgent: urgent || false,
        suppressed,
        status: suppressed ? "suppressed" : "sending",
        createdAt: FieldValue.serverTimestamp(),
      });

      return !suppressed;
    });

    if (!sent) {
      // Either already sent, or suppressed.
      return;
    }

    // Actually Dispatch
    if (channel === "sms") {
      if (twilioClient) {
        await twilioClient.messages.create({
          body: content,
          from: TWILIO_FROM,
          to,
        });
      } else {
        logger.info(`[MOCK SMS to ${to}]: ${content}`);
      }
    } else if (channel === "email") {
      await adminDb.collection("mail").add({
        to,
        message: {
          subject: "Luxe Receipt",
          html: content
        }
      });
    }

    // Mark as delivered
    await notifRef.update({
      status: "delivered",
      deliveredAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    logger.error(`Error dispatching ${type} notification:`, error);
    // Mark as failed
    await notifRef.set({ status: "failed", error: String(error) }, { merge: true });
  }
}
