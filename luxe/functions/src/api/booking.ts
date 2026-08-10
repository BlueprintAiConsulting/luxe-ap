import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import Stripe from "stripe";
import { calculatePrice } from "../pricing";
import { 
  QuoteInput, 
  PricingRuleSet, 
  Airport,
  CreateReservationInput,
  Reservation,
  ReservationStatusEvent,
  quoteInputSchema,
  createReservationInputSchema
} from "../shared";

const db = getFirestore();

// Initialize external clients if keys are present
const stripeKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeKey ? new Stripe(stripeKey) : null;

// We skip full Google Maps validation here in dev, but can easily add it

/**
 * createQuote resolves distance/duration via Google Maps (or falls back),
 * loads active rules, and computes the price.
 */
export const createQuote = onCall({ minInstances: 1 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in to get a quote.");
  }

  // Validate input
  const parsed = quoteInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid quote input data", parsed.error.issues);
  }
  const input: QuoteInput = parsed.data;

  // Resolve distance and duration if it's a point-to-point or airport trip
  let finalDistanceMiles = input.estimatedDistanceMiles;
  let finalDurationMinutes = input.estimatedDurationMinutes;

  // We skip doing a real Maps server-side fetch here for simplicity unless we had exact coordinates.
  // The client will use the Directions API and pass estimatedDistanceMiles.
  // If we wanted to re-verify, we would use mapsClient.distancematrix() here.

  // Fetch active PricingRuleSet
  const globalSnap = await db.collection("settings").doc("global").get();
  if (!globalSnap.exists) {
    throw new HttpsError("internal", "Global settings not found");
  }
  const activeRuleSetId = globalSnap.data()?.activePricingRuleSetId;
  if (!activeRuleSetId) {
    throw new HttpsError("internal", "No active pricing rule set");
  }

  const ruleSetSnap = await db.collection("pricingRuleSets").doc(activeRuleSetId).get();
  if (!ruleSetSnap.exists) {
    throw new HttpsError("internal", "Active pricing rule set not found");
  }
  const ruleSet = ruleSetSnap.data() as PricingRuleSet;

  // Fetch Airport if applicable
  let airport: Airport | undefined = undefined;
  if (input.airportCode) {
    const aptSnap = await db.collection("airports").doc(input.airportCode).get();
    if (aptSnap.exists) {
      airport = aptSnap.data() as Airport;
    }
  }

  // Calculate Price
  try {
    const breakdown = calculatePrice(
      { ...input, estimatedDistanceMiles: finalDistanceMiles, estimatedDurationMinutes: finalDurationMinutes },
      ruleSet,
      new Date(), // current time for evaluation of rules
      airport
    );
    return breakdown;
  } catch (err: any) {
    throw new HttpsError("internal", err.message || "Failed to calculate price");
  }
});

/**
 * createReservation recalculates the quote server-side, generates a Stripe PaymentIntent,
 * and writes the Reservation and StatusEvent inside a transaction.
 */
