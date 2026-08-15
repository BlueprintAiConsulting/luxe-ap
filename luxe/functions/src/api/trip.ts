import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import Stripe from "stripe";
import { calculatePrice } from "../pricing";
import { Reservation, PricingRuleSet, Airport, ReservationStatusEvent, canTransition, ReservationStatus } from "../shared";

const db = getFirestore();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

function haversineDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Radius of Earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export const completeTrip = onCall({ minInstances: 1 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in to complete a trip.");
  }
  const { reservationId, waitMinutes = 0, tollsCents = 0, parkingCents = 0, gratuityCents } = request.data;
  if (!reservationId) throw new HttpsError("invalid-argument", "reservationId required");

  const resRef = db.collection("reservations").doc(reservationId);
  
  // We need to fetch the reservation, update pricing, and hit Stripe in a multi-step process
  // This isn't entirely possible inside a single Firestore transaction since we must call Stripe,
  // so we'll fetch, calculate, call Stripe, then update the DB.
  
  const resSnap = await resRef.get();
  if (!resSnap.exists) throw new HttpsError("not-found", "Reservation not found");
  const reservation = resSnap.data() as Reservation;

  // Only driver or admin can complete a trip
  if (reservation.driverId !== request.auth.uid && request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Unauthorized to complete this trip.");
  }

  if (reservation.status === "completed" || reservation.status === "cancelled") {
    throw new HttpsError("failed-precondition", "Trip is already in a terminal state.");
  }

  // Load active rule set
  const ruleSetSnap = await db.collection("pricingRuleSets").doc(reservation.pricingRuleSetId).get();
  if (!ruleSetSnap.exists) throw new HttpsError("internal", "Pricing rule set missing");
  const ruleSet = ruleSetSnap.data() as PricingRuleSet;

  // Load airport if applicable
  let airport: Airport | undefined = undefined;
  const airportCode = (reservation.pickup as any).airportCode || (reservation.dropoff as any)?.airportCode;
  if (airportCode) {
    const aptSnap = await db.collection("airports").doc(airportCode).get();
    if (aptSnap.exists) airport = aptSnap.data() as Airport;
  }

  // Re-run pricing with actuals
  let outOfAreaMiles = 0;
  try {
    const globalSnap = await db.collection("settings").doc("global").get();
    const serviceCenter = globalSnap.data()?.serviceCenter;
    const radius = ruleSet.surcharges?.outOfAreaRadiusMiles || 0;
    
    if (serviceCenter?.lat && serviceCenter?.lng && radius > 0) {
      let maxDist = 0;
      if (reservation.dropoff?.lat && reservation.dropoff?.lng) {
        maxDist = Math.max(maxDist, haversineDistanceMiles(serviceCenter.lat, serviceCenter.lng, reservation.dropoff.lat, reservation.dropoff.lng));
      }
      if (reservation.pickup?.lat && reservation.pickup?.lng) {
        maxDist = Math.max(maxDist, haversineDistanceMiles(serviceCenter.lat, serviceCenter.lng, reservation.pickup.lat, reservation.pickup.lng));
      }
      if (maxDist > radius) {
        outOfAreaMiles = maxDist - radius;
      }
    }
  } catch (e) {
    console.error("Failed to calculate out of area miles:", e);
  }

  const actualQuoteInput = {
    tripType: reservation.tripType,
    pickupAt: reservation.pickupAt as any,
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
    outOfAreaMiles,
  };

  const finalBreakdown = calculatePrice(
    // @ts-ignore mapping from db format back to quote input
    actualQuoteInput,
    ruleSet,
    typeof (reservation.pickupAt as any).toDate === "function" ? (reservation.pickupAt as any).toDate() : new Date(reservation.pickupAt as any),
    airport
  );
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
        } else {
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
              customer: intent.customer as string,
              payment_method: intent.payment_method as string,
              off_session: true,
              confirm: true,
              receipt_email: intent.receipt_email || undefined,
              metadata: {
                reservationCode: reservation.confirmationCode,
                note: "Secondary capture for trip actuals (tolls/wait/tip)"
              }
            });
          } else {
            console.warn("Could not create secondary capture: missing customer or payment_method");
          }
        }
      }
    } catch (e: any) {
      console.error("Stripe capture error:", e.message);
      // We log but still try to update the reservation in DB to reflect completion.
    }
  } else if (stripe && reservation.billedToCorporate && reservation.corporateAccountId) {
    try {
      const corpSnap = await db.collection("corporate_accounts").doc(reservation.corporateAccountId).get();
      if (corpSnap.exists) {
        const corpData = corpSnap.data();
        let customerId = corpData?.stripeCustomerId;
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: corpData?.email || undefined,
            name: corpData?.companyName || "Corporate Account",
            metadata: { corporateAccountId: reservation.corporateAccountId }
          });
          customerId = customer.id;
          await corpSnap.ref.update({ stripeCustomerId: customerId });
        }
        
        // Create an Invoice Item
        await stripe.invoiceItems.create({
          customer: customerId,
          amount: finalAmount,
          currency: "usd",
          description: `Trip ${reservation.confirmationCode} (${reservation.pickup.line1} to ${reservation.dropoff?.line1 || 'Directed'})`,
        });

        // Create the Invoice
        const invoice = await stripe.invoices.create({
          customer: customerId,
          auto_advance: true,
          metadata: {
            reservationCode: reservation.confirmationCode,
          }
        });

        // Finalize the Invoice
        if (invoice.id) {
          await stripe.invoices.finalizeInvoice(invoice.id);
        }
      }
    } catch (e: any) {
      console.error("Stripe corporate invoicing error:", e.message);
    }
  }

  const batch = db.batch();

  batch.update(resRef, {
    status: "completed",
    actualEndAt: FieldValue.serverTimestamp() as any,
    pricing: finalBreakdown,
    waitMinutes,
    tollsCents,
    parkingCents,
    updatedAt: FieldValue.serverTimestamp() as any,
  });

  const eventRef = resRef.collection("statusEvents").doc();
  const statusEvent: ReservationStatusEvent = {
    from: reservation.status,
    to: "completed",
    at: FieldValue.serverTimestamp() as any,
    actorId: request.auth.uid,
    actorRole: request.auth.token.role === "admin" ? "admin" : "driver",
    note: "Trip completed",
    location: null,
  };
  batch.set(eventRef, statusEvent);

  await batch.commit();
  return { success: true, finalAmountCents: finalAmount };
});

