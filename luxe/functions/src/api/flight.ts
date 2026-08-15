import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { getFlightStatus } from "../services/flightTracker";
import { Reservation } from "../shared";

const db = getFirestore();

const checkFlightSchema = z.object({
  flightNumber: z.string().min(2),
  scheduledDate: z.string().optional(),
});

const shiftPickupSchema = z.object({
  reservationId: z.string(),
  shiftMinutes: z.number().int().optional(),
  newPickupAtIso: z.string().optional(),
  reason: z.string().optional(),
});

/**
 * onCall callable: Look up live flight details and arrival delays
 */
export const checkFlightStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in to check flight status.");
  }

  const data = checkFlightSchema.parse(request.data);
  const scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : new Date();

  try {
    const flightInfo = await getFlightStatus(data.flightNumber, scheduledDate);
    return flightInfo;
  } catch (error: any) {
    console.error("Error checking flight status:", error);
    throw new HttpsError("internal", error.message || "Failed to check flight status");
  }
});

/**
 * onCall callable: Adjust reservation pickup time due to flight delays
 */
export const autoShiftPickupForFlight = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }

  const role = request.auth.token.role;
  if (role !== "admin" && role !== "driver") {
    throw new HttpsError("permission-denied", "Only dispatchers or assigned drivers can shift pickup times.");
  }

  const data = shiftPickupSchema.parse(request.data);
  const resRef = db.collection("reservations").doc(data.reservationId);
  const snap = await resRef.get();

  if (!snap.exists) {
    throw new HttpsError("not-found", "Reservation not found.");
  }

  const reservation = snap.data() as Reservation;

  if (role === "driver" && reservation.driverId !== request.auth.uid) {
    throw new HttpsError("permission-denied", "Unauthorized for this reservation.");
  }

  if (reservation.status === "completed" || reservation.status === "cancelled") {
    throw new HttpsError("failed-precondition", "Cannot adjust a finished ride.");
  }

  const pTime = reservation.pickupAt as any;
  const currentPickupDate = typeof pTime?.toDate === "function" ? pTime.toDate() : new Date(pTime);

  let newPickupDate: Date;
  if (data.newPickupAtIso) {
    newPickupDate = new Date(data.newPickupAtIso);
  } else if (data.shiftMinutes) {
    newPickupDate = new Date(currentPickupDate.getTime() + data.shiftMinutes * 60000);
  } else {
    throw new HttpsError("invalid-argument", "Must provide shiftMinutes or newPickupAtIso.");
  }

  // Refresh flight status snapshot if flight number is present
  let latestFlightStatus = reservation.flightStatus || null;
  if (reservation.flightNumber) {
    try {
      latestFlightStatus = await getFlightStatus(reservation.flightNumber, newPickupDate);
    } catch (e) {
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
