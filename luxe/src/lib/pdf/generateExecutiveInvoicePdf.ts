import { Reservation } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

export async function generateExecutiveInvoicePdf(trip: Reservation) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  let y = margin;

  // Colors
  const goldPrimary = [212, 175, 55]; // #D4AF37
  const darkObsidian = [14, 14, 19];
  const charcoalDark = [30, 30, 36];
  const mutedGray = [120, 120, 130];
  const pureBlack = [0, 0, 0];

  // 1. Header Banner & Branding
  doc.setFillColor(10, 10, 14);
  doc.rect(0, 0, pageWidth, 42, "F");

  // Gold accent rule
  doc.setDrawColor(goldPrimary[0], goldPrimary[1], goldPrimary[2]);
  doc.setLineWidth(1.5);
  doc.line(0, 42, pageWidth, 42);

  // Logo / Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("L U X E", margin, 18);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(goldPrimary[0], goldPrimary[1], goldPrimary[2]);
  doc.text("CHAUFFEURED MOBILITY & PRIVATE AVIATION LIVERY", margin, 24);

  // Top Right Invoice Info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("EXECUTIVE TAX INVOICE", pageWidth - margin, 18, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text(`CONFIRMATION: #${trip.confirmationCode || trip.reservationId.slice(-8).toUpperCase()}`, pageWidth - margin, 25, { align: "right" });
  doc.text(`ISSUED: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`, pageWidth - margin, 31, { align: "right" });

  y = 52;

  // 2. Billing & Account Parties (2-column layout)
  doc.setFillColor(248, 248, 250);
  doc.roundedRect(margin, y, (pageWidth - margin * 2) / 2 - 4, 38, 2, 2, "F");
  doc.roundedRect(margin + (pageWidth - margin * 2) / 2 + 4, y, (pageWidth - margin * 2) / 2 - 4, 38, 2, 2, "F");

  // Client Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(goldPrimary[0], goldPrimary[1], goldPrimary[2]);
  doc.text("BILLED TO / PASSENGER", margin + 5, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(darkObsidian[0], darkObsidian[1], darkObsidian[2]);
  doc.text(trip.riderName || "Valued Client", margin + 5, y + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
  if (trip.riderEmail) doc.text(trip.riderEmail, margin + 5, y + 20);
  if (trip.riderPhone) doc.text(trip.riderPhone, margin + 5, y + 26);
  if (trip.corporateAccountId) {
    doc.setTextColor(180, 130, 20);
    doc.text(`Corporate Direct Billing: #${trip.corporateAccountId}`, margin + 5, y + 32);
  }

  // Operator / Chauffeur Details
  const col2X = margin + (pageWidth - margin * 2) / 2 + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(goldPrimary[0], goldPrimary[1], goldPrimary[2]);
  doc.text("OPERATOR & SERVICE DETAILS", col2X + 5, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(darkObsidian[0], darkObsidian[1], darkObsidian[2]);
  doc.text(trip.className || "Executive Class", col2X + 5, y + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
  doc.text(`Assigned Chauffeur: ${trip.driverName || "Executive Fleet Chauffeur"}`, col2X + 5, y + 20);
  doc.text(`Vehicle: ${trip.vehicleDescription || "Late-Model Livery Flagship"}`, col2X + 5, y + 26);
  doc.text(`Service: ${trip.tripType.replace(/_/g, " ").toUpperCase()}`, col2X + 5, y + 32);

  y += 46;

  // 3. Journey Itinerary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(darkObsidian[0], darkObsidian[1], darkObsidian[2]);
  doc.text("JOURNEY ITINERARY & TIMESTAMPS", margin, y);

  doc.setDrawColor(220, 220, 225);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);

  y += 8;

  // Pickup Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(goldPrimary[0], goldPrimary[1], goldPrimary[2]);
  doc.text("PICKUP:", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(darkObsidian[0], darkObsidian[1], darkObsidian[2]);
  doc.text(formatDateTime(trip.pickupAt, trip.timezone || "America/Los_Angeles"), margin + 20, y);

  y += 5;
  doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
  const pickupLines = doc.splitTextToSize(trip.pickup.formatted || "Scheduled Pickup Address", pageWidth - margin * 2 - 20);
  doc.text(pickupLines, margin + 20, y);
  y += pickupLines.length * 4 + 3;

  // Dropoff Details
  if (trip.dropoff) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(goldPrimary[0], goldPrimary[1], goldPrimary[2]);
    doc.text("DROPOFF:", margin, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
    const dropoffLines = doc.splitTextToSize(trip.dropoff.formatted || "Destination Address", pageWidth - margin * 2 - 20);
    doc.text(dropoffLines, margin + 20, y);
    y += dropoffLines.length * 4 + 3;
  }

  // Flight Info if present
  if (trip.flightNumber) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(180, 130, 20);
    doc.text(`FLIGHT CHARTER: ${trip.flightNumber} ${trip.flightStatus?.airline ? `(${trip.flightStatus.airline})` : ""} - LIVE RADAR MONITORED`, margin, y);
    y += 7;
  }

  y += 4;

  // 4. Financial Breakdown Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(darkObsidian[0], darkObsidian[1], darkObsidian[2]);
  doc.text("ITEMIZED FINANCIAL BREAKDOWN", margin, y);

  doc.setDrawColor(220, 220, 225);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);

  y += 7;

  // Table Header
  doc.setFillColor(14, 14, 19);
  doc.rect(margin, y, pageWidth - margin * 2, 7, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("DESCRIPTION", margin + 4, y + 4.8);
  doc.text("RATE / BASIS", pageWidth / 2 + 10, y + 4.8);
  doc.text("AMOUNT (USD)", pageWidth - margin - 4, y + 4.8, { align: "right" });

  y += 7;

  // Helper function for table row
  const drawRow = (desc: string, rate: string, amountCents: number, isAlt: boolean = false) => {
    if (isAlt) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, y, pageWidth - margin * 2, 7, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(charcoalDark[0], charcoalDark[1], charcoalDark[2]);
    doc.text(desc, margin + 4, y + 4.8);
    doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
    doc.text(rate, pageWidth / 2 + 10, y + 4.8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkObsidian[0], darkObsidian[1], darkObsidian[2]);
    doc.text(`$${(amountCents / 100).toFixed(2)}`, pageWidth - margin - 4, y + 4.8, { align: "right" });
    y += 7;
  };

  const pricing = trip.pricing;
  let alt = false;

  if (pricing) {
    // Render dynamic line items (Base fare, Mileage, Airport, Meet & Greet, Tolls, Discounts, etc.)
    if (pricing.lineItems && Array.isArray(pricing.lineItems)) {
      pricing.lineItems.forEach((item) => {
        if (item.amountCents !== 0) {
          drawRow(item.label || item.code, item.detail || "Standard Tariff", item.amountCents, alt);
          alt = !alt;
        }
      });
    }

    // Gratuity
    if (pricing.gratuityCents > 0) {
      drawRow("Chauffeur Executive Gratuity", `${pricing.gratuityPercent || 20}% Included`, pricing.gratuityCents, alt);
      alt = !alt;
    }

    // Tax
    if (pricing.taxCents > 0) {
      drawRow("Regulatory State & Municipal Tax", "Sales & Livery Tax", pricing.taxCents, alt);
      alt = !alt;
    }
  }

  // Total Summary Box
  y += 2;
  doc.setFillColor(14, 14, 19);
  doc.roundedRect(pageWidth / 2 - 10, y, (pageWidth - margin * 2) / 2 + 10 + margin, 18, 2, 2, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(200, 200, 200);
  doc.text("TOTAL AMOUNT INVOICED:", pageWidth / 2, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(goldPrimary[0], goldPrimary[1], goldPrimary[2]);
  doc.text(`$${((pricing?.totalCents || 0) / 100).toFixed(2)} USD`, pageWidth - margin - 4, y + 12, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(180, 180, 180);
  doc.text(`Payment Status: ${trip.paymentStatus ? trip.paymentStatus.toUpperCase() : "PAID"}`, pageWidth / 2, y + 14);

  y += 28;

  // 5. Legal & Corporate Tax Footnote
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
  doc.text("TAX & COMPLIANCE INFORMATION:", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("LUXE Chauffeured Mobility LLC • EIN: 84-1928492 • CA CPUC Carrier Permit: TCP-0038192-A", margin, y + 4);
  doc.text("All journeys include $5,000,000 commercial liability coverage. Inquiries: concierge@luxe.com • +1 (800) 555-0199", margin, y + 8);

  // Footer Gold Bar
  doc.setFillColor(goldPrimary[0], goldPrimary[1], goldPrimary[2]);
  doc.rect(0, pageHeight - 3, pageWidth, 3, "F");

  // Output filename: LUXE-Invoice-CONF123.pdf
  const filename = `LUXE-Invoice-${trip.confirmationCode || trip.reservationId.slice(-8)}.pdf`;
  doc.save(filename);
}
