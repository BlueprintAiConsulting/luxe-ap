"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerDispatchTimeoutCheck = exports.acceptReservationTrip = void 0;
exports.processDispatchEscalation = processDispatchEscalation;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
const admin_1 = require("../lib/admin");
const adminDb = admin_1.admin.firestore();
/**
 * Executes a 90-second escalation check.
 * If driver has not accepted, auto-cascades to the next tier in the AI matching waterfall.
 */
async function processDispatchEscalation(reservationId, expectedDriverId) {
    const resRef = adminDb.collection("reservations").doc(reservationId);
    const resDoc = await resRef.get();
    if (!resDoc.exists) {
        return { reservationId, status: "max_tier_reached", message: "Reservation not found" };
    }
    const reservation = resDoc.data();
    // If trip is already accepted, en_route, or completed, no escalation needed
    if (reservation.status !== "assigned" && reservation.status !== "confirmed") {
        return { reservationId, status: "accepted", message: "Trip already in progress or accepted" };
    }
    // If driver has already accepted
    if (reservation.driverAcceptedAt) {
        return { reservationId, status: "accepted", message: "Driver already accepted assignment" };
    }
    // Driver didn't accept within timeout -> Find next driver candidate
    const currentTier = reservation.currentDispatchTier || 1;
    const nextTier = currentTier + 1;
    // Query next tier drivers
    const targetStarTier = nextTier === 2 ? 4 : 3;
    const driversSnapshot = await adminDb.collection("drivers")
        .where("active", "==", true)
        .where("bookable", "==", true)
        .where("starRatingTier", "<=", targetStarTier)
        .get();
    const candidateDrivers = [];
    driversSnapshot.forEach((d) => {
        const drv = d.data();
        if (drv.driverId !== expectedDriverId) {
            candidateDrivers.push(drv);
        }
    });
    if (candidateDrivers.length === 0) {
        // Alert Joe that all tiers have been exhausted
        await adminDb.collection("adminNotifications").add({
            type: "DISPATCH_ESCALATION_FAILED",
            title: `⚠️ Dispatch Escalation Alert: ${reservation.confirmationCode}`,
            message: `Chauffeur (${expectedDriverId}) did not accept within 90s. No subsequent drivers available in Tier ${nextTier}. Manual intervention required.`,
            reservationId,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            read: false,
        });
        await resRef.update({
            dispatchEscalationStatus: "manual_review_needed",
            dispatchEvents: firestore_1.FieldValue.arrayUnion({
                type: "TIMEOUT_EXHAUSTED",
                driverId: expectedDriverId,
                tier: currentTier,
                timestamp: new Date().toISOString(),
            }),
        });
        return {
            reservationId,
            status: "max_tier_reached",
            previousDriverId: expectedDriverId,
            message: "No fallback drivers available in subsequent tiers",
        };
    }
    // Pick top candidate from next tier
    const newDriver = candidateDrivers[0];
    let assignedVehicleId = newDriver.assignedVehicleId || reservation.vehicleId;
    if (!assignedVehicleId) {
        const vehSnap = await adminDb.collection("vehicles").where("active", "==", true).limit(1).get();
        if (!vehSnap.empty) {
            assignedVehicleId = vehSnap.docs[0].id;
        }
    }
    // Cascade to new driver
    await resRef.update({
        driverId: newDriver.driverId,
        driverName: newDriver.displayName,
        assignedDriverId: newDriver.driverId,
        vehicleId: assignedVehicleId,
        status: "assigned",
        driverAcceptedAt: null,
        currentDispatchTier: nextTier,
        dispatchEvents: firestore_1.FieldValue.arrayUnion({
            type: "TIMEOUT_CASCADED",
            previousDriverId: expectedDriverId,
            newDriverId: newDriver.driverId,
            tier: nextTier,
            timestamp: new Date().toISOString(),
        }),
    });
    // Notify Admin Joe
    await adminDb.collection("adminNotifications").add({
        type: "DISPATCH_AUTO_CASCADED",
        title: `⚡ Dispatch Cascaded (Tier ${nextTier}): ${reservation.confirmationCode}`,
        message: `Driver ${expectedDriverId} timed out after 90s. Auto-reassigned to ${newDriver.displayName} (${newDriver.rating}★).`,
        reservationId,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        read: false,
    });
    return {
        reservationId,
        status: "escalated",
        previousDriverId: expectedDriverId,
        newDriverId: newDriver.driverId,
        newTier: nextTier,
        message: `Auto-cascaded to ${newDriver.displayName}`,
    };
}
/**
 * Driver accepts the assigned trip, clearing escalation timeout
 */
exports.acceptReservationTrip = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    }
    const { reservationId } = zod_1.z.object({ reservationId: zod_1.z.string() }).parse(request.data);
    const driverId = request.auth.uid;
    const resRef = adminDb.collection("reservations").doc(reservationId);
    const docSnap = await resRef.get();
    if (!docSnap.exists) {
        throw new https_1.HttpsError("not-found", "Reservation not found");
    }
    await resRef.update({
        status: "assigned",
        driverAcceptedAt: firestore_1.FieldValue.serverTimestamp(),
        driverAcceptedBy: driverId,
        dispatchEvents: firestore_1.FieldValue.arrayUnion({
            type: "DRIVER_ACCEPTED",
            driverId,
            timestamp: new Date().toISOString(),
        }),
    });
    return { success: true, message: "Trip accepted by chauffeur" };
});
/**
 * Callable/Cloud Task handler to check and trigger escalation
 */
exports.triggerDispatchTimeoutCheck = (0, https_1.onCall)(async (request) => {
    const { reservationId, driverId } = zod_1.z.object({
        reservationId: zod_1.z.string(),
        driverId: zod_1.z.string(),
    }).parse(request.data);
    return processDispatchEscalation(reservationId, driverId);
});
//# sourceMappingURL=dispatchTimeout.js.map