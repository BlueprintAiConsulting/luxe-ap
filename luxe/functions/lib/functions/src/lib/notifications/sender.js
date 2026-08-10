"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchNotification = dispatchNotification;
const admin_1 = require("../admin");
const adminDb = admin_1.admin.firestore();
const logger = __importStar(require("firebase-functions/logger"));
const twilio_1 = __importDefault(require("twilio"));
const date_fns_tz_1 = require("date-fns-tz");
const firestore_1 = require("firebase-admin/firestore");
// In production, these should be set via Firebase Secret Manager or Env Vars
const TWILIO_SID = process.env.TWILIO_SID || "dummy_sid";
const TWILIO_TOKEN = process.env.TWILIO_TOKEN || "dummy_token";
const TWILIO_FROM = process.env.TWILIO_FROM || "+1234567890";
// Only initialize if we have actual credentials (or mock in dev)
let twilioClient = null;
if (TWILIO_SID !== "dummy_sid") {
    twilioClient = (0, twilio_1.default)(TWILIO_SID, TWILIO_TOKEN);
}
/**
 * Checks if the current time in the given timezone falls within quiet hours (21:00 - 08:00).
 */
function isQuietHours(timezone) {
    const hourStr = (0, date_fns_tz_1.formatInTimeZone)(new Date(), timezone, "H");
    const hour = parseInt(hourStr, 10);
    return hour >= 21 || hour < 8;
}
async function dispatchNotification(params) {
    const { reservationId, type, channel, to, content, urgent, timezone } = params;
    if (!to) {
        logger.warn(`No recipient for ${type} notification on reservation ${reservationId}`);
        return;
    }
    // Idempotency Check: notification doc ID
    const notificationId = `${reservationId}_${type}`;
    const notifRef = adminDb.collection("notifications").doc(notificationId);
    try {
        const sent = await adminDb.runTransaction(async (t) => {
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
                createdAt: firestore_1.FieldValue.serverTimestamp(),
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
            }
            else {
                logger.info(`[MOCK SMS to ${to}]: ${content}`);
            }
        }
        else if (channel === "email") {
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
            deliveredAt: firestore_1.FieldValue.serverTimestamp(),
        });
    }
    catch (error) {
        logger.error(`Error dispatching ${type} notification:`, error);
        // Mark as failed
        await notifRef.set({ status: "failed", error: String(error) }, { merge: true });
    }
}
//# sourceMappingURL=sender.js.map