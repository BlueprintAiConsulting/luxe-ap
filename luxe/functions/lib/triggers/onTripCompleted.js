"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onTripCompleted = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
const invoice_1 = require("../api/invoice");
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_2.getFirestore)();
/**
 * onTripCompleted triggers automatically when a reservation status changes to "completed".
 * 1. Generates the itemized Executive HTML/PDF Invoice.
 * 2. Queues the official receipt email in the /mail collection.
 * 3. Injects a completion note into the 3-Way Concierge Chat.
 * 4. Logs a statusEvent in the reservation's immutable ledger.
 */
exports.onTripCompleted = (0, firestore_1.onDocumentWritten)("reservations/{reservationId}", async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!afterData)
        return; // Deleted
    // Check if status transitioned to "completed"
    if (beforeData?.status !== "completed" && afterData.status === "completed") {
        const reservationId = event.params.reservationId;
        const resRef = db.collection("reservations").doc(reservationId);
        console.log(`[onTripCompleted] Processing completion receipt for reservation #${afterData.confirmationCode} (${reservationId})`);
        // 1. Determine recipient email
        let recipientEmail = afterData.riderEmail;
        if (!recipientEmail && afterData.riderId) {
            try {
                const userDoc = await db.collection("users").doc(afterData.riderId).get();
                if (userDoc.exists) {
                    recipientEmail = userDoc.data()?.email;
                }
            }
            catch (err) {
                console.warn(`[onTripCompleted] Could not fetch user email for ${afterData.riderId}:`, err);
            }
        }
        const finalRecipient = recipientEmail || "vip@luxe.app";
        const confirmationCode = afterData.confirmationCode || "LUXE";
        const totalAmount = afterData.pricing?.estimatedTotalCents || afterData.pricing?.totalCents || 0;
        const totalStr = `$${(totalAmount / 100).toFixed(2)}`;
        const batch = db.batch();
        // 2. Queue Email in /mail collection
        const invoiceHtml = (0, invoice_1.generateExecutiveInvoiceHtml)(afterData);
        const mailRef = db.collection("mail").doc();
        batch.set(mailRef, {
            to: [finalRecipient],
            message: {
                subject: `LUXE Executive Charter Receipt #${confirmationCode} (${totalStr})`,
                html: invoiceHtml,
            },
            reservationId,
            type: "automatic_trip_receipt",
            createdAt: firestore_2.FieldValue.serverTimestamp(),
        });
        // 3. Post Concierge Chat Farewell Message
        const chatRef = resRef.collection("messages").doc();
        batch.set(chatRef, {
            senderId: "system_concierge",
            senderName: "LUXE Concierge",
            senderRole: "system",
            content: `🥂 Charter Completed: Thank you for traveling with LUXE. Your itemized executive receipt (${totalStr}) has been auto-dispatched to ${finalRecipient}.`,
            createdAt: firestore_2.FieldValue.serverTimestamp(),
            readBy: [],
        });
        // 4. Log Immutable Status Event
        const eventRef = resRef.collection("statusEvents").doc();
        const statusEvent = {
            from: beforeData?.status || "onboard",
            to: "completed",
            at: firestore_2.FieldValue.serverTimestamp(),
            actorId: "system_trip_completion",
            actorRole: "system",
            note: `Charter completed. Executive receipt auto-dispatched to ${finalRecipient}.`,
            location: null,
        };
        batch.set(eventRef, statusEvent);
        // 5. Update Reservation Document
        batch.update(resRef, {
            invoiceSentAt: firestore_2.FieldValue.serverTimestamp(),
            updatedAt: firestore_2.FieldValue.serverTimestamp(),
        });
        await batch.commit();
        console.log(`[onTripCompleted] Successfully queued receipt delivery to ${finalRecipient}`);
    }
});
//# sourceMappingURL=onTripCompleted.js.map