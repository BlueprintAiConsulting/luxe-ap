"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computePredictiveStagingTime = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const zod_1 = require("zod");
const admin_1 = require("../lib/admin");
const routesPredictor_1 = require("../services/routesPredictor");
const adminDb = admin_1.admin.firestore();
const predictiveStagingSchema = zod_1.z.object({
    reservationId: zod_1.z.string(),
});
/**
 * Callable: Computes traffic-aware departure time and updates reservation.stagingPlan
 */
exports.computePredictiveStagingTime = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    }
    const { reservationId } = predictiveStagingSchema.parse(request.data);
    const resRef = adminDb.collection("reservations").doc(reservationId);
    const resDoc = await resRef.get();
    if (!resDoc.exists) {
        throw new https_1.HttpsError("not-found", "Reservation not found");
    }
    const reservation = resDoc.data();
    const origin = reservation.pickup?.formatted || reservation.pickup?.line1 || "The Beverly Hills Hotel, CA";
    const destination = reservation.dropoff?.formatted || reservation.dropoff?.line1 || "LAX Airport Terminal 4, CA";
    const pTime = reservation.pickupAt;
    const targetDate = typeof pTime?.toDate === "function" ? pTime.toDate() : new Date(pTime || Date.now());
    const plan = await (0, routesPredictor_1.calculatePredictiveStaging)(origin, destination, targetDate);
    // Update reservation document with predictive staging plan
    await resRef.update({
        stagingPlan: plan,
        stagingPlanCalculatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return {
        success: true,
        stagingPlan: plan,
    };
});
//# sourceMappingURL=predictiveStaging.js.map