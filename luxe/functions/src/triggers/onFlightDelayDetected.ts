import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { Reservation, ReservationStatusEvent } from "../shared";

const db = getFirestore();

/**
 * onFlightDelayDetected triggers whenever a reservation document is updated.
 * If flightStatus.delayMinutes changes significantly (>=15 min), it automatically:
 * 1. Shifts the reservation's pickupAt timestamp to synchronize with the new landing time.
 * 2. Writes an audit log in statusEvents.
 * 3. Injects an automated message into the 3-Way Concierge Chat (Rider <-> Driver <-> Dispatch).
 * 4. Pushes an executive alert to adminNotifications.
 */
export const onFlightDelayDetected = onDocumentWritten("reservations/{reservationId}", async (event) => {
  const beforeData = event.data?.before.data() as Reservation | undefined;
  const afterData = event.data?.after.data() as Reservation | undefined;

  if (!afterData) return; // Deleted document

  const beforeDelay = beforeData?.flightStatus?.delayMinutes || 0;
  const afterDelay = afterData.flightStatus?.delayMinutes || 0;

  // Check if delay increased by 15 mins or more and is active
  if (
    afterData.flightNumber &&
    afterDelay >= 15 &&
    afterDelay !== beforeDelay &&
    ["confirmed", "assigned", "en_route"].includes(afterData.status)
  ) {
    const reservationId = event.params.reservationId;
    const resRef = db.collection("reservations").doc(reservationId);

    const delayDelta = afterDelay - beforeDelay;
    const currentPickup = afterData.pickupAt as any;
    const currentPickupDate = typeof currentPickup?.toDate === "function" 
      ? currentPickup.toDate() 
      : new Date(currentPickup);

    const newPickupDate = new Date(currentPickupDate.getTime() + delayDelta * 60000);
    const oldTimeStr = currentPickupDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const newTimeStr = newPickupDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    console.log(`[onFlightDelayDetected] Auto-synchronizing ${afterData.flightNumber} delay (+${afterDelay}m): ${oldTimeStr} -> ${newTimeStr}`);

    const batch = db.batch();

    // 1. Update pickup timestamp and instruction notes
    batch.update(resRef, {
      pickupAt: newPickupDate,
      specialInstructions: `${afterData.specialInstructions || ""}\n[Flight Radar Auto-Sync]: Delayed +${afterDelay}m. Staging shifted to ${newTimeStr}`.trim(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 2. Add Status Event
    const eventRef = resRef.collection("statusEvents").doc();
    const statusEvent: ReservationStatusEvent = {
      from: afterData.status,
      to: afterData.status,
      at: FieldValue.serverTimestamp() as any,
      actorId: "system_flight_radar",
      actorRole: "admin",
      note: `Flight Radar Auto-Sync: ${afterData.flightNumber} delayed +${afterDelay}m. Staging shifted from ${oldTimeStr} to ${newTimeStr}.`,
      location: null,
    };
    batch.set(eventRef, statusEvent);

    // 3. Inject Automated Concierge Message into Chat Drawer
    const msgRef = resRef.collection("messages").doc();
    batch.set(msgRef, {
      senderId: "system_concierge",
      senderName: "LUXE Flight Radar",
      senderRole: "system",
      content: `✈️ Flight Radar Update: Inbound flight ${afterData.flightNumber} is landing ${afterDelay} minutes late (${newTimeStr}). Chauffeur ${afterData.driverName || "Marcus Bennett"} staging time has been auto-synchronized.`,
      createdAt: FieldValue.serverTimestamp(),
      readBy: [],
    });

    // 4. Push Admin / Driver Notification
    const notifRef = db.collection("adminNotifications").doc();
    batch.set(notifRef, {
      title: `Flight Radar Delay: ${afterData.flightNumber} (+${afterDelay}m)`,
      message: `Reservation #${afterData.confirmationCode} (${afterData.riderName}) auto-shifted from ${oldTimeStr} to ${newTimeStr}. Chauffeur: ${afterData.driverName || "Unassigned"}.`,
      reservationId,
      type: "flight_delay_auto_shifted",
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();
  }
});
