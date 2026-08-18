"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPreTripStagingAlerts = void 0;
exports.getStagingAlertWindows = getStagingAlertWindows;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)();
/**
 * calculateWindowBounds returns min and max millisecond timestamps for checking upcoming trips.
 */
function getStagingAlertWindows(nowMs) {
    return {
        // 60-min alert window: between 45 and 75 minutes from now
        driver60MinStart: nowMs + 45 * 60 * 1000,
        driver60MinEnd: nowMs + 75 * 60 * 1000,
        // 15-min alert window: between 0 and 20 minutes from now
        rider15MinStart: nowMs,
        rider15MinEnd: nowMs + 20 * 60 * 1000,
    };
}
/**
 * processPreTripStagingAlerts runs every 5 minutes to trigger autonomous
 * 60-minute chauffeur staging reminders and 15-minute passenger arrival notifications.
 */
exports.processPreTripStagingAlerts = (0, scheduler_1.onSchedule)("*/5 * * * *", async (event) => {
    const now = new Date();
    const nowMs = now.getTime();
    const ninetyMinsAhead = new Date(nowMs + 90 * 60 * 1000);
    console.log(`[preTripStaging] Scanning upcoming charters between ${now.toISOString()} and ${ninetyMinsAhead.toISOString()}`);
    try {
        // Query active upcoming reservations
        const snap = await db.collection("reservations")
            .where("status", "in", ["confirmed", "assigned"])
            .where("pickupAt", ">=", now)
            .where("pickupAt", "<=", ninetyMinsAhead)
            .get();
        if (snap.empty) {
            console.log("[preTripStaging] No upcoming charters in the next 90 minutes.");
            return;
        }
        const { driver60MinStart, driver60MinEnd, rider15MinStart, rider15MinEnd } = getStagingAlertWindows(nowMs);
        for (const doc of snap.docs) {
            const res = doc.data();
            const resRef = doc.ref;
            const pTime = res.pickupAt;
            const pickupDate = typeof pTime?.toDate === "function" ? pTime.toDate() : new Date(pTime);
            const pickupMs = pickupDate.getTime();
            const pickupTimeStr = pickupDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
            const pickupAddressStr = res.pickup?.formatted || res.pickup?.line1 || "Pickup Location";
            const reminders = res.remindersSent || {};
            const batch = db.batch();
            let hasUpdates = false;
            // 1. 60-Minute Chauffeur Readiness Reminder
            if (pickupMs >= driver60MinStart &&
                pickupMs <= driver60MinEnd &&
                !reminders.driver60Min &&
                res.driverId) {
                console.log(`[preTripStaging] Sending 60-min Chauffeur Reminder for #${res.confirmationCode} to ${res.driverName}`);
                // Driver Notification
                const driverNotifRef = db.collection("driverNotifications").doc();
                batch.set(driverNotifRef, {
                    driverId: res.driverId,
                    title: `Upcoming Charter in 60 Mins (#${res.confirmationCode})`,
                    message: `Pickup for ${res.riderName} at ${pickupTimeStr} (${pickupAddressStr}). Vehicle: ${res.vehicleDescription || "Assigned Fleet"}.`,
                    reservationId: res.reservationId,
                    type: "pre_trip_60min",
                    read: false,
                    createdAt: firestore_1.FieldValue.serverTimestamp(),
                });
                // 3-Way Concierge Chat System Message
                const chatRef = resRef.collection("messages").doc();
                batch.set(chatRef, {
                    senderId: "system_dispatch",
                    senderName: "LUXE Dispatch",
                    senderRole: "system",
                    content: `⏰ 60-Minute Pre-Trip Notice: Chauffeur ${res.driverName || "assigned chauffeur"} alerted to begin vehicle prep & pre-trip inspection.`,
                    createdAt: firestore_1.FieldValue.serverTimestamp(),
                    readBy: [],
                });
                reminders.driver60Min = true;
                reminders.driver60MinSentAt = firestore_1.FieldValue.serverTimestamp();
                hasUpdates = true;
            }
            // 2. 15-Minute Passenger Staging Alert
            if (pickupMs >= rider15MinStart &&
                pickupMs <= rider15MinEnd &&
                !reminders.rider15Min) {
                console.log(`[preTripStaging] Sending 15-min Staging Alert for #${res.confirmationCode} to ${res.riderName}`);
                // Passenger Notification
                const riderNotifRef = db.collection("userNotifications").doc();
                batch.set(riderNotifRef, {
                    userId: res.riderId,
                    title: `Chauffeur Staged & On-Site (#${res.confirmationCode})`,
                    message: `Your chauffeur ${res.driverName || "Marcus Bennett"} is staged in a ${res.vehicleDescription || "Luxury Vehicle"} at ${pickupAddressStr}.`,
                    reservationId: res.reservationId,
                    type: "staging_15min",
                    read: false,
                    createdAt: firestore_1.FieldValue.serverTimestamp(),
                });
                // 3-Way Concierge Chat System Message
                const chatRef = resRef.collection("messages").doc();
                batch.set(chatRef, {
                    senderId: "system_concierge",
                    senderName: "LUXE Concierge",
                    senderRole: "system",
                    content: `🎩 Chauffeur Staging Notice: ${res.driverName || "Marcus Bennett"} has arrived at the pickup location and is staged for your charter. Tap to contact or view live GPS.`,
                    createdAt: firestore_1.FieldValue.serverTimestamp(),
                    readBy: [],
                });
                // Status Event Audit Log
                const eventRef = resRef.collection("statusEvents").doc();
                const statusEvent = {
                    from: res.status,
                    to: res.status,
                    at: firestore_1.FieldValue.serverTimestamp(),
                    actorId: "system_pre_trip_staging",
                    actorRole: "system",
                    note: `Pre-trip staging notification dispatched to passenger (${pickupTimeStr} pickup window).`,
                    location: null,
                };
                batch.set(eventRef, statusEvent);
                reminders.rider15Min = true;
                reminders.rider15MinSentAt = firestore_1.FieldValue.serverTimestamp();
                hasUpdates = true;
            }
            if (hasUpdates) {
                batch.update(resRef, {
                    remindersSent: reminders,
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                });
                await batch.commit();
            }
        }
    }
    catch (error) {
        console.error("[preTripStaging] Error processing pre-trip staging alerts:", error);
    }
});
//# sourceMappingURL=preTripStaging.js.map