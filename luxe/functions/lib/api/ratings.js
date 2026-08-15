"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitRating = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
exports.submitRating = (0, https_1.onCall)({ minInstances: 1 }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Must be logged in to submit a rating.");
    }
    const { reservationId, rating, feedback = "" } = request.data;
    if (!reservationId || typeof rating !== "number" || rating < 1 || rating > 5) {
        throw new https_1.HttpsError("invalid-argument", "Valid reservationId and rating (1-5) required.");
    }
    const role = request.auth.token.role;
    if (role !== "rider" && role !== "driver") {
        throw new https_1.HttpsError("permission-denied", "Only riders and drivers can submit ratings.");
    }
    const resRef = db.collection("reservations").doc(reservationId);
    return db.runTransaction(async (t) => {
        const snap = await t.get(resRef);
        if (!snap.exists) {
            throw new https_1.HttpsError("not-found", "Reservation not found.");
        }
        const reservation = snap.data();
        // Must be terminal state
        if (reservation.status !== "completed" && reservation.status !== "cancelled") {
            throw new https_1.HttpsError("failed-precondition", "Trip must be completed to rate.");
        }
        let targetUserId;
        let isRiderRatingDriver = false;
        if (role === "rider") {
            if (reservation.riderId !== request.auth.uid) {
                throw new https_1.HttpsError("permission-denied", "You can only rate your own trips.");
            }
            if (!reservation.driverId) {
                throw new https_1.HttpsError("failed-precondition", "No driver was assigned to this trip.");
            }
            if (reservation.driverRating) {
                throw new https_1.HttpsError("already-exists", "You have already rated this trip.");
            }
            targetUserId = reservation.driverId;
            isRiderRatingDriver = true;
        }
        else {
            // Driver rating rider
            if (reservation.driverId !== request.auth.uid) {
                throw new https_1.HttpsError("permission-denied", "You can only rate your own trips.");
            }
            if (reservation.riderRating) {
                throw new https_1.HttpsError("already-exists", "You have already rated this trip.");
            }
            targetUserId = reservation.riderId;
            isRiderRatingDriver = false;
        }
        // 1. Update the reservation
        const resUpdate = {
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        if (isRiderRatingDriver) {
            resUpdate.driverRating = rating;
            resUpdate.driverFeedback = feedback;
        }
        else {
            resUpdate.riderRating = rating;
            resUpdate.riderFeedback = feedback;
        }
        t.update(resRef, resUpdate);
        // 2. Update the target user's aggregates
        const userRef = db.collection("users").doc(targetUserId);
        const userSnap = await t.get(userRef);
        if (userSnap.exists) {
            const user = userSnap.data();
            const currentTotal = user.totalRatings || 0;
            const currentAvg = user.averageRating || 0;
            const newTotal = currentTotal + 1;
            const newAvg = ((currentAvg * currentTotal) + rating) / newTotal;
            t.update(userRef, {
                totalRatings: newTotal,
                averageRating: parseFloat(newAvg.toFixed(2)),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        return { success: true };
    });
});
//# sourceMappingURL=ratings.js.map