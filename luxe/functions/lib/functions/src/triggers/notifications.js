"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUpcomingReservations = exports.onReservationWritten = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin_1 = require("../lib/admin");
const adminDb = admin_1.admin.firestore();
const sender_1 = require("../lib/notifications/sender");
const templates_1 = require("../lib/notifications/templates");
async function getTemplateData(reservation) {
    let rider;
    let driver;
    let vehicle;
    if (reservation.riderId) {
        const rDoc = await adminDb.collection("users").doc(reservation.riderId).get();
        if (rDoc.exists)
            rider = rDoc.data();
    }
    if (reservation.driverId) {
        const dDoc = await adminDb.collection("users").doc(reservation.driverId).get();
        if (dDoc.exists)
            driver = dDoc.data();
    }
    if (reservation.vehicleId) {
        const vDoc = await adminDb.collection("vehicles").doc(reservation.vehicleId).get();
        if (vDoc.exists)
            vehicle = vDoc.data();
    }
    return { reservation, rider, driver, vehicle };
}
// 1. Trigger on Reservation Written
exports.onReservationWritten = (0, firestore_1.onDocumentWritten)("reservations/{resId}", async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const resId = event.params.resId;
    if (!after)
        return; // Deleted
    const data = await getTemplateData(after);
    const tz = after.timezone;
    const adminPhone = process.env.ADMIN_PHONE || ""; // Removed +1234567890 fallback // Adjust to real admin phone
    // 1a. New Booking
    if (!before) {
        if (data.rider?.phone) {
            await (0, sender_1.dispatchNotification)({
                reservationId: resId, type: "rider_booking_confirmed", channel: "sms",
                to: data.rider.phone, content: templates_1.Templates.riderBookingConfirmed(data), timezone: tz
            });
        }
        await (0, sender_1.dispatchNotification)({
            reservationId: resId, type: "admin_new_booking", channel: "sms",
            to: adminPhone, content: templates_1.Templates.adminNewBooking(data), timezone: tz
        });
        return;
    }
    // 1b. Cancellation
    if (after.status === "cancelled" && before.status !== "cancelled") {
        await (0, sender_1.dispatchNotification)({
            reservationId: resId, type: "admin_cancellation", channel: "sms",
            to: adminPhone, content: templates_1.Templates.adminCancellation(data), timezone: tz
        });
    }
    // 1c. Driver Assigned
    if (after.driverId && !before.driverId) {
        if (data.rider?.phone) {
            await (0, sender_1.dispatchNotification)({
                reservationId: resId, type: "rider_driver_assigned", channel: "sms",
                to: data.rider.phone, content: templates_1.Templates.riderDriverAssigned(data), timezone: tz
            });
        }
        if (data.driver?.phone) {
            await (0, sender_1.dispatchNotification)({
                reservationId: resId, type: "driver_new_assignment", channel: "sms",
                to: data.driver.phone, content: templates_1.Templates.driverNewAssignment(data), timezone: tz
            });
        }
    }
    // 1d. En Route
    if (after.status === "en_route" && before.status !== "en_route") {
        if (data.rider?.phone) {
            await (0, sender_1.dispatchNotification)({
                reservationId: resId, type: "rider_driver_en_route", channel: "sms",
                to: data.rider.phone, content: templates_1.Templates.riderDriverEnRoute(data), urgent: true, timezone: tz
            });
        }
    }
    // 1e. Arrived
    if (after.status === "arrived" && before.status !== "arrived") {
        if (data.rider?.phone) {
            await (0, sender_1.dispatchNotification)({
                reservationId: resId, type: "rider_driver_arrived", channel: "sms",
                to: data.rider.phone, content: templates_1.Templates.riderDriverArrived(data), urgent: true, timezone: tz
            });
        }
    }
    // 1f. Trip Complete
    if (after.status === "completed" && before.status !== "completed") {
        if (data.rider?.phone) {
            await (0, sender_1.dispatchNotification)({
                reservationId: resId, type: "rider_trip_complete_sms", channel: "sms",
                to: data.rider.phone, content: templates_1.Templates.riderTripComplete(data), timezone: tz
            });
        }
        if (data.rider?.email) {
            await (0, sender_1.dispatchNotification)({
                reservationId: resId, type: "rider_trip_complete_email", channel: "email",
                to: data.rider.email, content: templates_1.Templates.riderReceiptEmail(data), timezone: tz
            });
        }
    }
});
// 2. Scheduled checks (run every 15 minutes)
exports.checkUpcomingReservations = (0, scheduler_1.onSchedule)("every 15 minutes", async (event) => {
    const now = Date.now();
    const adminPhone = process.env.ADMIN_PHONE || ""; // Removed +1234567890 fallback
    // Check Admin Unassigned Warning (<= 4 hours)
    const fourHoursFromNow = new Date(now + 4 * 60 * 60 * 1000);
    const unassignedSnap = await adminDb.collection("reservations")
        .where("status", "==", "confirmed")
        .where("driverId", "==", null)
        .where("pickupAt", "<=", fourHoursFromNow)
        .get();
    for (const doc of unassignedSnap.docs) {
        const res = doc.data();
        const data = await getTemplateData(res);
        await (0, sender_1.dispatchNotification)({
            reservationId: doc.id, type: "admin_unassigned_warning", channel: "sms",
            to: adminPhone, content: templates_1.Templates.adminUnassignedWarning(data), timezone: res.timezone
        });
    }
    // Check Driver Reminder (<= 1 hour)
    const oneHourFromNow = new Date(now + 1 * 60 * 60 * 1000);
    const assignedSnap = await adminDb.collection("reservations")
        .where("status", "==", "assigned")
        .where("pickupAt", "<=", oneHourFromNow)
        .get();
    for (const doc of assignedSnap.docs) {
        const res = doc.data();
        const data = await getTemplateData(res);
        if (data.driver?.phone) {
            await (0, sender_1.dispatchNotification)({
                reservationId: doc.id, type: "driver_reminder_60min", channel: "sms",
                to: data.driver.phone, content: templates_1.Templates.driverReminder60Min(data), timezone: res.timezone
            });
        }
    }
});
//# sourceMappingURL=notifications.js.map