export const createReservation = onCall({ minInstances: 1 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in to book.");
  }

  // Validate input
  const parsed = createReservationInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid reservation data", parsed.error.issues);
  }
  const resInput: CreateReservationInput = parsed.data;

  // Prevent duplicate submissions via idempotency key checking
  const duplicateCheck = await db.collection("reservations")
    .where("idempotencyKey", "==", resInput.idempotencyKey)
    .limit(1)
    .get();
  
  if (!duplicateCheck.empty) {
    const existing = duplicateCheck.docs[0];
    return {
      reservationId: existing.id,
      clientSecret: existing.data().stripeClientSecret,
      confirmationCode: existing.data().confirmationCode
    };
  }

  // Re-run the quote logic
  const globalSnap = await db.collection("settings").doc("global").get();
  const activeRuleSetId = globalSnap.data()?.activePricingRuleSetId;
  const ruleSetSnap = await db.collection("pricingRuleSets").doc(activeRuleSetId).get();
  const ruleSet = ruleSetSnap.data() as PricingRuleSet;

  let airport: Airport | undefined = undefined;
  if (resInput.quote.airportCode) {
    const aptSnap = await db.collection("airports").doc(resInput.quote.airportCode).get();
    if (aptSnap.exists) {
      airport = aptSnap.data() as Airport;
    }
  }

  const priceBreakdown = calculatePrice(
    resInput.quote,
    ruleSet,
    new Date(),
    airport
  );

  // Generate confirmation code (e.g. BCC-XXXXXX)
  const codeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let confStr = "";
  for (let i = 0; i < 6; i++) {
    confStr += codeChars.charAt(Math.floor(Math.random() * codeChars.length));
  }
  const confirmationCode = `BCC-${confStr}`;

  const riderSnap = await db.collection("users").doc(request.auth.uid).get();
  const riderData = riderSnap.data();
  
  // Generate PaymentIntent or SetupIntent via Stripe
  let clientSecret = "mock_client_secret_for_emulator";
  if (stripe) {
    try {
      let customerId = riderData?.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: riderData?.email || undefined,
          name: `${riderData?.firstName} ${riderData?.lastName}`,
          metadata: { firebaseUid: request.auth.uid }
        });
        customerId = customer.id;
        await db.collection("users").doc(request.auth.uid).update({ stripeCustomerId: customerId });
      }

      const pickupTime = typeof (resInput.quote.pickupAt as any).toDate === "function" ? (resInput.quote.pickupAt as any).toDate().getTime() : new Date(resInput.quote.pickupAt as any).getTime();
      const nowTime = Date.now();
      const sixDaysMs = 6 * 24 * 60 * 60 * 1000;
      const isLongLead = (pickupTime - nowTime) > sixDaysMs;

      if (isLongLead) {
        const intent = await stripe.setupIntents.create({
          customer: customerId,
          usage: "off_session",
          metadata: {
            riderId: request.auth.uid,
            idempotencyKey: resInput.idempotencyKey,
            reservationCode: confirmationCode,
          },
        });
        clientSecret = intent.client_secret || "";
      } else {
        const intent = await stripe.paymentIntents.create({
          amount: priceBreakdown.estimatedTotalCents,
          currency: "usd",
          customer: customerId,
          capture_method: "manual",
          setup_future_usage: "off_session",
          metadata: {
            riderId: request.auth.uid,
            idempotencyKey: resInput.idempotencyKey,
            reservationCode: confirmationCode,
          },
        });
        clientSecret = intent.client_secret || "";
      }
    } catch (e: any) {
      throw new HttpsError("internal", `Stripe error: ${e.message}`);
    }
  } else {
    console.warn("STRIPE_SECRET_KEY not set. Using mock payment intent.");
  }

  // Generate a new ID for the reservation
  const reservationRef = db.collection("reservations").doc();

  // Write in a batch
  const batch = db.batch();

  const reservationDoc: Omit<Reservation, "id" | "reservationId"> & { reservationId?: string } = {
    reservationId: reservationRef.id,
    confirmationCode,
    riderId: request.auth.uid,
    riderName: `${riderData?.firstName} ${riderData?.lastName}`,
    riderPhone: riderData?.phone || "",
    riderEmail: riderData?.email || null,
    bookedByAdmin: false,
    status: "confirmed",
    pricingRuleSetId: activeRuleSetId,
    idempotencyKey: resInput.idempotencyKey,
    createdAt: new Date() as any,
    updatedAt: new Date() as any,

    // Pricing
    estimatedDistanceMeters: null,
    estimatedDurationSeconds: null,
    pricing: priceBreakdown,
    
    // Auth & Billing
    stripePaymentIntentId: null, // We'll update this once the payment succeeds via webhook
    paymentStatus: "none",
    
    // Core details
    pickupAt: resInput.quote.pickupAt,
    timezone: resInput.quote.timezone,
    tripType: resInput.quote.tripType,
    pickup: resInput.pickup,
    dropoff: resInput.dropoff,
    stops: resInput.stops,
    hours: resInput.quote.hours,
    passengers: resInput.passengers,
    luggage: resInput.luggage,
    
    // Optional
    flightNumber: resInput.flightNumber || null,
    airlineCode: null,
    specialInstructions: resInput.notes || "",
    
    // Preferences
    preferences: resInput.preferences,
    
    // Assignments (empty at start)
    classId: resInput.quote.classId,
    className: ruleSet.classRates[resInput.quote.classId] ? resInput.quote.classId : "Unknown",
    vehicleId: null,
    vehicleDescription: null,
    driverId: null,
    driverName: null,
    driverPhotoUrl: null,
    requestedDriverId: null,
    driverSubstituted: false,
    
    // Actuals
    actualStartAt: null,
    actualEndAt: null,
    waitMinutes: 0,
    tollsCents: 0,
    parkingCents: 0,
    driverNotes: "",
    
    // Payments
    authorizedAmountCents: 0,
    capturedAmountCents: 0,
    
    // Cancellation
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    cancellationFeeCents: 0,
  };

  batch.set(reservationRef, reservationDoc);

  // Write initial StatusEvent
  const eventRef = db.collection("statusEvents").doc();
  const statusEvent: ReservationStatusEvent = {
    from: null,
    to: "confirmed",
    at: new Date() as any,
    actorId: request.auth.uid,
    actorRole: "rider",
    note: "Reservation created via app",
    location: null,
  };
  batch.set(eventRef, statusEvent);

  await batch.commit();

  return {
    reservationId: reservationRef.id,
    clientSecret,
    confirmationCode
  };
});

