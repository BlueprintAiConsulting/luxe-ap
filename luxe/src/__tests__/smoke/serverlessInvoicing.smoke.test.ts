import { describe, it, expect } from "vitest";
import { generateExecutiveInvoiceHtml } from "../../../functions/src/api/invoice";
import { Reservation } from "../../lib/types";

describe("Serverless Executive Invoice & Receipt Smoke Tests", () => {
  it("should generate a complete, executive-formatted HTML receipt with itemized line items", () => {
    const mockTrip: Partial<Reservation> = {
      reservationId: "res_mock_12345",
      confirmationCode: "BCC-K8L9M2",
      riderName: "Rachel Vance",
      riderEmail: "rachel.vance@example.com",
      driverName: "Marcus Bennett",
      vehicleDescription: "2024 Cadillac Escalade ESV (LUXE-002)",
      tripType: "point_to_point",
      className: "Luxury SUV",
      status: "completed",
      pickupAt: "2026-08-18T19:00:00.000Z" as any,
      pickup: { formatted: "The Beverly Hills Hotel, 9641 Sunset Blvd, Beverly Hills, CA" } as any,
      dropoff: { formatted: "LAX Bradley International Terminal, Los Angeles, CA" } as any,
      flightNumber: "DL 1420",
      squarePaymentId: "sq_pay_999888777",
      squareCardBrand: "VISA",
      squareCardLast4: "4242",
      squareReceiptUrl: "https://squareup.com/receipt/preview/sq_pay_999888777",
      tollsCents: 1200,
      parkingCents: 1800,
      pricing: {
        currency: "usd",
        subtotalCents: 20000,
        gratuityCents: 4000,
        gratuityPercent: 20,
        gratuityEditable: false,
        taxCents: 1500,
        totalCents: 28500,
        estimatedTotalCents: 28500,
        lineItems: [],
        isFinal: true,
      },
    };

    const html = generateExecutiveInvoiceHtml(mockTrip as Reservation);

    // Verify key brand and data elements
    expect(html).toContain("LUXE");
    expect(html).toContain("CONFIRMATION #BCC-K8L9M2");
    expect(html).toContain("Rachel Vance");
    expect(html).toContain("Marcus Bennett");
    expect(html).toContain("Cadillac Escalade ESV");
    expect(html).toContain("The Beverly Hills Hotel");
    expect(html).toContain("LAX Bradley International Terminal");
    expect(html).toContain("DL 1420");
    expect(html).toContain("$285.00"); // Total
    expect(html).toContain("$40.00");  // Gratuity
    expect(html).toContain("$12.00");  // Tolls
    expect(html).toContain("$18.00");  // Parking
    expect(html).toContain("Square PCI-DSS Verified (VISA •••• 4242)");
    expect(html).toContain("https://squareup.com/receipt/preview/sq_pay_999888777");
    expect(html).toContain("Tax ID / EIN: 84-1928492");
  });
});