export const updateTripStatus = onCall({ minInstances: 1 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");
  
  const { reservationId, status, location } = request.data;
  if (!reservationId || !status) throw new HttpsError("invalid-argument", "Missing required fields");

  const resRef = db.collection("reservations").doc(reservationId);
  
  return db.runTransaction(async (t) => {
    const snap = await t.get(resRef);
    if (!snap.exists) throw new HttpsError("not-found", "Reservation not found");
    const reservation = snap.data() as Reservation;

    if (reservation.driverId !== request.auth!.uid && request.auth!.token.role !== "admin") {
      throw new HttpsError("permission-denied", "Not authorized to update this trip.");
    }

    if (!canTransition(reservation.status, status as ReservationStatus, request.auth!.token.role === "admin" ? "admin" : "driver")) {
      throw new HttpsError("failed-precondition", `Cannot transition from ${reservation.status} to ${status}`);
    }

    const updates: any = {
      status,
      updatedAt: FieldValue.serverTimestamp() as any
    };

    if (status === "en_route" && !reservation.actualStartAt) {
      updates.actualStartAt = FieldValue.serverTimestamp() as any;
    }

    t.update(resRef, updates);

    const eventRef = resRef.collection("statusEvents").doc();
    const event: ReservationStatusEvent = {
      from: reservation.status,
      to: status,
      actorId: request.auth!.uid,
      actorRole: request.auth!.token.role === "admin" ? "admin" : "driver",
      at: FieldValue.serverTimestamp() as any,
      note: null,
      location: location || null
    };
    t.set(eventRef, event);

    return { success: true };
  });
});

export const updateTripChecklist = onCall({ minInstances: 1 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");
  
  const { reservationId, key, checked } = request.data;
  if (!reservationId || !key || typeof checked !== "boolean") {
    throw new HttpsError("invalid-argument", "Missing or invalid fields");
  }

  const resRef = db.collection("reservations").doc(reservationId);
  const snap = await resRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Reservation not found");
  
  const reservation = snap.data() as Reservation;
  if (reservation.driverId !== request.auth.uid && request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Not authorized to update this trip.");
  }

  await resRef.update({
    [`prepChecklistState.${key}`]: checked,
    updatedAt: FieldValue.serverTimestamp() as any
  });

  return { success: true };
});
