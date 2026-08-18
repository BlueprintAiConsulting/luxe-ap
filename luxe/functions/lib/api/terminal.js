"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelTerminalPayment = exports.checkTerminalPaymentStatus = exports.requestInVehicleTerminalPayment = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
const square_1 = require("../services/square");
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)();
const requestTerminalSchema = zod_1.z.object({
    reservationId: zod_1.z.string(),
    amountCents: zod_1.z.number().int().positive(),
    reason: zod_1.z.enum(["extra_wait_time", "hourly_extension", "in_vehicle_tip", "incidentals", "additional_stops"]),
    deviceId: zod_1.z.string().optional(),
    note: zod_1.z.string().optional(),
});
/**
 * requestInVehicleTerminalPayment: Allows chauffeurs or dispatchers to push an in-person
 * card dip/tap payment prompt to the handheld Square Terminal inside the vehicle.
 */
exports.requestInVehicleTerminalPayment = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required to initiate terminal payments.");
    }
    const role = request.auth.token.role;
    if (role !== "driver" && role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Only assigned chauffeurs or dispatchers can request terminal checkouts.");
    }
    const data = requestTerminalSchema.parse(request.data);
    const resDoc = await db.collection("reservations").doc(data.reservationId).get();
    if (!resDoc.exists) {
        throw new https_1.HttpsError("not-found", "Reservation not found.");
    }
    const reservation = resDoc.data();
    if (role === "driver" && reservation.driverId !== request.auth.uid) {
        throw new https_1.HttpsError("permission-denied", "Unauthorized: You are not the assigned chauffeur for this charter.");
    }
    const amountFormatted = `$${(data.amountCents / 100).toFixed(2)}`;
    const reasonLabel = data.reason.replace(/_/g, " ").toUpperCase();
    const checkoutResult = await (0, square_1.createSquareTerminalCheckout)({
        amountCents: data.amountCents,
        reservationId: data.reservationId,
        confirmationCode: reservation.confirmationCode,
        deviceId: data.deviceId,
        note: data.note || `LUXE In-Vehicle ${reasonLabel} (#${reservation.confirmationCode})`,
    });
    if (!checkoutResult.success || !checkoutResult.checkoutId) {
        throw new https_1.HttpsError("internal", checkoutResult.errorMessage || "Failed to initialize Square Terminal checkout.");
    }
    const resRef = resDoc.ref;
    const batch = db.batch();
    // 1. Update Reservation with active terminal checkout metadata
    batch.update(resRef, {
        activeTerminalCheckoutId: checkoutResult.checkoutId,
        activeTerminalStatus: checkoutResult.status || "PENDING",
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    // 2. Add Status Event Audit Log
    const eventRef = resRef.collection("statusEvents").doc();
    const statusEvent = {
        from: reservation.status,
        to: reservation.status,
        at: firestore_1.FieldValue.serverTimestamp(),
        actorId: request.auth.uid,
        actorRole: role,
        note: `In-vehicle Square Terminal prompt dispatched: ${amountFormatted} (${reasonLabel}) [ID: ${checkoutResult.checkoutId}].`,
        location: null,
    };
    batch.set(eventRef, statusEvent);
    // 3. Inject Concierge Chat Notification
    const chatRef = resRef.collection("messages").doc();
    batch.set(chatRef, {
        senderId: "system_terminal",
        senderName: "LUXE In-Vehicle Terminal",
        senderRole: "system",
        content: `📟 In-Vehicle Payment: A prompt for ${amountFormatted} (${reasonLabel}) has been pushed to the vehicle terminal. Please tap or insert your card.`,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        readBy: [],
    });
    await batch.commit();
    return {
        success: true,
        checkoutId: checkoutResult.checkoutId,
        status: checkoutResult.status,
        amountFormatted,
        message: `Terminal payment prompt for ${amountFormatted} sent to vehicle reader.`,
    };
});
/**
 * checkTerminalPaymentStatus: Polls real-time checkout state from Square Terminal API.
 */
exports.checkTerminalPaymentStatus = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const { checkoutId, reservationId } = request.data;
    if (!checkoutId || !reservationId) {
        throw new https_1.HttpsError("invalid-argument", "checkoutId and reservationId are required.");
    }
    const statusResult = await (0, square_1.getSquareTerminalCheckout)(checkoutId);
    const resDoc = await db.collection("reservations").doc(reservationId).get();
    if (resDoc.exists && statusResult.status === "COMPLETED") {
        const reservation = resDoc.data();
        const resRef = resDoc.ref;
        await resRef.update({
            activeTerminalStatus: "COMPLETED",
            paymentStatus: "captured",
            squarePaymentId: statusResult.paymentId || reservation.squarePaymentId || null,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        const eventRef = resRef.collection("statusEvents").doc();
        await eventRef.set({
            from: reservation.status,
            to: reservation.status,
            at: firestore_1.FieldValue.serverTimestamp(),
            actorId: request.auth.uid,
            actorRole: request.auth.token.role || "driver",
            note: `In-vehicle Square Terminal payment COMPLETED (Payment ID: ${statusResult.paymentId || checkoutId})`,
            location: null,
        });
    }
    return statusResult;
});
/**
 * cancelTerminalPayment: Cancels an open Square Terminal checkout prompt.
 */
exports.cancelTerminalPayment = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const { checkoutId, reservationId } = request.data;
    if (!checkoutId) {
        throw new https_1.HttpsError("invalid-argument", "checkoutId is required.");
    }
    const cancelResult = await (0, square_1.cancelSquareTerminalCheckout)(checkoutId);
    if (reservationId) {
        const resRef = db.collection("reservations").doc(reservationId);
        await resRef.update({
            activeTerminalStatus: "CANCELED",
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    }
    return cancelResult;
});
//# sourceMappingURL=terminal.js.map