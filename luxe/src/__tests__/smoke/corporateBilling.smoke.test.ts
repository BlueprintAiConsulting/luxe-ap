import { describe, it, expect } from "vitest";
import { generateCorporateInvoiceHtml, CorporateInvoice } from "../../../functions/src/crons/corporateBilling";

describe("Corporate B2B Account Billing & Monthly Invoicing Smoke Tests", () => {
  it("should generate a complete consolidated corporate statement with volume discounts", () => {
    const mockInvoice: CorporateInvoice = {
      invoiceId: "corp_inv_wb_2026-07-01",
      invoiceNumber: "INV-JUL-2026-WARNER",
      accountId: "acc_warner_bros",
      companyName: "Warner Bros. Entertainment",
      billingContactName: "Executive Travel Desk",
      billingEmail: "travel.billing@warnerbros.example.com",
      billingPeriodStart: "2026-07-01",
      billingPeriodEnd: "2026-07-31",
      dueDate: "2026-08-30",
      totalChartersCount: 2,
      subtotalCents: 50000, // $500 base
      totalDiscountCents: 5000, // 10% volume discount = $50 off
      totalGratuityCents: 10000, // $100 (20%)
      totalTollsAndParkingCents: 3500, // $35
      totalDueCents: 58500, // ($500 - $50) + $100 + $35 = $585.00
      status: "sent",
      paymentTerms: "net_30",
      lineItems: [
        {
          reservationId: "res_wb_001",
          confirmationCode: "BCC-WB101",
          riderName: "Sarah Jenkins (Director)",
          serviceDate: "2026-07-12",
          route: "Burbank Studios -> LAX Bradley",
          vehicleClass: "Luxury SUV",
          baseFareCents: 25000,
          discountCents: 2500,
          gratuityCents: 5000,
          tollsAndParkingCents: 1500,
          netAmountCents: 29000,
        },
        {
          reservationId: "res_wb_002",
          confirmationCode: "BCC-WB102",
          riderName: "David Miller (VP Production)",
          serviceDate: "2026-07-24",
          route: "LAX -> Four Seasons Beverly Hills",
          vehicleClass: "Luxury Sedan",
          baseFareCents: 25000,
          discountCents: 2500,
          gratuityCents: 5000,
          tollsAndParkingCents: 2000,
          netAmountCents: 29500,
        },
      ],
      createdAt: new Date(),
    };

    const html = generateCorporateInvoiceHtml(mockInvoice);

    // Assertions
    expect(html).toContain("LUXE");
    expect(html).toContain("Warner Bros. Entertainment");
    expect(html).toContain("INV-JUL-2026-WARNER");
    expect(html).toContain("NET 30");
    expect(html).toContain("$585.00"); // Total Balance Due
    expect(html).toContain("-$50.00"); // Corporate Volume Discount
    expect(html).toContain("$100.00"); // Gratuity
    expect(html).toContain("Burbank Studios -> LAX Bradley");
    expect(html).toContain("Sarah Jenkins (Director)");
    expect(html).toContain("David Miller (VP Production)");
  });
});
