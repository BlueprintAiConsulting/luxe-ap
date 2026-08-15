"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncUpcomingAirportFlights = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const flightTracker_1 = require("../services/flightTracker");
const db = (0, firestore_1.getFirestore)();
/**
 * syncUpcomingAirportFlights runs every 15 minutes to automatically poll
 * flight status for active airport arrival reservations in the next 6 hours.
 */
exports.syncUpcomingAirportFlights = (0, scheduler_1.onSchedule)("*/15 * * * *", async (event) => {
    const now = new Date();
    const sixHoursAhead = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    console.log(`[flightSync] Polling upcoming airport arrivals between ${now.toISOString()} and ${sixHoursAhead.toISOString()}`);
    try {
        const snap = await db.collection("reservations")
            .where("tripType", "==", "airport_arrival")
            .where("status", "in", ["confirmed", "assigned"])
            .get();
        for (const doc of snap.docs) {
            const reservation = doc.data();
            if (!reservation.flightNumber)
                continue;
            const pTime = reservation.pickupAt;
            const pickupDate = typeof pTime?.toDate === "function" ? pTime.toDate() : new Date(pTime);
            // Only check if within 6 hours of pickup window
            if (pickupDate.getTime() > sixHoursAhead.getTime())
                continue;
            try {
                const flightStatus = await (0, flightTracker_1.getFlightStatus)(reservation.flightNumber, pickupDate);
                const updateData = {
                    flightStatus,
                    updatedAt: new Date(),
                };
                // If delay is significant and different from last recorded, log notice
                if (flightStatus.delayMinutes >= 15 && (!reservation.flightStatus || reservation.flightStatus.delayMinutes !== flightStatus.delayMinutes)) {
                    console.log(`[flightSync] Flight ${reservation.flightNumber} on reservation ${reservation.confirmationCode} delayed by ${flightStatus.delayMinutes} mins.`);
                    const estTimeStr = flightStatus.estimatedArrival ? (typeof flightStatus.estimatedArrival === "string" ? new Date(flightStatus.estimatedArrival).toLocaleTimeString() : "Updated") : "N/A";
                    await db.collection("adminNotifications").add({
                        title: `Flight Delay Detected: ${reservation.flightNumber}`,
                        message: `Reservation ${reservation.confirmationCode} (${reservation.riderName}) flight delayed by +${flightStatus.delayMinutes}m. Estimated arrival: ${estTimeStr}`,
                        reservationId: reservation.reservationId,
                        type: "flight_delay",
                        read: false,
                        createdAt: new Date(),
                    });
                }
                await doc.ref.update(updateData);
            }
            catch (err) {
                console.warn(`[flightSync] Failed status check for reservation ${doc.id} (${reservation.flightNumber}):`, err.message);
            }
        }
    }
    catch (error) {
        console.error("[flightSync] Error querying airport reservations:", error);
    }
});
//# sourceMappingURL=flightSync.js.map