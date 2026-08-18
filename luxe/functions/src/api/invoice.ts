import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { Reservation } from "../shared";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

/**
 * Formats deterministic currency strings from cents.
 */
function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Generates an executive HTML receipt template matching LUXE 18K Champagne Gold & Slate-Obsidian design standards.
 */
export function generateExecutiveInvoiceHtml(reservation: Reservation): string {
  const pricing = reservation.pricing;
  const totalCents = pricing?.estimatedTotalCents || pricing?.totalCents || 0;
  const subtotalCents = pricing?.subtotalCents || Math.round(totalCents * 0.80);
  const gratuityCents = pricing?.gratuityCents || Math.round(totalCents * 0.20);
  const taxCents = pricing?.taxCents || 0;
  const tollsCents = reservation.tollsCents || 0;
  const parkingCents = reservation.parkingCents || 0;

  const pTime = reservation.pickupAt as any;
  const pickupDate = typeof pTime?.toDate === "function" ? pTime.toDate() : new Date(pTime);
  const pickupFormatted = pickupDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const confirmationCode = reservation.confirmationCode || "LUXE";
  const pickupAddress = (reservation.pickup as any)?.formatted || "Pickup Location";
  const dropoffAddress = (reservation.dropoff as any)?.formatted || "As-Directed Hourly";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>LUXE Executive Charter Receipt #${confirmationCode}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #08080d; color: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #0e0e13; border: 1px solid #1e263c; border-radius: 20px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.8); }
    .header { text-align: center; border-bottom: 1px solid #1e263c; padding-bottom: 24px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #c59a58; text-transform: uppercase; font-family: Georgia, serif; }
    .subtitle { font-size: 11px; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
    .badge { display: inline-block; background-color: rgba(197, 154, 88, 0.15); color: #c59a58; border: 1px solid rgba(197, 154, 88, 0.3); border-radius: 12px; padding: 4px 12px; font-size: 11px; font-weight: bold; letter-spacing: 1px; margin-top: 12px; }
    .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; color: #c59a58; margin-top: 24px; margin-bottom: 12px; }
    .grid { display: table; width: 100%; margin-bottom: 16px; }
    .row { display: table-row; }
    .col { display: table-cell; padding: 6px 0; vertical-align: top; }
    .col-label { color: #94a3b8; font-size: 12px; width: 35%; }
    .col-val { color: #f8fafc; font-size: 12px; font-weight: 600; text-align: right; width: 65%; }
    .divider { border-top: 1px dashed #1e263c; margin: 20px 0; }
    .total-row { display: table-row; font-size: 16px; font-weight: bold; }
    .total-label { display: table-cell; padding: 12px 0; color: #f8fafc; }
    .total-val { display: table-cell; padding: 12px 0; color: #c59a58; text-align: right; font-size: 20px; font-family: monospace; }
    .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 32px; line-height: 1.6; }
    .footer a { color: #c59a58; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">LUXE</div>
      <div class="subtitle">Executive Chauffeur & Private Aviation Ground Services</div>
      <div class="badge">CONFIRMATION #${confirmationCode}</div>
    </div>

    <div class="section-title">Charter Details</div>
    <div class="grid">
      <div class="row">
        <div class="col col-label">Passenger</div>
        <div class="col col-val">${reservation.riderName}</div>
      </div>
      <div class="row">
        <div class="col col-label">Service Date</div>
        <div class="col col-val">${pickupFormatted}</div>
      </div>
      <div class="row">
        <div class="col col-label">Chauffeur</div>
        <div class="col col-val">${reservation.driverName || "Executive Fleet Chauffeur"}</div>
      </div>
      <div class="row">
        <div class="col col-label">Flagship Vehicle</div>
        <div class="col col-val">${reservation.vehicleDescription || "Cadillac Escalade ESV"}</div>
      </div>
      ${reservation.flightNumber ? `
      <div class="row">
        <div class="col col-label">Inbound Flight</div>
        <div class="col col-val">${reservation.flightNumber}</div>
      </div>` : ""}
    </div>

    <div class="section-title">Route Itinerary</div>
    <div class="grid">
      <div class="row">
        <div class="col col-label">Pickup Location</div>
        <div class="col col-val">${pickupAddress}</div>
      </div>
      <div class="row">
        <div class="col col-label">Destination</div>
        <div class="col col-val">${dropoffAddress}</div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="section-title">Itemized Billing Statement</div>
    <div class="grid">
      <div class="row">
        <div class="col col-label">Base Service Rate</div>
        <div class="col col-val">${formatCents(subtotalCents)}</div>
      </div>
      <div class="row">
        <div class="col col-label">Chauffeur Gratuity (20%)</div>
        <div class="col col-val">${formatCents(gratuityCents)}</div>
      </div>
      ${taxCents > 0 ? `
      <div class="row">
        <div class="col col-label">Taxes & Airport Tariffs</div>
        <div class="col col-val">${formatCents(taxCents)}</div>
      </div>` : ""}
      ${tollsCents > 0 ? `
      <div class="row">
        <div class="col col-label">Bridge & Highway Tolls</div>
        <div class="col col-val">${formatCents(tollsCents)}</div>
      </div>` : ""}
      ${parkingCents > 0 ? `
      <div class="row">
        <div class="col col-label">Airport Staging / Parking</div>
        <div class="col col-val">${formatCents(parkingCents)}</div>
      </div>` : ""}
      
      <div class="row total-row">
        <div class="total-label">Total Authorized & Paid</div>
        <div class="total-val">${formatCents(totalCents)}</div>
      </div>
    </div>

    <div class="grid" style="margin-top: 12px;">
      <div class="row">
        <div class="col col-label">Payment Method</div>
        <div class="col col-val">Square PCI-DSS Verified ${reservation.squareCardBrand ? `(${reservation.squareCardBrand} •••• ${reservation.squareCardLast4 || ""})` : ""}</div>
      </div>
      ${(reservation as any).squareReceiptUrl ? `
      <div class="row">
        <div class="col col-label">Square Receipt</div>
        <div class="col col-val"><a href="${(reservation as any).squareReceiptUrl}" style="color: #c59a58;" target="_blank">View Official Square Receipt</a></div>
      </div>` : ""}
    </div>

    <div class="footer">
      <p>Thank you for choosing LUXE Executive Ground Services.<br>
      Tax ID / EIN: 84-1928492 • Dedicated VIP Support: <a href="mailto:concierge@luxe.app">concierge@luxe.app</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * sendTripInvoice: Callable Cloud Function allowing dispatchers or passengers
 * to email the official executive receipt.
 */
export const sendTripInvoice = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required to send invoices.");
  }

  const { reservationId, recipientEmail } = request.data;
  if (!reservationId) {
    throw new HttpsError("invalid-argument", "reservationId is required.");
  }

  const resDoc = await db.collection("reservations").doc(reservationId).get();
  if (!resDoc.exists) {
    throw new HttpsError("not-found", "Reservation not found.");
  }

  const reservation = resDoc.data() as Reservation;
  const targetEmail = recipientEmail || reservation.riderEmail || request.auth.token.email;

  if (!targetEmail) {
    throw new HttpsError("invalid-argument", "No recipient email found for this reservation.");
  }

  const htmlContent = generateExecutiveInvoiceHtml(reservation);
  const confirmationCode = reservation.confirmationCode || "LUXE";
  const totalStr = formatCents(reservation.pricing?.estimatedTotalCents || reservation.pricing?.totalCents || 0);

  // Queue into Firestore mail collection for nodemailer worker
  const mailRef = db.collection("mail").doc();
  await mailRef.set({
    to: [targetEmail],
    message: {
      subject: `LUXE Executive Charter Receipt #${confirmationCode} (${totalStr})`,
      html: htmlContent,
    },
    reservationId,
    type: "executive_invoice",
    createdAt: FieldValue.serverTimestamp(),
  });

  // Log status event
  const eventRef = resDoc.ref.collection("statusEvents").doc();
  await eventRef.set({
    from: reservation.status,
    to: reservation.status,
    at: FieldValue.serverTimestamp(),
    actorId: request.auth.uid,
    actorRole: request.auth.token.role || "user",
    note: `Executive receipt emailed to ${targetEmail}`,
    location: null,
  });

  return {
    success: true,
    recipientEmail: targetEmail,
    confirmationCode,
    message: `Receipt successfully queued for delivery to ${targetEmail}`,
  };
});
