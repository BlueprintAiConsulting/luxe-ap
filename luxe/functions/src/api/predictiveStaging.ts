import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { admin } from "../lib/admin";
import { calculatePredictiveStaging } from "../services/routesPredictor";
import { Reservation } from "../shared";

const adminDb = admin.firestore();

const predictiveStagingSchema = z.object({
  reservationId: z.string(),
});

/**
 * Callable: Computes traffic-aware departure time and updates reservation.stagingPlan
 */
export const computePredictiveStagingTime = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const { reservationId } = predictiveStagingSchema.parse(request.data);

  const resRef = adminDb.collection("reservations").doc(reservationId);
  const resDoc = await resRef.get();

  if (!resDoc.exists) {
    throw new HttpsError("not-found", "Reservation not found");
  }

  const reservation = resDoc.data() as Reservation;

  const origin = reservation.pickup?.formatted || reservation.pickup?.line1 || "The Beverly Hills Hotel, CA";
  const destination = reservation.dropoff?.formatted || reservation.dropoff?.line1 || "LAX Airport Terminal 4, CA";

  const pTime = reservation.pickupAt as any;
  const targetDate = typeof pTime?.toDate === "function" ? pTime.toDate() : new Date(pTime || Date.now());

  const plan = await calculatePredictiveStaging(origin, destination, targetDate);

  // Update reservation document with predictive staging plan
  await resRef.update({
    stagingPlan: plan,
    stagingPlanCalculatedAt: FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    stagingPlan: plan,
  };
});
