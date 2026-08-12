"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelReservation = exports.createReservation = exports.createQuote = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const stripe_1 = __importDefault(require("stripe"));
const google_maps_services_js_1 = require("@googlemaps/google-maps-services-js");
const pricing_1 = require("../pricing");
const shared_1 = require("../shared");
const db = (0, firestore_1.getFirestore)();
// Initialize external clients if keys are present
const stripeKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeKey ? new stripe_1.default(stripeKey) : null;
const mapsClient = new google_maps_services_js_1.Client({});
const MAPS_KEY = process.env.GOOGLE_MAPS_SERVER_KEY || "";
async function resolveDistance(pickup, dropoff) {
    if (!MAPS_KEY)
        return null; // fall back to client value if key missing
    try {
        const res = await mapsClient.distancematrix({
            params: {
                origins: [{ lat: pickup.lat, lng: pickup.lng }],
                destinations: [{ lat: dropoff.lat, lng: dropoff.lng }],
                key: MAPS_KEY,
            },
        });
        const el = res.data.rows?.[0]?.elements?.[0];
        if (el?.status === "OK") {
            return {
                miles: el.distance.value * 0.000621371,
                minutes: Math.round(el.duration.value / 60),
            };
        }
    }
    catch (e) {
        console.error("Distance Matrix failed, falling back to client value:", e);
    }
    return null;
}
/**
 * createQuote resolves distance/duration via Google Maps (or falls back),
 * loads active rules, and computes the price.
 */
exports.createQuote = (0, https_1.onCall)({ minInstances: 1 }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Must be logged in to get a quote.");
    }
    // Validate input
    const parsed = shared_1.quoteInputSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid quote input data", parsed.error.issues);
    }
    const input = parsed.data;
    // Resolve distance and duration if it's a point-to-point or airport trip
    let finalDistanceMiles = input.estimatedDistanceMiles;
    let finalDurationMinutes = input.estimatedDurationMinutes;
    const rawData = request.data;
    if (input.tripType !== "hourly" && rawData.pickup?.lat && rawData.dropoff?.lat) {
        const resolved = await resolveDistance(rawData.pickup, rawData.dropoff);
        if (resolved) {
            finalDistanceMiles = resolved.miles;
            finalDurationMinutes = resolved.minutes;
        }
    }
    // Fetch active PricingRuleSet
    const globalSnap = await db.collection("settings").doc("global").get();
    if (!globalSnap.exists) {
        throw new https_1.HttpsError("internal", "Global settings not found");
    }
    const activeRuleSetId = globalSnap.data()?.activePricingRuleSetId;
    if (!activeRuleSetId) {
        throw new https_1.HttpsError("internal", "No active pricing rule set");
    }
    const ruleSetSnap = await db.collection("pricingRuleSets").doc(activeRuleSetId).get();
    if (!ruleSetSnap.exists) {
        throw new https_1.HttpsError("internal", "Active pricing rule set not found");
    }
    const ruleSet = ruleSetSnap.data();
    // Fetch Airport if applicable
    let airport = undefined;
    if (input.airportCode) {
        const aptSnap = await db.collection("airports").doc(input.airportCode).get();
        if (aptSnap.exists) {
            airport = aptSnap.data();
        }
    }
    // Calculate Price
    try {
        const breakdown = (0, pricing_1.calculatePrice)({ ...input, estimatedDistanceMiles: finalDistanceMiles, estimatedDurationMinutes: finalDurationMinutes }, ruleSet, new Date(), // current time for evaluation of rules
        airport);
        return breakdown;
    }
    catch (err) {
        throw new https_1.HttpsError("internal", err.message || "Failed to calculate price");
    }
});
/**
 * createReservation recalculates the quote server-side, generates a Stripe PaymentIntent,
 * and writes the Reservation and StatusEvent inside a transaction.
 */
