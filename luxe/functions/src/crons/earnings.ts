import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { Reservation, Driver } from "../shared";

const db = getFirestore();

export interface DriverWeeklyEarningsSummary {
  payoutId: string;
  driverId: string;
  driverName: string;
  periodStart: string;
  periodEnd: string;
  completedTripsCount: number;
  grossFaresCents: number;
  driverShareFaresCents: number;
  tipsGratuityCents: number;
  tollsReimbursedCents: number;
  parkingReimbursedCents: number;
  netPayoutCents: number;
  payoutStatus: "pending_review" | "approved" | "disbursed";
  tripConfirmationCodes: string[];
  createdAt: any;
}

/**
 * calculateWeeklyDriverEarnings runs every Monday at 04:00 AM
 * to aggregate weekly driver payouts, 100% gratuity, and toll reconciliations.
 */
export const calculateWeeklyDriverEarnings = onSchedule("0 4 * * 1", async (event) => {
  const now = new Date();
  
  // Calculate previous week's date range (Monday to Sunday)
  const endOfPeriod = new Date(now);
  endOfPeriod.setUTCHours(0, 0, 0, 0);
  
  const startOfPeriod = new Date(endOfPeriod);
  startOfPeriod.setDate(startOfPeriod.getDate() - 7);

  console.log(`[earningsCron] Calculating weekly driver earnings for window: ${startOfPeriod.toISOString()} -> ${endOfPeriod.toISOString()}`);

  try {
    // 1. Fetch all completed trips within the period window
    const snap = await db.collection("reservations")
      .where("status", "==", "completed")
      .where("pickupAt", ">=", startOfPeriod)
      .where("pickupAt", "<=", endOfPeriod)
      .get();

    if (snap.empty) {
      console.log("[earningsCron] No completed trips found in period.");
      return;
    }

    // 2. Group by driverId
    const driverTripsMap = new Map<string, Reservation[]>();
    for (const doc of snap.docs) {
      const res = doc.data() as Reservation;
      if (!res.driverId) continue;

      const list = driverTripsMap.get(res.driverId) || [];
      list.push(res);
      driverTripsMap.set(res.driverId, list);
    }

    const batch = db.batch();

    // 3. Aggregate each driver's statement
    for (const [driverId, trips] of driverTripsMap.entries()) {
      let driverName = trips[0]?.driverName || "Chauffeur";
      
      const driverDoc = await db.collection("drivers").doc(driverId).get();
      if (driverDoc.exists) {
        const dData = driverDoc.data() as Driver;
        driverName = dData.displayName || driverName;
      }

      let grossFaresCents = 0;
      let driverShareFaresCents = 0;
      let tipsGratuityCents = 0;
      let tollsReimbursedCents = 0;
      let parkingReimbursedCents = 0;
      const tripCodes: string[] = [];

      for (const trip of trips) {
        tripCodes.push(trip.confirmationCode);

        const totalFare = trip.pricing?.estimatedTotalCents || trip.pricing?.subtotalCents || 0;
        const gratuity = trip.pricing?.gratuityCents || Math.round(totalFare * 0.20);
        const baseFare = Math.max(0, totalFare - gratuity);

        grossFaresCents += totalFare;
        // In-House Driver receives 70% of base fare split + 100% gratuity
        driverShareFaresCents += Math.round(baseFare * 0.70);
        tipsGratuityCents += gratuity;

        tollsReimbursedCents += trip.tollsCents || 0;
        parkingReimbursedCents += trip.parkingCents || 0;
      }

      const netPayoutCents = driverShareFaresCents + tipsGratuityCents + tollsReimbursedCents + parkingReimbursedCents;
      const periodStartStr = startOfPeriod.toISOString().split("T")[0];
      const payoutId = `payout_${driverId}_${periodStartStr}`;

      const payoutRef = db.collection("driverPayouts").doc(payoutId);
      const payoutData: DriverWeeklyEarningsSummary = {
        payoutId,
        driverId,
        driverName,
        periodStart: startOfPeriod.toISOString(),
        periodEnd: endOfPeriod.toISOString(),
        completedTripsCount: trips.length,
        grossFaresCents,
        driverShareFaresCents,
        tipsGratuityCents,
        tollsReimbursedCents,
        parkingReimbursedCents,
        netPayoutCents,
        payoutStatus: "pending_review",
        tripConfirmationCodes: tripCodes,
        createdAt: FieldValue.serverTimestamp(),
      };

      batch.set(payoutRef, payoutData);

      // Add Admin Notification for Joe
      const notifRef = db.collection("adminNotifications").doc();
      batch.set(notifRef, {
        title: `Weekly Payroll Statement Generated: ${driverName}`,
        message: `${driverName}: $${(netPayoutCents / 100).toFixed(2)} for ${trips.length} completed charters (${tripCodes.join(", ")}). Tolls: $${(tollsReimbursedCents / 100).toFixed(2)}.`,
        payoutId,
        type: "weekly_payroll",
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    console.log(`[earningsCron] Successfully compiled weekly statements for ${driverTripsMap.size} chauffeurs.`);
  } catch (error) {
    console.error("[earningsCron] Error calculating weekly earnings:", error);
  }
});
