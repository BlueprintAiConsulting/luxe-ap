"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Templates = void 0;
const date_fns_tz_1 = require("date-fns-tz");
function formatMoney(cents) {
    return `$${(cents / 100).toFixed(2)}`;
}
function formatLocalTime(timestamp, timezone) {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return (0, date_fns_tz_1.formatInTimeZone)(date, timezone, "MMM d, h:mm a zzz");
}
exports.Templates = {
    // RIDER SMS
    riderBookingConfirmed: (data) => {
        const time = formatLocalTime(data.reservation.pickupAt, data.reservation.timezone);
        return `Luxe Confirmation: Your ride is booked for ${time}. Confirmation code: ${data.reservation.confirmationCode}.`;
    },
    riderDriverAssigned: (data) => {
        const dName = data.driver?.firstName || "Your driver";
        const vDesc = data.vehicle ? `${data.vehicle.color} ${data.vehicle.make} ${data.vehicle.model}` : "your vehicle";
        return `Luxe Update: ${dName} has been assigned as your chauffeur in a ${vDesc}.`;
    },
    riderDriverEnRoute: (data) => {
        const dName = data.driver?.firstName || "Your driver";
        return `Luxe Update: ${dName} is en route to your pickup location.`;
    },
    riderDriverArrived: (data) => {
        const dName = data.driver?.firstName || "Your driver";
        return `Luxe Update: ${dName} has arrived at your pickup location.`;
    },
    riderTripComplete: (data) => {
        const total = formatMoney(data.reservation.pricing.totalCents);
        return `Luxe Update: Your trip is complete. Total: ${total}. A receipt has been sent to your email.`;
    },
    // DRIVER SMS
    driverNewAssignment: (data) => {
        const time = formatLocalTime(data.reservation.pickupAt, data.reservation.timezone);
        return `Luxe Dispatch: You have a new assignment on ${time}. Please check your driver portal.`;
    },
    driverReminder60Min: (data) => {
        const time = formatLocalTime(data.reservation.pickupAt, data.reservation.timezone);
        return `Luxe Reminder: You have an upcoming trip at ${time}. Please ensure you are prepped and en route soon.`;
    },
    // ADMIN SMS
    adminNewBooking: (data) => {
        const time = formatLocalTime(data.reservation.pickupAt, data.reservation.timezone);
        return `Luxe Admin: New booking created! Pickup: ${time}. ID: ${data.reservation.confirmationCode}.`;
    },
    adminCancellation: (data) => {
        const time = formatLocalTime(data.reservation.pickupAt, data.reservation.timezone);
        return `Luxe Admin: Booking cancelled. ID: ${data.reservation.confirmationCode}, original pickup: ${time}.`;
    },
    adminUnassignedWarning: (data) => {
        const time = formatLocalTime(data.reservation.pickupAt, data.reservation.timezone);
        return `Luxe Admin URGENT: Booking ${data.reservation.confirmationCode} is 4 hours away (${time}) and still unassigned.`;
    },
    // RIDER EMAIL
    riderReceiptEmail: (data) => {
        const r = data.reservation;
        const itemsHtml = r.pricing.lineItems.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.label}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatMoney(item.amountCents)}</td>
      </tr>
    `).join("");
        return `
      <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
        <h2>Luxe Receipt</h2>
        <p>Thank you for riding with us. Here is your receipt for trip <strong>${r.confirmationCode}</strong>.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          ${itemsHtml}
          <tr>
            <td style="padding: 8px; font-weight: bold;">Total</td>
            <td style="padding: 8px; font-weight: bold; text-align: right;">${formatMoney(r.pricing.totalCents)}</td>
          </tr>
        </table>
        <p style="margin-top: 30px; font-size: 12px; color: #666;">
          If you have any questions, please reply to this email or contact support.
        </p>
      </div>
    `;
    }
};
//# sourceMappingURL=templates.js.map