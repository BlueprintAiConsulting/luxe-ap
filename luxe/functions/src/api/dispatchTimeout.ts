import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { admin } from "../lib/admin";
import { Reservation, Driver } from "../shared";

const adminDb = admin.firestore();

export interface EscalationResult {
  reservationId: string;
  status: "accepted" | "escalated" | "max_tier_reached";
  previousDriverId?: string;
  newDriverId?: string;
  newTier?: number;
  message: string;
}

/**
 * Executes a 90-second escalation check.
 * If driver has not accepted, auto-cascades to the next tier in the AI matching waterfall.
 */
export async function processDispatchEscalation(
  reservationId: string,
  expectedDriverId: string
): Promise<EscalationResult> {
  const resRef = adminDb.collection("reservations").doc(reservationId);
  const resDoc = await resRef.get();

  if (!resDoc.exists) {
    return { reservationId, status: "max_tier_reached", message: "Reservation not found" };
  }

  const reservation = resDoc.data() as Reservation;

  // If trip is already accepted, en_route, or completed, no escalation needed
  if (reservation.status !== "assigned" && reservation.status !== "confirmed") {
    return { reservationId, status: "accepted", message: "Trip already in progress or accepted" };
  }

  // If driver has already accepted
  if ((reservation as any).driverAcceptedAt) {
    return { reservationId, status: "accepted", message: "Driver already accepted assignment" };
  }

  // Driver didn't accept within timeout -> Find next driver candidate
  const currentTier = (reservation as any).currentDispatchTier || 1;
  const nextTier = currentTier + 1;

  // Query next tier drivers
  const targetStarTier = nextTier === 2 ? 4 : 3;
  const driversSnapshot = await adminDb.collection("drivers")
    .where("active", "==", true)
    .where("bookable", "==", true)
    .where("starRatingTier", "<=", targetStarTier)
    .get();

  const candidateDrivers: Driver[] = [];
  driversSnapshot.forEach((d) => {
    const drv = d.data() as Driver;
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
      createdAt: FieldValue.serverTimestamp(),
      read: false,
    });

    await resRef.update({
      dispatchEscalationStatus: "manual_review_needed",
      dispatchEvents: FieldValue.arrayUnion({
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
    dispatchEvents: FieldValue.arrayUnion({
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
    createdAt: FieldValue.serverTimestamp(),
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
export const acceptReservationTrip = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const { reservationId } = z.object({ reservationId: z.string() }).parse(request.data);
  const driverId = request.auth.uid;

  const resRef = adminDb.collection("reservations").doc(reservationId);
  const docSnap = await resRef.get();

  if (!docSnap.exists) {
    throw new HttpsError("not-found", "Reservation not found");
  }

  await resRef.update({
    status: "assigned",
    driverAcceptedAt: FieldValue.serverTimestamp(),
    driverAcceptedBy: driverId,
    dispatchEvents: FieldValue.arrayUnion({
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
export const triggerDispatchTimeoutCheck = onCall(async (request) => {
  const { reservationId, driverId } = z.object({
    reservationId: z.string(),
    driverId: z.string(),
  }).parse(request.data);

  return processDispatchEscalation(reservationId, driverId);
});
