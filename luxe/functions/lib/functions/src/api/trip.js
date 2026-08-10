"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTripChecklist = exports.updateTripStatus = exports.completeTrip = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const stripe_1 = __importDefault(require("stripe"));
const pricing_1 = require("../pricing");
const shared_1 = require("../shared");
const db = (0, firestore_1.getFirestore)();
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeSecretKey ? new stripe_1.default(stripeSecretKey) : null;
exports.completeTrip = (0, https_1.onCall)({ minInstances: 1 }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Must be logged in to complete a trip.");
    }
    const { reservationId, waitMinutes = 0, tollsCents = 0, parkingCents = 0, gratuityCents } = request.data;
    if (!reservationId)
        throw new https_1.HttpsError("invalid-argument", "reservationId required");
    const resRef = db.collection("reservations").doc(reservationId);
    // We need to fetch the reservation, update pricing, and hit Stripe in a multi-step process
    // This isn't entirely possible inside a single Firestore transaction since we must call Stripe,
    // so we'll fetch, calculate, call Stripe, then update the DB.
    const resSnap = await resRef.get();
    if (!resSnap.exists)
        throw new https_1.HttpsError("not-found", "Reservation not found");
    const reservation = resSnap.data();
    // Only driver or admin can complete a trip
    if (reservation.driverId !== request.auth.uid && request.auth.token.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Unauthorized to complete this trip.");
    }
    if (reservation.status === "completed" || reservation.status === "cancelled") {
        throw new https_1.HttpsError("failed-precondition", "Trip is already in a terminal state.");
    }
    // Load active rule set
    const ruleSetSnap = await db.collection("pricingRuleSets").doc(reservation.pricingRuleSetId).get();
    if (!ruleSetSnap.exists)
        throw new https_1.HttpsError("internal", "Pricing rule set missing");
    const ruleSet = ruleSetSnap.data();
    // Load airport if applicable
    let airport = undefined;
    const airportCode = reservation.pickup.airportCode || reservation.dropoff?.airportCode;
    if (airportCode) {
        const aptSnap = await db.collection("airports").doc(airportCode).get();
        if (aptSnap.exists)
            airport = aptSnap.data();
    }
    // Re-run pricing with actuals
    const actualQuoteInput = {
        tripType: reservation.tripType,
        pickupAt: reservation.pickupAt,
        timezone: reservation.timezone,
        classId: reservation.classId,
        estimatedDistanceMiles: reservation.estimatedDistanceMeters ? reservation.estimatedDistanceMeters * 0.000621371 : 0,
        estimatedDurationMinutes: reservation.estimatedDurationSeconds ? Math.round(reservation.estimatedDurationSeconds / 60) : 0,
        airportCode: airportCode || undefined,
        hours: reservation.hours || undefined,
        greetingStyle: reservation.preferences?.greeting?.style === "meet_inside" ? "meet_inside" : "curbside",
        waitMinutes,
        tollsCents,
        parkingCents,
        extraStopCount: reservation.stops?.length || 0,
        childSeatCount: reservation.preferences?.childSeats?.reduce((sum, item) => sum + item.count, 0) || 0,
        outOfAreaMiles: 0, // In full implementation, calculate this actual
    };
    const finalBreakdown = (0, pricing_1.calculatePrice)(
    // @ts-ignore mapping from db format back to quote input
    actualQuoteInput, ruleSet, typeof reservation.pickupAt.toDate === "function" ? reservation.pickupAt.toDate() : new Date(reservation.pickupAt), airport);
    // If a manual gratuity was provided, add it
    if (gratuityCents) {
        finalBreakdown.lineItems.push({
            code: "gratuity_manual",
            label: "Gratuity",
            amountCents: gratuityCents,
            detail: null
        });
        finalBreakdown.estimatedTotalCents += gratuityCents;
    }
    const finalAmount = finalBreakdown.estimatedTotalCents;
    const authorizedAmount = reservation.authorizedAmountCents || 0;
    // Handle Stripe dual-capture logic if needed
    if (stripe && reservation.stripePaymentIntentId) {
        try {
            const intent = await stripe.paymentIntents.retrieve(reservation.stripePaymentIntentId);
            if (intent.status === "requires_capture") {
                if (finalAmount <= authorizedAmount) {
                    // Can capture directly
                    await stripe.paymentIntents.capture(reservation.stripePaymentIntentId, {
                        amount_to_capture: finalAmount
                    });
                }
                else {
                    // Final > Authorized
                    // Capture the auth amount
                    await stripe.paymentIntents.capture(reservation.stripePaymentIntentId, {
                        amount_to_capture: authorizedAmount
                    });
                    // Create a new PaymentIntent for the remainder using the customer's payment method
                    if (intent.customer && intent.payment_method) {
                        const difference = finalAmount - authorizedAmount;
                        await stripe.paymentIntents.create({
                            amount: difference,
                            currency: "usd",
                            customer: intent.customer,
                            payment_method: intent.payment_method,
                            off_session: true,
                            confirm: true,
                            metadata: {
                                reservationCode: reservation.confirmationCode,
                                note: "Secondary capture for trip actuals (tolls/wait/tip)"
                            }
                        });
                    }
                    else {
                        console.warn("Could not create secondary capture: missing customer or payment_method");
                    }
                }
            }
        }
        catch (e) {
            console.error("Stripe capture error:", e.message);
            // We log but still try to update the reservation in DB to reflect completion.
        }
    }
    const batch = db.batch();
    batch.update(resRef, {
        status: "completed",
        actualEndAt: new Date(),
        pricing: finalBreakdown,
        waitMinutes,
        tollsCents,
        parkingCents,
        updatedAt: new Date(),
    });
    const eventRef = db.collection("statusEvents").doc();
    const statusEvent = {
        from: reservation.status,
        to: "completed",
        at: new Date(),
        actorId: request.auth.uid,
        actorRole: request.auth.token.role === "admin" ? "admin" : "driver",
        note: "Trip completed",
        location: null,
    };
    batch.set(eventRef, statusEvent);
    await batch.commit();
    return { success: true, finalAmountCents: finalAmount };
});
exports.updateTripStatus = (0, https_1.onCall)({ minInstances: 1 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in.");
    const { reservationId, status, location } = request.data;
    if (!reservationId || !status)
        throw new https_1.HttpsError("invalid-argument", "Missing required fields");
    const resRef = db.collection("reservations").doc(reservationId);
    return db.runTransaction(async (t) => {
        const snap = await t.get(resRef);
        if (!snap.exists)
            throw new https_1.HttpsError("not-found", "Reservation not found");
        const reservation = snap.data();
        if (reservation.driverId !== request.auth.uid && request.auth.token.role !== "admin") {
            throw new https_1.HttpsError("permission-denied", "Not authorized to update this trip.");
        }
        if (!(0, shared_1.canTransition)(reservation.status, status, request.auth.token.role === "admin" ? "admin" : "driver")) {
            throw new https_1.HttpsError("failed-precondition", `Cannot transition from ${reservation.status} to ${status}`);
        }
        const updates = {
            status,
            updatedAt: new Date()
        };
        if (status === "en_route" && !reservation.actualStartAt) {
            updates.actualStartAt = new Date();
        }
        t.update(resRef, updates);
        const eventRef = db.collection("statusEvents").doc();
        const event = {
            from: reservation.status,
            to: status,
            actorId: request.auth.uid,
            actorRole: request.auth.token.role === "admin" ? "admin" : "driver",
            at: new Date(),
            note: null,
            location: location || null
        };
        t.set(eventRef, event);
        return { success: true };
    });
});
exports.updateTripChecklist = (0, https_1.onCall)({ minInstances: 1 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in.");
    const { reservationId, key, checked } = request.data;
    if (!reservationId || !key || typeof checked !== "boolean") {
        throw new https_1.HttpsError("invalid-argument", "Missing or invalid fields");
    }
    const resRef = db.collection("reservations").doc(reservationId);
    const snap = await resRef.get();
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "Reservation not found");
    const reservation = snap.data();
    if (reservation.driverId !== request.auth.uid && request.auth.token.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Not authorized to update this trip.");
    }
    await resRef.update({
        [`prepChecklistState.${key}`]: checked,
        updatedAt: new Date()
    });
    return { success: true };
});
//# sourceMappingURL=trip.js.map