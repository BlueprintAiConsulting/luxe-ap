import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { admin } from "../lib/admin";
const adminDb = admin.firestore();
import { dispatchNotification } from "../lib/notifications/sender";
import { Templates, TemplateData } from "../lib/notifications/templates";
import { Reservation } from "../shared/reservation";
import { User, Vehicle } from "../shared/index";

async function getTemplateData(reservation: Reservation): Promise<TemplateData> {
  let rider: User | undefined;
  let driver: User | undefined;
  let vehicle: Vehicle | undefined;

  if (reservation.riderId) {
    const rDoc = await adminDb.collection("users").doc(reservation.riderId).get();
    if (rDoc.exists) rider = rDoc.data() as User;
  }
  if (reservation.driverId) {
    const dDoc = await adminDb.collection("users").doc(reservation.driverId).get();
    if (dDoc.exists) driver = dDoc.data() as User;
  }
  if (reservation.vehicleId) {
    const vDoc = await adminDb.collection("vehicles").doc(reservation.vehicleId).get();
    if (vDoc.exists) vehicle = vDoc.data() as Vehicle;
  }
  return { reservation, rider, driver, vehicle };
}

// 1. Trigger on Reservation Written
export const onReservationWritten = onDocumentWritten("reservations/{resId}", async (event) => {
  const before = event.data?.before.data() as Reservation | undefined;
  const after = event.data?.after.data() as Reservation | undefined;
  const resId = event.params.resId;

  if (!after) return; // Deleted

  const data = await getTemplateData(after);
  const tz = after.timezone;
  const adminPhone = process.env.ADMIN_PHONE || "+1234567890"; // Adjust to real admin phone

  // 1a. New Booking
  if (!before) {
    if (data.rider?.phone) {
      await dispatchNotification({
        reservationId: resId, type: "rider_booking_confirmed", channel: "sms",
        to: data.rider.phone, content: Templates.riderBookingConfirmed(data), timezone: tz
      });
    }
    await dispatchNotification({
      reservationId: resId, type: "admin_new_booking", channel: "sms",
      to: adminPhone, content: Templates.adminNewBooking(data), timezone: tz
    });
    return;
  }

  // 1b. Cancellation
  if (after.status === "cancelled" && before.status !== "cancelled") {
    await dispatchNotification({
      reservationId: resId, type: "admin_cancellation", channel: "sms",
      to: adminPhone, content: Templates.adminCancellation(data), timezone: tz
    });
  }

  // 1c. Driver Assigned
  if (after.driverId && !before.driverId) {
    if (data.rider?.phone) {
      await dispatchNotification({
        reservationId: resId, type: "rider_driver_assigned", channel: "sms",
        to: data.rider.phone, content: Templates.riderDriverAssigned(data), timezone: tz
      });
    }
    if (data.driver?.phone) {
      await dispatchNotification({
        reservationId: resId, type: "driver_new_assignment", channel: "sms",
        to: data.driver.phone, content: Templates.driverNewAssignment(data), timezone: tz
      });
    }
  }

  // 1d. En Route
  if (after.status === "en_route" && before.status !== "en_route") {
    if (data.rider?.phone) {
      await dispatchNotification({
        reservationId: resId, type: "rider_driver_en_route", channel: "sms",
        to: data.rider.phone, content: Templates.riderDriverEnRoute(data), urgent: true, timezone: tz
      });
    }
  }

  // 1e. Arrived
  if (after.status === "arrived" && before.status !== "arrived") {
    if (data.rider?.phone) {
      await dispatchNotification({
        reservationId: resId, type: "rider_driver_arrived", channel: "sms",
        to: data.rider.phone, content: Templates.riderDriverArrived(data), urgent: true, timezone: tz
      });
    }
  }

  // 1f. Trip Complete
  if (after.status === "completed" && before.status !== "completed") {
    if (data.rider?.phone) {
      await dispatchNotification({
        reservationId: resId, type: "rider_trip_complete_sms", channel: "sms",
        to: data.rider.phone, content: Templates.riderTripComplete(data), timezone: tz
      });
    }
    if (data.rider?.email) {
      await dispatchNotification({
        reservationId: resId, type: "rider_trip_complete_email", channel: "email",
        to: data.rider.email, content: Templates.riderReceiptEmail(data), timezone: tz
      });
    }
  }
});

// 2. Scheduled checks (run every 15 minutes)
export const checkUpcomingReservations = onSchedule("every 15 minutes", async (event) => {
  const now = Date.now();
  const adminPhone = process.env.ADMIN_PHONE || "+1234567890";

  // Check Admin Unassigned Warning (<= 4 hours)
  const fourHoursFromNow = new Date(now + 4 * 60 * 60 * 1000);
  const unassignedSnap = await adminDb.collection("reservations")
    .where("status", "in", ["unassigned", "quote_accepted"])
    .where("pickupAt", "<=", fourHoursFromNow)
    .get();

  for (const doc of unassignedSnap.docs) {
    const res = doc.data() as Reservation;
    const data = await getTemplateData(res);
    await dispatchNotification({
      reservationId: doc.id, type: "admin_unassigned_warning", channel: "sms",
      to: adminPhone, content: Templates.adminUnassignedWarning(data), timezone: res.timezone
    });
  }

  // Check Driver Reminder (<= 1 hour)
  const oneHourFromNow = new Date(now + 1 * 60 * 60 * 1000);
  const assignedSnap = await adminDb.collection("reservations")
    .where("status", "==", "assigned")
    .where("pickupAt", "<=", oneHourFromNow)
    .get();

  for (const doc of assignedSnap.docs) {
    const res = doc.data() as Reservation;
    const data = await getTemplateData(res);
    if (data.driver?.phone) {
      await dispatchNotification({
        reservationId: doc.id, type: "driver_reminder_60min", channel: "sms",
        to: data.driver.phone, content: Templates.driverReminder60Min(data), timezone: res.timezone
      });
    }
  }
});
