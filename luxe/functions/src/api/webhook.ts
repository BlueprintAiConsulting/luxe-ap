import { onRequest } from "firebase-functions/v2/https";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as crypto from "crypto";
import Stripe from "stripe";
import { Reservation, ReservationStatusEvent } from "../shared";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

const SQUARE_WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || "";
const SQUARE_NOTIFICATION_URL = process.env.SQUARE_NOTIFICATION_URL || "https://us-central1-luxe-app-1786335311.cloudfunctions.net/squareWebhook";

/**
 * Validates Square HMAC-SHA256 webhook signatures.
 */
export function verifySquareWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  signatureKey: string,
  notificationUrl: string
): boolean {
  if (!signatureHeader || !signatureKey) {
    // If no signature key is configured in dev/test, allow bypass
    return !signatureKey;
  }
  const payload = notificationUrl + rawBody;
  const hmac = crypto.createHmac("sha256", signatureKey);
  hmac.update(payload, "utf8");
  const expectedSignature = hmac.digest("base64");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader, "utf8"),
      Buffer.from(expectedSignature, "utf8")
    );
  } catch {
    return false;
  }
}

/**
 * squareWebhook: Listens for Square payment, refund, and terminal checkout events.
 */
export const squareWebhook = onRequest({ cors: false }, async (req, res) => {
  const signature = req.headers["x-square-hmacsha256-signature"] as string | undefined || 
                    req.headers["x-square-signature"] as string | undefined;

  const rawBody = (req as any).rawBody ? (req as any).rawBody.toString("utf8") : JSON.stringify(req.body);

  if (SQUARE_WEBHOOK_SIGNATURE_KEY && !verifySquareWebhookSignature(rawBody, signature, SQUARE_WEBHOOK_SIGNATURE_KEY, SQUARE_NOTIFICATION_URL)) {
    console.error("[squareWebhook] Invalid Square signature.");
    res.status(401).send("Invalid signature");
    return;
  }

  const event = req.body;
  if (!event || !event.type) {
    res.status(400).send("Invalid event payload");
    return;
  }

  const eventId = event.event_id || `sq_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  console.log(`[squareWebhook] Received event ${event.type} (ID: ${eventId})`);

  // 1. Idempotency Check
  const eventRef = db.collection("webhookEvents").doc(eventId);
  const eventSnap = await eventRef.get();
  if (eventSnap.exists) {
    console.log(`[squareWebhook] Event ${eventId} already processed.`);
    res.json({ received: true, skipped: true });
    return;
  }

  try {
    await db.runTransaction(async (t) => {
      const txSnap = await t.get(eventRef);
      if (txSnap.exists) return;

      t.set(eventRef, {
        provider: "square",
        type: event.type,
        processedAt: FieldValue.serverTimestamp(),
      });

      // 2. Handle Square Events
      if (event.type === "payment.updated" || event.type === "payment.created") {
        const payment = event.data?.object?.payment;
        if (!payment) return;

        const paymentId = payment.id;
        const status = payment.status; // "COMPLETED", "APPROVED", "CANCELED", "FAILED"
        const amountCents = payment.amount_money ? Number(payment.amount_money.amount) : 0;
        const receiptUrl = payment.receipt_url || null;
        const cardBrand = payment.card_details?.card?.card_brand || null;
        const cardLast4 = payment.card_details?.card?.last_4 || null;
        const referenceId = payment.reference_id; // Reservation confirmation code or ID

        let reservationDoc: FirebaseFirestore.DocumentSnapshot | null = null;

        if (referenceId) {
          const qConf = await db.collection("reservations").where("confirmationCode", "==", referenceId).limit(1).get();
          if (!qConf.empty) {
            reservationDoc = qConf.docs[0];
          } else {
            const qId = await db.collection("reservations").doc(referenceId).get();
            if (qId.exists) reservationDoc = qId;
          }
        }

        if (!reservationDoc) {
          const qPay = await db.collection("reservations").where("squarePaymentId", "==", paymentId).limit(1).get();
          if (!qPay.empty) reservationDoc = qPay.docs[0];
        }

        if (!reservationDoc || !reservationDoc.exists) {
          console.warn(`[squareWebhook] Reservation not found for payment ${paymentId}`);
          return;
        }

        const reservation = reservationDoc.data() as Reservation;
        const resRef = reservationDoc.ref;

        let nextPaymentStatus: Reservation["paymentStatus"] = reservation.paymentStatus;
        let authorizedAmountCents = reservation.authorizedAmountCents || 0;
        let capturedAmountCents = reservation.capturedAmountCents || 0;

        if (status === "COMPLETED") {
          nextPaymentStatus = "captured";
          capturedAmountCents = amountCents;
          authorizedAmountCents = amountCents;
        } else if (status === "APPROVED") {
          nextPaymentStatus = "authorized";
          authorizedAmountCents = amountCents;
        } else if (status === "FAILED") {
          nextPaymentStatus = "failed";
        } else if (status === "CANCELED") {
          nextPaymentStatus = "refunded";
          authorizedAmountCents = 0;
        }

        t.update(resRef, {
          paymentStatus: nextPaymentStatus,
          squarePaymentId: paymentId,
          squareReceiptUrl: receiptUrl || (reservation as any).squareReceiptUrl || null,
          squareCardBrand: cardBrand || (reservation as any).squareCardBrand || null,
          squareCardLast4: cardLast4 || (reservation as any).squareCardLast4 || null,
          authorizedAmountCents,
          capturedAmountCents,
          updatedAt: FieldValue.serverTimestamp(),
        });

        const statusEventRef = resRef.collection("statusEvents").doc();
        const statusEvent: ReservationStatusEvent = {
          from: reservation.status,
          to: reservation.status,
          at: FieldValue.serverTimestamp() as any,
          actorId: "system_square_webhook",
          actorRole: "system",
          note: `Square Payment ${paymentId} state: ${status} ($${(amountCents / 100).toFixed(2)})`,
          location: null,
        };
        t.set(statusEventRef, statusEvent);
      } else if (event.type === "refund.updated" || event.type === "refund.created") {
        const refund = event.data?.object?.refund;
        if (!refund) return;

        const paymentId = refund.payment_id;
        const refundStatus = refund.status; // "COMPLETED", "REJECTED", "FAILED"
        const refundAmountCents = refund.amount_money ? Number(refund.amount_money.amount) : 0;

        const qPay = await db.collection("reservations").where("squarePaymentId", "==", paymentId).limit(1).get();
        if (qPay.empty) return;

        const resDoc = qPay.docs[0];
        const reservation = resDoc.data() as Reservation;
        const resRef = resDoc.ref;

        if (refundStatus === "COMPLETED") {
          t.update(resRef, {
            paymentStatus: "refunded",
            capturedAmountCents: Math.max(0, (reservation.capturedAmountCents || 0) - refundAmountCents),
            updatedAt: FieldValue.serverTimestamp(),
          });

          const statusEventRef = resRef.collection("statusEvents").doc();
          t.set(statusEventRef, {
            from: reservation.status,
            to: reservation.status,
            at: FieldValue.serverTimestamp(),
            actorId: "system_square_webhook",
            actorRole: "system",
            note: `Square Refund ${refund.id} COMPLETED ($${(refundAmountCents / 100).toFixed(2)})`,
            location: null,
          });
        }
      }
    });

    res.json({ received: true });
  } catch (err: any) {
    console.error(`[squareWebhook] Error processing transaction: ${err.message}`);
    res.status(500).send(`Internal webhook error: ${err.message}`);
  }
});

/**
 * Legacy Stripe Webhook (preserved for backward compatibility)
 */
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

export const stripeWebhook = onRequest(async (req, res) => {
  if (!stripe || !endpointSecret) {
    res.status(200).send("Stripe webhook disabled (Square active)");
    return;
  }

  const sig = req.headers["stripe-signature"];
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent((req as any).rawBody, sig as string, endpointSecret);
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  const eventRef = db.collection("webhookEvents").doc(event.id);
  const eventSnap = await eventRef.get();
  if (eventSnap.exists) {
    res.json({ received: true, skipped: true });
    return;
  }

  try {
    await db.runTransaction(async (t) => {
      const txSnap = await t.get(eventRef);
      if (txSnap.exists) return;

      t.set(eventRef, {
        type: event.type,
        processedAt: FieldValue.serverTimestamp(),
      });
    });
    res.json({ received: true });
  } catch (err: any) {
    res.status(500).send(`Error: ${err.message}`);
  }
});
