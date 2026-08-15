import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { Reservation, User } from "../shared";

const db = getFirestore();

export const submitRating = onCall({ minInstances: 1 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in to submit a rating.");
  }

  const { reservationId, rating, feedback = "" } = request.data;
  
  if (!reservationId || typeof rating !== "number" || rating < 1 || rating > 5) {
    throw new HttpsError("invalid-argument", "Valid reservationId and rating (1-5) required.");
  }

  const role = request.auth.token.role;
  if (role !== "rider" && role !== "driver") {
    throw new HttpsError("permission-denied", "Only riders and drivers can submit ratings.");
  }

  const resRef = db.collection("reservations").doc(reservationId);

  return db.runTransaction(async (t) => {
    const snap = await t.get(resRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Reservation not found.");
    }
    const reservation = snap.data() as Reservation;

    // Must be terminal state
    if (reservation.status !== "completed" && reservation.status !== "cancelled") {
      throw new HttpsError("failed-precondition", "Trip must be completed to rate.");
    }

    let targetUserId: string;
    let isRiderRatingDriver = false;

    if (role === "rider") {
      if (reservation.riderId !== request.auth!.uid) {
        throw new HttpsError("permission-denied", "You can only rate your own trips.");
      }
      if (!reservation.driverId) {
        throw new HttpsError("failed-precondition", "No driver was assigned to this trip.");
      }
      if (reservation.driverRating) {
        throw new HttpsError("already-exists", "You have already rated this trip.");
      }
      targetUserId = reservation.driverId;
      isRiderRatingDriver = true;
    } else {
      // Driver rating rider
      if (reservation.driverId !== request.auth!.uid) {
        throw new HttpsError("permission-denied", "You can only rate your own trips.");
      }
      if (reservation.riderRating) {
        throw new HttpsError("already-exists", "You have already rated this trip.");
      }
      targetUserId = reservation.riderId;
      isRiderRatingDriver = false;
    }

    // 1. Update the reservation
    const resUpdate: any = {
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (isRiderRatingDriver) {
      resUpdate.driverRating = rating;
      resUpdate.driverFeedback = feedback;
    } else {
      resUpdate.riderRating = rating;
      resUpdate.riderFeedback = feedback;
    }
    t.update(resRef, resUpdate);

    // 2. Update the target user's aggregates
    const userRef = db.collection("users").doc(targetUserId);
    const userSnap = await t.get(userRef);
    if (userSnap.exists) {
      const user = userSnap.data() as User;
      const currentTotal = user.totalRatings || 0;
      const currentAvg = user.averageRating || 0;

      const newTotal = currentTotal + 1;
      const newAvg = ((currentAvg * currentTotal) + rating) / newTotal;

      t.update(userRef, {
        totalRatings: newTotal,
        averageRating: parseFloat(newAvg.toFixed(2)),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return { success: true };
  });
});
