import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";
import Stripe from "stripe";
import { Reservation } from "../shared";

const db = getFirestore();
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

/**
 * authorizeUpcomingTrips runs every hour to find confirmed/assigned trips 
 * that are within 24 hours of pickup but lack a PaymentIntent (because they 
 * were booked >6 days in advance and only have a SetupIntent/saved card).
 */
export const authorizeUpcomingTrips = onSchedule("0 * * * *", async (event) => {
  if (!stripe) {
    console.error("Stripe not configured. Cannot authorize upcoming trips.");
    return;
  }

  const now = new Date().getTime();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  const targetTime = new Date(now + twentyFourHoursMs);

  // Note: We can't query cleanly by "stripePaymentIntentId == null" and "pickupAt <= targetTime" 
  // without a composite index, so we'll query for upcoming trips and filter in memory since
  // the volume of upcoming trips in a 24h window is manageable.

  const upcomingSnap = await db.collection("reservations")
    .where("status", "in", ["confirmed", "assigned"])
    .where("pickupAt", "<=", targetTime.toISOString()) // we store pickupAt as ISO string per our types
    .get();

  for (const doc of upcomingSnap.docs) {
    const reservation = doc.data() as Reservation;
    
    // Skip if already authorized
    if (reservation.stripePaymentIntentId) continue;
    
    // We need the rider's stripeCustomerId
    const riderSnap = await db.collection("users").doc(reservation.riderId).get();
    const customerId = riderSnap.data()?.stripeCustomerId;

    if (!customerId) {
      console.error(`Reservation ${doc.id} missing Stripe Customer for rider ${reservation.riderId}`);
      continue;
    }

    try {
      // Find the default or first saved payment method
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      if (paymentMethods.data.length === 0) {
        console.error(`No saved payment methods for customer ${customerId}`);
        // Optionally flag the reservation for admin review
        continue;
      }

      const pm = paymentMethods.data[0];

      // Create PaymentIntent
      const intent = await stripe.paymentIntents.create({
        amount: reservation.pricing.estimatedTotalCents,
        currency: "usd",
        customer: customerId,
        payment_method: pm.id,
        off_session: true, // We are charging them in the background
        confirm: true,     // Confirm immediately
        capture_method: "manual", // Only authorize
        metadata: {
          reservationCode: reservation.confirmationCode,
          note: "Long-lead trip 24h authorization"
        }
      });

      // Update DB
      await db.collection("reservations").doc(doc.id).update({
        stripePaymentIntentId: intent.id,
        paymentStatus: "authorized",
        authorizedAmountCents: intent.amount_capturable || 0,
        updatedAt: new Date() as any
      });

      console.log(`Successfully authorized trip ${doc.id} for ${intent.amount_capturable} cents.`);
    } catch (e: any) {
      console.error(`Failed to authorize trip ${doc.id}:`, e.message);
      // Depending on business logic, we might transition status to 'failed' 
      // or send an email to the rider to update their card.
    }
  }
});