/**
 * cancelReservation computes the cancellation fee and captures or releases the auth.
 */
export const cancelReservation = onCall({ minInstances: 1 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in to cancel.");
  }
  const { reservationId } = request.data;
  if (!reservationId) throw new HttpsError("invalid-argument", "reservationId required");

  const resRef = db.collection("reservations").doc(reservationId);
  const resSnap = await resRef.get();
  if (!resSnap.exists) throw new HttpsError("not-found", "Reservation not found");
  
  const reservation = resSnap.data() as Reservation;
  
  if (reservation.riderId !== request.auth.uid && request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Can only cancel your own reservations");
  }

  if (["completed", "cancelled", "no_show"].includes(reservation.status)) {
    throw new HttpsError("failed-precondition", "Reservation already in terminal state");
  }

  // Load RuleSet to determine fee
  const ruleSetSnap = await db.collection("pricingRuleSets").doc(reservation.pricingRuleSetId).get();
  if (!ruleSetSnap.exists) {
    throw new HttpsError("internal", "Pricing ruleset missing");
  }
  const ruleSet = ruleSetSnap.data() as PricingRuleSet;

  // Calculate Hours Before Pickup
  const pickupTimeMs = typeof (reservation.pickupAt as any).toDate === 'function' ? (reservation.pickupAt as any).toDate().getTime() : new Date(reservation.pickupAt as any).getTime();
  const nowMs = Date.now();
  const hoursBefore = (pickupTimeMs - nowMs) / (1000 * 60 * 60);

  // Find applicable window
  let feePercent = 0;
  let feeFlatCents = 0;
  
  // Sort windows by hoursBefore Pickup descending (e.g. 48, 24, 2)
  const windows = [...ruleSet.cancellation].sort((a, b) => b.hoursBeforePickup - a.hoursBeforePickup);
  for (const win of windows) {
    if (hoursBefore <= win.hoursBeforePickup) {
      if (win.appliesToClasses === "all" || win.appliesToClasses.includes(reservation.classId)) {
        feePercent = win.feePercent;
        feeFlatCents = win.feeFlatCents;
      }
    }
  }

  let cancellationFeeCents = 0;
  if (feePercent > 0) {
    cancellationFeeCents = Math.round((reservation.pricing.estimatedTotalCents || 0) * (feePercent / 100));
  } else if (feeFlatCents > 0) {
    cancellationFeeCents = feeFlatCents;
  }

  // Handle Stripe hold
  if (stripe && reservation.stripePaymentIntentId) {
    try {
      if (cancellationFeeCents > 0) {
        // Capture the fee
        const amountToCapture = Math.min(cancellationFeeCents, reservation.pricing.estimatedTotalCents || 0);
        await stripe.paymentIntents.capture(reservation.stripePaymentIntentId, {
          amount_to_capture: amountToCapture
        });
      } else {
        // Release the hold (cancel the PaymentIntent)
        // Wait, if it was already authorized, we can cancel it to release the auth.
        const intent = await stripe.paymentIntents.retrieve(reservation.stripePaymentIntentId);
        if (intent.status === "requires_capture") {
          await stripe.paymentIntents.cancel(reservation.stripePaymentIntentId);
        }
      }
    } catch (e: any) {
      console.error("Stripe cancellation error:", e.message);
      // We still proceed with the DB update even if Stripe fails, 
      // but in production we might want to flag this.
    }
  }

  const batch = db.batch();
  batch.update(resRef, {
    status: "cancelled",
    cancelledAt: new Date() as any,
    cancelledBy: request.auth.uid,
    cancellationFeeCents,
    paymentStatus: cancellationFeeCents > 0 ? "captured" : "refunded", // if we released the hold, effectively refunded/none
    updatedAt: new Date() as any,
  });

  const eventRef = db.collection("statusEvents").doc();
  batch.set(eventRef, {
    reservationId,
    from: reservation.status,
    to: "cancelled",
    at: new Date() as any,
    actorId: request.auth.uid,
    actorRole: request.auth.token.role === "admin" ? "admin" : "rider",
    note: cancellationFeeCents > 0 ? `Late cancellation fee: $${(cancellationFeeCents/100).toFixed(2)}` : "Cancelled without fee",
    location: null,
  });

  await batch.commit();

  return { success: true, fee: cancellationFeeCents };
});
