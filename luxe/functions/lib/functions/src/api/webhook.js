"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const stripe_1 = __importDefault(require("stripe"));
const db = (0, firestore_1.getFirestore)();
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
const stripe = stripeSecretKey ? new stripe_1.default(stripeSecretKey) : null;
exports.stripeWebhook = (0, https_1.onRequest)(async (req, res) => {
    if (!stripe || !endpointSecret) {
        console.error("Stripe keys missing. Cannot process webhook.");
        res.status(400).send("Webhook config error");
        return;
    }
    const sig = req.headers["stripe-signature"];
    let event;
    try {
        // Verify the signature using the raw body
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    }
    catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    // Idempotency: skip if we've already processed this exact event ID
    const eventRef = db.collection("webhookEvents").doc(event.id);
    const eventSnap = await eventRef.get();
    if (eventSnap.exists) {
        console.log(`Webhook ${event.id} already processed.`);
        res.json({ received: true, skipped: true });
        return;
    }
    try {
        await db.runTransaction(async (t) => {
            // In a transaction, we first ensure the event wasn't written by a racing invocation
            const txSnap = await t.get(eventRef);
            if (txSnap.exists) {
                return; // Already processed
            }
            t.set(eventRef, {
                type: event.type,
                processedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            // Handle the event
            const supportedEvents = [
                "payment_intent.succeeded",
                "payment_intent.payment_failed",
                "payment_intent.canceled",
                "payment_intent.amount_capturable_updated",
                "charge.refunded",
                "charge.dispute.created"
            ];
            if (supportedEvents.includes(event.type)) {
                let reservationRef = null;
                let reservation = null;
                let paymentIntentId = null;
                let reservationCode = null;
                if (event.type.startsWith("payment_intent.")) {
                    const pi = event.data.object;
                    paymentIntentId = pi.id;
                    reservationCode = pi.metadata?.reservationCode || null;
                }
                else if (event.type.startsWith("charge.")) {
                    const charge = event.data.object;
                    paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : (charge.payment_intent?.id || null);
                }
                if (reservationCode) {
                    const q = await db.collection("reservations").where("confirmationCode", "==", reservationCode).limit(1).get();
                    if (!q.empty) {
                        reservationRef = q.docs[0].ref;
                        reservation = q.docs[0].data();
                    }
                }
                else if (paymentIntentId) {
                    const q = await db.collection("reservations").where("stripePaymentIntentId", "==", paymentIntentId).limit(1).get();
                    if (!q.empty) {
                        reservationRef = q.docs[0].ref;
                        reservation = q.docs[0].data();
                    }
                }
                if (!reservationRef || !reservation)
                    return;
                let paymentStatus = reservation.paymentStatus;
                let authorizedAmountCents = reservation.authorizedAmountCents || 0;
                let capturedAmountCents = reservation.capturedAmountCents || 0;
                let pIntentId = reservation.stripePaymentIntentId || paymentIntentId;
                const rank = { none: 0, authorized: 1, captured: 2, refunded: 3, failed: 4 };
                if (event.type === "payment_intent.amount_capturable_updated") {
                    const pi = event.data.object;
                    if (rank[paymentStatus] < rank["authorized"]) {
                        paymentStatus = "authorized";
                    }
                    authorizedAmountCents = pi.amount_capturable || authorizedAmountCents;
                }
                else if (event.type === "payment_intent.succeeded") {
                    const pi = event.data.object;
                    if (rank[paymentStatus] < rank["captured"]) {
                        paymentStatus = "captured";
                    }
                    capturedAmountCents = pi.amount_received || capturedAmountCents;
                }
                else if (event.type === "payment_intent.payment_failed") {
                    paymentStatus = "failed";
                }
                else if (event.type === "payment_intent.canceled") {
                    if (paymentStatus === "authorized" || paymentStatus === "none") {
                        paymentStatus = "refunded";
                        authorizedAmountCents = 0;
                    }
                }
                else if (event.type === "charge.refunded") {
                    const charge = event.data.object;
                    capturedAmountCents = charge.amount - charge.amount_refunded;
                    if (charge.refunded) {
                        paymentStatus = "refunded";
                    }
                }
                else if (event.type === "charge.dispute.created") {
                    paymentStatus = "failed";
                }
                t.update(reservationRef, {
                    stripePaymentIntentId: pIntentId,
                    paymentStatus,
                    authorizedAmountCents,
                    capturedAmountCents,
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                });
            }
        });
        res.json({ received: true });
    }
    catch (err) {
        console.error(`Error processing webhook transaction: ${err.message}`);
        res.status(500).send(`Internal error processing webhook: ${err.message}`);
    }
});
//# sourceMappingURL=webhook.js.map