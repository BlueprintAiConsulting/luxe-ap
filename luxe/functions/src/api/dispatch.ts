import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { admin } from "../lib/admin";
import { Reservation, Driver, Vehicle } from "../../../src/lib/types";

const adminDb = admin.firestore();

const assignSchema = z.object({
  reservationId: z.string(),
  driverId: z.string(),
  vehicleId: z.string(),
});

export const assignDriverAndVehicle = onCall(async (request) => {
  if (!request.auth || request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can assign drivers.");
  }

  const data = assignSchema.parse(request.data);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return adminDb.runTransaction(async (t: any) => {
    const reservationRef = adminDb.collection("reservations").doc(data.reservationId);
    const reservationDoc = await t.get(reservationRef);

    if (!reservationDoc.exists) {
      throw new HttpsError("not-found", "Reservation not found.");
    }

    const reservation = reservationDoc.data() as Reservation;

    if (reservation.status === "completed" || reservation.status === "cancelled" || reservation.status === "no_show") {
      throw new HttpsError("failed-precondition", "Cannot assign a finished reservation.");
    }

    // 1. Fetch Driver and Vehicle details
    const driverDoc = await t.get(adminDb.collection("drivers").doc(data.driverId));
    if (!driverDoc.exists) {
      throw new HttpsError("not-found", "Driver not found.");
    }
    const driver = driverDoc.data() as Driver;

    const vehicleDoc = await t.get(adminDb.collection("vehicles").doc(data.vehicleId));
    if (!vehicleDoc.exists) {
      throw new HttpsError("not-found", "Vehicle not found.");
    }
    const vehicle = vehicleDoc.data() as Vehicle;

    // 2. Overlap Check
    // Get bounds for the day of this reservation's pickup to minimize reads
    const pTime = reservation.pickupAt as any;
    const pickupDate = typeof pTime?.toDate === "function" ? pTime.toDate() : new Date(pTime);
    
    // Determine the start and end of the UTC day for the query
    const startOfDay = new Date(pickupDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(pickupDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const sameDayTripsSnapshot = await t.get(
      adminDb.collection("reservations")
        .where("pickupAt", ">=", startOfDay)
        .where("pickupAt", "<=", endOfDay)
        .where("status", "in", ["confirmed", "assigned", "en_route", "arrived", "onboard"])
    );

    // Calculate this trip's exact window
    const durationSec = reservation.estimatedDurationSeconds || 3600;
    // Add a 1-hour buffer to start and end
    const tripStart = pickupDate.getTime() - (60 * 60 * 1000);
    const tripEnd = pickupDate.getTime() + (durationSec * 1000) + (60 * 60 * 1000);

    for (const doc of sameDayTripsSnapshot.docs) {
      if (doc.id === data.reservationId) continue;
      
      const other = doc.data() as Reservation;
      
      // If the other trip doesn't involve our driver or vehicle, skip
      if (other.driverId !== data.driverId && other.vehicleId !== data.vehicleId) continue;

      const otherPTime = other.pickupAt as any;
      const otherStart = (typeof otherPTime?.toDate === "function" ? otherPTime.toDate() : new Date(otherPTime)).getTime();
      const otherDuration = other.estimatedDurationSeconds || 3600;
      const otherEnd = otherStart + (otherDuration * 1000);

      // Check overlap
      const overlaps = tripStart < otherEnd && tripEnd > otherStart;
      
      if (overlaps) {
        if (other.driverId === data.driverId) {
          throw new HttpsError("failed-precondition", `Driver is double-booked with reservation ${other.confirmationCode}`);
        }
        if (other.vehicleId === data.vehicleId) {
          throw new HttpsError("failed-precondition", `Vehicle is double-booked with reservation ${other.confirmationCode}`);
        }
      }
    }

    // 3. Prepare Updates
    const driverSubstituted = reservation.requestedDriverId ? reservation.requestedDriverId !== data.driverId : false;
    
    const nextStatus = "assigned";

    t.update(reservationRef, {
      driverId: data.driverId,
      driverName: driver.displayName,
      driverPhotoUrl: driver.photoUrl,
      vehicleId: data.vehicleId,
      vehicleDescription: `${vehicle.make} ${vehicle.model} (${vehicle.color})`,
      driverSubstituted,
      status: nextStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const eventRef = reservationRef.collection("statusEvents").doc();
    t.set(eventRef, {
      status: nextStatus,
      actor: "admin",
      actorId: request.auth?.uid || "",
      reason: `Assigned driver ${driver.displayName} and vehicle ${vehicle.licensePlate}`,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true, driverSubstituted };
  });
});

const overrideSchema = z.object({
  reservationId: z.string(),
  status: z.enum(["draft", "quoted", "confirmed", "assigned", "en_route", "arrived", "onboard", "completed", "cancelled", "no_show"]),
  reason: z.string().min(1),
});

export const adminOverrideStatus = onCall(async (request) => {
  if (!request.auth || request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can override status.");
  }

  const data = overrideSchema.parse(request.data);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return adminDb.runTransaction(async (t: any) => {
    const reservationRef = adminDb.collection("reservations").doc(data.reservationId);
    const reservationDoc = await t.get(reservationRef);

    if (!reservationDoc.exists) {
      throw new HttpsError("not-found", "Reservation not found.");
    }

    t.update(reservationRef, {
      status: data.status,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const eventRef = reservationRef.collection("statusEvents").doc();
    t.set(eventRef, {
      status: data.status,
      actor: "admin",
      actorId: request.auth?.uid || "unknown",
      reason: data.reason,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createAdminResSchema = z.object({
  riderId: z.string(),
  skipPayment: z.boolean().default(false),
  idempotencyKey: z.string(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quote: z.any(), // Uses quoteInputSchema internally via calculatePrice or just any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pickup: z.any(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dropoff: z.any().nullable(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stops: z.array(z.any()),
  passengers: z.number().int(),
  luggage: z.number().int(),
  flightNumber: z.string().nullable(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  preferences: z.any().nullable(),
  notes: z.string().nullable(),
});

import { calculatePrice } from "../pricing";
import { Airport, PricingRuleSet } from "../../../src/lib/types";

export const createAdminReservation = onCall(async (request) => {
  if (!request.auth || request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can manually book.");
  }

  const data = createAdminResSchema.parse(request.data);

  const duplicateCheck = await adminDb.collection("reservations")
    .where("idempotencyKey", "==", data.idempotencyKey)
    .limit(1)
    .get();

  if (!duplicateCheck.empty) {
    return { reservationId: duplicateCheck.docs[0].id };
  }

  const globalSnap = await adminDb.collection("settings").doc("global").get();
  const activeRuleSetId = globalSnap.data()?.activePricingRuleSetId;
  const ruleSetSnap = await adminDb.collection("pricingRuleSets").doc(activeRuleSetId).get();
  const ruleSet = ruleSetSnap.data() as PricingRuleSet;

  let airport: Airport | undefined = undefined;
  if (data.quote.airportCode) {
    const aptSnap = await adminDb.collection("airports").doc(data.quote.airportCode).get();
    if (aptSnap.exists) {
      airport = aptSnap.data() as Airport;
    }
  }

  const priceBreakdown = calculatePrice(
    data.quote,
    ruleSet,
    new Date(),
    airport
  );

  const codeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let confStr = "";
  for (let i = 0; i < 6; i++) {
    confStr += codeChars.charAt(Math.floor(Math.random() * codeChars.length));
  }
  const confirmationCode = `BCC-${confStr}`;

  const riderSnap = await adminDb.collection("users").doc(data.riderId).get();
  const riderData = riderSnap.data();

  const reservationRef = adminDb.collection("reservations").doc();
  const batch = adminDb.batch();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reservationDoc: any = {
    reservationId: reservationRef.id,
    confirmationCode,
    riderId: data.riderId,
    riderName: `${riderData?.firstName} ${riderData?.lastName}`,
    riderPhone: riderData?.phone || "",
    riderEmail: riderData?.email || null,
    bookedByAdmin: true,
    status: "confirmed",
    pricingRuleSetId: activeRuleSetId,
    idempotencyKey: data.idempotencyKey,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),

    estimatedDistanceMeters: null,
    estimatedDurationSeconds: null,
    pricing: priceBreakdown,
    
    stripePaymentIntentId: null,
    paymentStatus: data.skipPayment ? "none" : "none", // Will be handled later if invoiced
    
    pickupAt: data.quote.pickupAt,
    timezone: data.quote.timezone,
    tripType: data.quote.tripType,
    pickup: data.pickup,
    dropoff: data.dropoff,
    stops: data.stops,
    hours: data.quote.hours,
    passengers: data.passengers,
    luggage: data.luggage,
    
    flightNumber: data.flightNumber || null,
    airlineCode: null,
    specialInstructions: data.notes || "",
    
    preferences: data.preferences,
    
    classId: data.quote.classId,
    className: ruleSet.classRates[data.quote.classId] ? data.quote.classId : "Unknown",
    vehicleId: null,
    vehicleDescription: null,
    driverId: null,
    driverName: null,
    driverPhotoUrl: null,
    requestedDriverId: null,
    driverSubstituted: false,
    
    actualStartAt: null,
    actualEndAt: null,
    waitMinutes: 0,
    tollsCents: 0,
    parkingCents: 0,
    driverNotes: "",
    
    authorizedAmountCents: 0,
    capturedAmountCents: 0,
    
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    cancellationFeeCents: 0,
  };

  batch.set(reservationRef, reservationDoc);

  const eventRef = reservationRef.collection("statusEvents").doc();
  batch.set(eventRef, {
    from: null,
    to: "confirmed",
    actorId: request.auth?.uid || "",
    actorRole: "admin",
    at: FieldValue.serverTimestamp(),
    note: data.skipPayment ? "Booked manually by admin (payment skipped)" : "Booked manually by admin",
    location: null,
  });

  await batch.commit();

  return { reservationId: reservationRef.id, confirmationCode };
});
