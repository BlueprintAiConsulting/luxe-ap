"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoShiftPickupForFlight = exports.checkFlightStatus = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
const flightTracker_1 = require("../services/flightTracker");
const db = (0, firestore_1.getFirestore)();
const checkFlightSchema = zod_1.z.object({
    flightNumber: zod_1.z.string().min(2),
    scheduledDate: zod_1.z.string().optional(),
});
const shiftPickupSchema = zod_1.z.object({
    reservationId: zod_1.z.string(),
    shiftMinutes: zod_1.z.number().int().optional(),
    newPickupAtIso: zod_1.z.string().optional(),
    reason: zod_1.z.string().optional(),
});
/**
 * onCall callable: Look up live flight details and arrival delays
 */
exports.checkFlightStatus = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Must be logged in to check flight status.");
    }
    const data = checkFlightSchema.parse(request.data);
    const scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : new Date();
    try {
        const flightInfo = await (0, flightTracker_1.getFlightStatus)(data.flightNumber, scheduledDate);
        return flightInfo;
    }
    catch (error) {
        console.error("Error checking flight status:", error);
        throw new https_1.HttpsError("internal", error.message || "Failed to check flight status");
    }
});
/**
 * onCall callable: Adjust reservation pickup time due to flight delays
 */
exports.autoShiftPickupForFlight = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Must be logged in.");
    }
    const role = request.auth.token.role;
    if (role !== "admin" && role !== "driver") {
        throw new https_1.HttpsError("permission-denied", "Only dispatchers or assigned drivers can shift pickup times.");
    }
    const data = shiftPickupSchema.parse(request.data);
    const resRef = db.collection("reservations").doc(data.reservationId);
    const snap = await resRef.get();
    if (!snap.exists) {
        throw new https_1.HttpsError("not-found", "Reservation not found.");
    }
    const reservation = snap.data();
    if (role === "driver" && reservation.driverId !== request.auth.uid) {
        throw new https_1.HttpsError("permission-denied", "Unauthorized for this reservation.");
    }
    if (reservation.status === "completed" || reservation.status === "cancelled") {
        throw new https_1.HttpsError("failed-precondition", "Cannot adjust a finished ride.");
    }
    const pTime = reservation.pickupAt;
    const currentPickupDate = typeof pTime?.toDate === "function" ? pTime.toDate() : new Date(pTime);
    let newPickupDate;
    if (data.newPickupAtIso) {
        newPickupDate = new Date(data.newPickupAtIso);
    }
    else if (data.shiftMinutes) {
        newPickupDate = new Date(currentPickupDate.getTime() + data.shiftMinutes * 60000);
    }
    else {
        throw new https_1.HttpsError("invalid-argument", "Must provide shiftMinutes or newPickupAtIso.");
    }
    // Refresh flight status snapshot if flight number is present
    let latestFlightStatus = reservation.flightStatus || null;
    if (reservation.flightNumber) {
        try {
            latestFlightStatus = await (0, flightTracker_1.getFlightStatus)(reservation.flightNumber, newPickupDate);
        }
        catch (e) {
            console.warn("Could not refresh flight status during shift:", e);
        }
    }
    const reason = data.reason || `Flight delay auto-adjusted (+${data.shiftMinutes || 0}m)`;
    await resRef.update({
        pickupAt: newPickupDate,
        flightStatus: latestFlightStatus,
        specialInstructions: `${reservation.specialInstructions || ""}\n[Flight Auto-Shift]: ${reason} at ${new Date().toLocaleTimeString()}`.trim(),
        updatedAt: new Date(),
    });
    // If there's an assigned driver, notify them via notification queue / mail collection
    if (reservation.driverId) {
        await db.collection("mail").add({
            to: reservation.driverName ? `${reservation.driverName}` : "driver",
            subject: `Pickup Time Adjusted: ${reservation.confirmationCode}`,
            text: `Chauffeur Alert: Pickup time for reservation ${reservation.confirmationCode} (${reservation.riderName}) was shifted to ${newPickupDate.toLocaleTimeString()} due to: ${reason}`,
            metadata: { reservationId: reservation.reservationId, type: "flight_delay_shift" },
            createdAt: new Date(),
        });
    }
    return {
        success: true,
        reservationId: data.reservationId,
        previousPickupAt: currentPickupDate.toISOString(),
        newPickupAt: newPickupDate.toISOString(),
        flightStatus: latestFlightStatus,
        reason,
    };
});
//# sourceMappingURL=flight.js.map