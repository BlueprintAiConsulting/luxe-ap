"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMonthlyCorporateBilling = void 0;
exports.generateCorporateInvoiceHtml = generateCorporateInvoiceHtml;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)();
/**
 * Formats deterministic currency strings from cents.
 */
function formatCents(cents) {
    return `$${(cents / 100).toFixed(2)}`;
}
/**
 * Generates an executive consolidated corporate billing HTML statement.
 */
function generateCorporateInvoiceHtml(invoice) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>LUXE Corporate Invoice #${invoice.invoiceNumber} - ${invoice.companyName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #08080d; color: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 750px; margin: 0 auto; background-color: #0e0e13; border: 1px solid #1e263c; border-radius: 20px; padding: 36px; box-shadow: 0 20px 40px rgba(0,0,0,0.8); }
    .header { display: flex; justify-content: space-between; border-bottom: 1px solid #1e263c; padding-bottom: 24px; margin-bottom: 24px; }
    .logo { font-size: 26px; font-weight: bold; letter-spacing: 4px; color: #c59a58; text-transform: uppercase; font-family: Georgia, serif; }
    .subtitle { font-size: 11px; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
    .invoice-meta { text-align: right; font-family: monospace; font-size: 12px; }
    .invoice-title { font-size: 18px; font-weight: bold; color: #c59a58; letter-spacing: 1px; }
    .meta-line { color: #94a3b8; margin-top: 4px; }
    .client-card { background-color: #121727; border: 1px solid #1e263c; border-radius: 16px; padding: 18px; margin-bottom: 28px; display: table; width: 100%; }
    .table-section { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
    .table-section th { text-align: left; padding: 10px 8px; font-size: 10px; font-family: monospace; text-transform: uppercase; color: #c59a58; border-bottom: 1px solid #1e263c; letter-spacing: 1px; }
    .table-section td { padding: 12px 8px; font-size: 11px; border-bottom: 1px solid #161c2e; vertical-align: middle; }
    .summary-table { width: 320px; margin-left: auto; border-collapse: collapse; }
    .summary-table td { padding: 6px 0; font-size: 12px; }
    .summary-label { color: #94a3b8; }
    .summary-val { text-align: right; font-weight: bold; font-family: monospace; }
    .total-row td { border-top: 1px solid #1e263c; padding-top: 12px; font-size: 16px; color: #c59a58; }
    .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 36px; line-height: 1.6; border-top: 1px solid #1e263c; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="logo">LUXE</div>
        <div class="subtitle">Executive Fleet & Private Aviation Ground Transport</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Tax ID / EIN: 84-1928492</div>
      </div>
      <div class="invoice-meta">
        <div class="invoice-title">CONSOLIDATED INVOICE</div>
        <div class="meta-line">Invoice #: <strong>${invoice.invoiceNumber}</strong></div>
        <div class="meta-line">Period: ${invoice.billingPeriodStart} to ${invoice.billingPeriodEnd}</div>
        <div class="meta-line">Due Date: <strong style="color: #f8fafc;">${invoice.dueDate}</strong></div>
        <div class="meta-line">Terms: ${invoice.paymentTerms.toUpperCase().replace(/_/g, " ")}</div>
      </div>
    </div>

    <div class="client-card">
      <div style="font-size: 10px; font-family: monospace; text-transform: uppercase; color: #c59a58; font-weight: bold; letter-spacing: 1.5px; margin-bottom: 6px;">Billed Corporate Client</div>
      <div style="font-size: 16px; font-weight: bold; color: #ffffff;">${invoice.companyName}</div>
      <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Attn: ${invoice.billingContactName} &bull; ${invoice.billingEmail}</div>
    </div>

    <table class="table-section">
      <thead>
        <tr>
          <th>Date / Conf</th>
          <th>Passenger</th>
          <th>Route Itinerary</th>
          <th>Class</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.lineItems.map(item => `
          <tr>
            <td>
              <div style="font-weight: bold; color: #f8fafc;">${item.serviceDate}</div>
              <div style="font-family: monospace; color: #c59a58; font-size: 10px;">#${item.confirmationCode}</div>
            </td>
            <td><div style="font-weight: 600;">${item.riderName}</div></td>
            <td><div style="max-width: 220px; word-break: break-word; color: #cbd5e1;">${item.route}</div></td>
            <td><div style="font-size: 10px; color: #94a3b8;">${item.vehicleClass}</div></td>
            <td style="text-align: right; font-family: monospace; font-weight: bold; color: #f8fafc;">
              ${formatCents(item.netAmountCents)}
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <table class="summary-table">
      <tr>
        <td class="summary-label">Gross Charter Fares (${invoice.totalChartersCount} trips)</td>
        <td class="summary-val">${formatCents(invoice.subtotalCents)}</td>
      </tr>
      ${invoice.totalDiscountCents > 0 ? `
      <tr>
        <td class="summary-label" style="color: #34d399;">Corporate Volume Discount</td>
        <td class="summary-val" style="color: #34d399;">-${formatCents(invoice.totalDiscountCents)}</td>
      </tr>` : ""}
      <tr>
        <td class="summary-label">Chauffeur Gratuity (20%)</td>
        <td class="summary-val">${formatCents(invoice.totalGratuityCents)}</td>
      </tr>
      ${invoice.totalTollsAndParkingCents > 0 ? `
      <tr>
        <td class="summary-label">Bridge Tolls & Airport Parking</td>
        <td class="summary-val">${formatCents(invoice.totalTollsAndParkingCents)}</td>
      </tr>` : ""}
      <tr class="total-row">
        <td><strong>Total Balance Due</strong></td>
        <td class="summary-val" style="font-size: 20px;">${formatCents(invoice.totalDueCents)}</td>
      </tr>
    </table>

    <div class="footer">
      <p>Please remit payment within agreed corporate terms to <strong>Luxe Executive Ground LLC</strong>.<br>
      Direct Inquiries: <a href="mailto:corporate@luxe.app" style="color: #c59a58;">corporate@luxe.app</a> &bull; +1 (800) 555-0199 &bull; Wire / ACH & Square Corporate Invoicing</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
/**
 * processMonthlyCorporateBilling runs on the 1st of every month at 02:00 AM
 * to aggregate corporate charters, calculate volume discounts, and publish monthly statements.
 */
exports.processMonthlyCorporateBilling = (0, scheduler_1.onSchedule)("0 2 1 * *", async (event) => {
    const now = new Date();
    // Previous month date boundaries (UTC)
    const endOfPeriod = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const startOfPeriod = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
    const periodStartStr = startOfPeriod.toISOString().split("T")[0];
    const periodEndStr = endOfPeriod.toISOString().split("T")[0];
    const monthLabel = startOfPeriod.toLocaleString("en-US", { month: "short", year: "numeric" }).toUpperCase().replace(/\s+/g, "-");
    console.log(`[corporateBilling] Running Monthly Corporate Billing for period ${periodStartStr} to ${periodEndStr}`);
    try {
        // 1. Fetch all active corporate accounts
        const accountsSnap = await db.collection("corporateAccounts")
            .where("active", "==", true)
            .where("monthlyBillingEnabled", "==", true)
            .get();
        if (accountsSnap.empty) {
            console.log("[corporateBilling] No active monthly corporate accounts found.");
            return;
        }
        // 2. Fetch all completed reservations during the period
        const tripsSnap = await db.collection("reservations")
            .where("status", "==", "completed")
            .where("pickupAt", ">=", startOfPeriod)
            .where("pickupAt", "<", endOfPeriod)
            .get();
        const trips = tripsSnap.docs.map(d => d.data());
        for (const accountDoc of accountsSnap.docs) {
            const account = accountDoc.data();
            const accountId = account.accountId || accountDoc.id;
            // Filter trips belonging to this corporate account
            const matchingTrips = trips.filter(t => {
                if (t.corporateAccountId === accountId)
                    return true;
                if (account.authorizedRiderIds && account.authorizedRiderIds.includes(t.riderId))
                    return true;
                return false;
            });
            if (matchingTrips.length === 0) {
                console.log(`[corporateBilling] Account ${account.companyName} (${accountId}) had 0 trips in ${monthLabel}.`);
                continue;
            }
            let subtotalCents = 0;
            let totalGratuityCents = 0;
            let totalTollsAndParkingCents = 0;
            const lineItems = [];
            const discountRate = (account.discountPercent || 0) / 100;
            for (const trip of matchingTrips) {
                const fareTotal = trip.pricing?.estimatedTotalCents || trip.pricing?.totalCents || 0;
                const gratuity = trip.pricing?.gratuityCents || Math.round(fareTotal * 0.20);
                const baseFare = Math.max(0, fareTotal - gratuity);
                const discount = Math.round(baseFare * discountRate);
                const tollsAndParking = (trip.tollsCents || 0) + (trip.parkingCents || 0);
                const netAmount = (baseFare - discount) + gratuity + tollsAndParking;
                subtotalCents += baseFare;
                totalGratuityCents += gratuity;
                totalTollsAndParkingCents += tollsAndParking;
                const pTime = trip.pickupAt;
                const pDate = typeof pTime?.toDate === "function" ? pTime.toDate() : new Date(pTime);
                const serviceDateStr = pDate.toISOString().split("T")[0];
                lineItems.push({
                    reservationId: trip.reservationId,
                    confirmationCode: trip.confirmationCode || "LUXE",
                    riderName: trip.riderName,
                    serviceDate: serviceDateStr,
                    route: `${trip.pickup?.city || "Pickup"} -> ${trip.dropoff?.city || "Destination"}`,
                    vehicleClass: trip.className || "Luxury SUV",
                    baseFareCents: baseFare,
                    discountCents: discount,
                    gratuityCents: gratuity,
                    tollsAndParkingCents: tollsAndParking,
                    netAmountCents: netAmount,
                });
            }
            const totalDiscountCents = Math.round(subtotalCents * discountRate);
            const totalDueCents = (subtotalCents - totalDiscountCents) + totalGratuityCents + totalTollsAndParkingCents;
            const invoiceNumber = `INV-${monthLabel}-${accountId.slice(0, 4).toUpperCase()}`;
            const invoiceId = `corp_inv_${accountId}_${periodStartStr}`;
            // Calculate Due Date based on payment terms
            const dueDate = new Date(endOfPeriod);
            if (account.paymentTerms === "net_30")
                dueDate.setDate(dueDate.getDate() + 30);
            else if (account.paymentTerms === "net_15")
                dueDate.setDate(dueDate.getDate() + 15);
            else
                dueDate.setDate(dueDate.getDate() + 7);
            const invoiceData = {
                invoiceId,
                invoiceNumber,
                accountId,
                companyName: account.companyName,
                billingContactName: account.billingContactName || "Accounts Payable",
                billingEmail: account.billingEmail,
                billingPeriodStart: periodStartStr,
                billingPeriodEnd: periodEndStr,
                dueDate: dueDate.toISOString().split("T")[0],
                totalChartersCount: matchingTrips.length,
                subtotalCents,
                totalDiscountCents,
                totalGratuityCents,
                totalTollsAndParkingCents,
                totalDueCents,
                status: "sent",
                lineItems,
                paymentTerms: account.paymentTerms || "net_30",
                createdAt: firestore_1.FieldValue.serverTimestamp(),
            };
            invoiceData.generatedHtml = generateCorporateInvoiceHtml(invoiceData);
            const batch = db.batch();
            // 1. Save Corporate Invoice
            const invoiceRef = db.collection("corporateInvoices").doc(invoiceId);
            batch.set(invoiceRef, invoiceData);
            // 2. Queue Email Dispatch
            const mailRef = db.collection("mail").doc();
            batch.set(mailRef, {
                to: [account.billingEmail],
                message: {
                    subject: `LUXE Corporate Billing Statement #${invoiceNumber} - ${account.companyName} ($${(totalDueCents / 100).toFixed(2)})`,
                    html: invoiceData.generatedHtml,
                },
                corporateInvoiceId: invoiceId,
                type: "corporate_monthly_statement",
                createdAt: firestore_1.FieldValue.serverTimestamp(),
            });
            // 3. Add Admin Notification for Joe
            const notifRef = db.collection("adminNotifications").doc();
            batch.set(notifRef, {
                title: `Monthly B2B Invoice Dispatched: ${account.companyName}`,
                message: `Consolidated statement #${invoiceNumber} ($${(totalDueCents / 100).toFixed(2)}) for ${matchingTrips.length} charters sent to ${account.billingEmail}.`,
                invoiceId,
                type: "corporate_billing",
                read: false,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
            });
            await batch.commit();
            console.log(`[corporateBilling] Dispatched invoice ${invoiceNumber} to ${account.companyName} (${account.billingEmail}) for $${(totalDueCents / 100).toFixed(2)}`);
        }
    }
    catch (error) {
        console.error("[corporateBilling] Error processing monthly corporate billing:", error);
    }
});
//# sourceMappingURL=corporateBilling.js.map