exports.createReservation = (0, https_1.onCall)({ minInstances: 1 }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Must be logged in to book.");
    }
    // Validate input
    const parsed = shared_1.createReservationInputSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid reservation data", parsed.error.issues);
    }
    const resInput = parsed.data;
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
    const ruleSet = ruleSetSnap.data();
    let airport = undefined;
    if (resInput.quote.airportCode) {
        const aptSnap = await db.collection("airports").doc(resInput.quote.airportCode).get();
        if (aptSnap.exists) {
            airport = aptSnap.data();
        }
    }
    let finalDistanceMiles = resInput.quote.estimatedDistanceMiles;
    let finalDurationMinutes = resInput.quote.estimatedDurationMinutes;
    if (resInput.quote.tripType !== "hourly" && resInput.pickup?.lat && resInput.dropoff?.lat) {
        const resolved = await resolveDistance(resInput.pickup, resInput.dropoff);
        if (resolved) {
            finalDistanceMiles = resolved.miles;
            finalDurationMinutes = resolved.minutes;
        }
    }
    const priceBreakdown = (0, pricing_1.calculatePrice)({ ...resInput.quote, estimatedDistanceMiles: finalDistanceMiles, estimatedDurationMinutes: finalDurationMinutes }, ruleSet, new Date(), airport);
    // Generate confirmation code (e.g. BCC-XXXXXX)
    const codeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let confStr = "";
    for (let i = 0; i < 6; i++) {
        confStr += codeChars.charAt(Math.floor(Math.random() * codeChars.length));
    }
    const confirmationCode = `BCC-${confStr}`;
    const riderSnap = await db.collection("users").doc(request.auth.uid).get();
    const riderData = riderSnap.data();
    // Check for Corporate Promo Code
    let corporateAccountId = null;
    let billedToCorporate = false;
    if (resInput.promoCode) {
        const corpCheck = await db.collection("corporate_accounts")
            .where("promoCode", "==", resInput.promoCode)
            .where("active", "==", true)
            .limit(1)
            .get();
        if (!corpCheck.empty) {
            corporateAccountId = corpCheck.docs[0].id;
            billedToCorporate = true;
        }
    }
    // Generate PaymentIntent or SetupIntent via Stripe
    let clientSecret = "mock_client_secret_for_emulator";
    if (stripe && !billedToCorporate) {
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
            const pickupTime = typeof resInput.quote.pickupAt.toDate === "function" ? resInput.quote.pickupAt.toDate().getTime() : new Date(resInput.quote.pickupAt).getTime();
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
            }
            else {
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
        }
        catch (e) {
            throw new https_1.HttpsError("internal", `Stripe error: ${e.message}`);
        }
    }
    else if (!stripe) {
        console.warn("STRIPE_SECRET_KEY not set. Using mock payment intent.");
    }
    // Generate a new ID for the reservation
    const reservationRef = db.collection("reservations").doc();
    // Write in a batch
    const batch = db.batch();
    const reservationDoc = {
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
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        // Pricing
        estimatedDistanceMeters: null,
        estimatedDurationSeconds: null,
        pricing: priceBreakdown,
        // Auth & Billing
        stripePaymentIntentId: null, // We'll update this once the payment succeeds via webhook
        corporateAccountId,
        billedToCorporate,
        paymentStatus: billedToCorporate ? "authorized" : "none",
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
        className: ruleSet.classRates[resInput.quote.classId]?.name || resInput.quote.classId,
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
    const eventRef = reservationRef.collection("statusEvents").doc();
    const statusEvent = {
        from: null,
        to: "confirmed",
        at: firestore_1.FieldValue.serverTimestamp(),
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
exports.cancelReservation = (0, https_1.onCall)({ minInstances: 1 }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Must be logged in to cancel.");
    }
    const { reservationId } = request.data;
    if (!reservationId)
        throw new https_1.HttpsError("invalid-argument", "reservationId required");
    const resRef = db.collection("reservations").doc(reservationId);
    const resSnap = await resRef.get();
    if (!resSnap.exists)
        throw new https_1.HttpsError("not-found", "Reservation not found");
    const reservation = resSnap.data();
    if (reservation.riderId !== request.auth.uid && request.auth.token.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Can only cancel your own reservations");
    }
    if (["completed", "cancelled", "no_show"].includes(reservation.status)) {
        throw new https_1.HttpsError("failed-precondition", "Reservation already in terminal state");
    }
    // Load RuleSet to determine fee
    const ruleSetSnap = await db.collection("pricingRuleSets").doc(reservation.pricingRuleSetId).get();
    if (!ruleSetSnap.exists) {
        throw new https_1.HttpsError("internal", "Pricing ruleset missing");
    }
    const ruleSet = ruleSetSnap.data();
    const cancellationFeeCents = (0, pricing_1.calculateCancellationFee)(reservation.pickupAt, new Date(), // cancelAt = now
    reservation.classId, ruleSet, reservation.pricing.estimatedTotalCents || 0);
    // Handle Stripe hold
    if (stripe && reservation.stripePaymentIntentId) {
        try {
            if (cancellationFeeCents > 0) {
                // Capture the fee
                const amountToCapture = Math.min(cancellationFeeCents, reservation.pricing.estimatedTotalCents || 0);
                await stripe.paymentIntents.capture(reservation.stripePaymentIntentId, {
                    amount_to_capture: amountToCapture
                });
            }
            else {
                // Release the hold (cancel the PaymentIntent)
                // Wait, if it was already authorized, we can cancel it to release the auth.
                const intent = await stripe.paymentIntents.retrieve(reservation.stripePaymentIntentId);
                if (intent.status === "requires_capture") {
                    await stripe.paymentIntents.cancel(reservation.stripePaymentIntentId);
                }
            }
        }
        catch (e) {
            console.error("Stripe cancellation error:", e.message);
            // We still proceed with the DB update even if Stripe fails, 
            // but in production we might want to flag this.
        }
    }
    const batch = db.batch();
    batch.update(resRef, {
        status: "cancelled",
        cancelledAt: firestore_1.FieldValue.serverTimestamp(),
        cancelledBy: request.auth.uid,
        cancellationFeeCents,
        paymentStatus: cancellationFeeCents > 0 ? "captured" : "refunded", // if we released the hold, effectively refunded/none
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    const eventRef = resRef.collection("statusEvents").doc();
    batch.set(eventRef, {
        reservationId,
        from: reservation.status,
        to: "cancelled",
        at: firestore_1.FieldValue.serverTimestamp(),
        actorId: request.auth.uid,
        actorRole: request.auth.token.role === "admin" ? "admin" : "rider",
        note: cancellationFeeCents > 0 ? `Late cancellation fee: $${(cancellationFeeCents / 100).toFixed(2)}` : "Cancelled without fee",
        location: null,
    });
    await batch.commit();
    return { success: true, fee: cancellationFeeCents };
});
//# sourceMappingURL=booking.js.map