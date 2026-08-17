import { describe, it, expect } from "vitest";
import { PriceBreakdown } from "@/lib/types/pricing";

export function calculateInvoiceTotals(pricing: PriceBreakdown) {
  const lineItemsSum = pricing.lineItems.reduce((acc, item) => acc + item.amountCents, 0);
  const calculatedTotal = lineItemsSum + (pricing.gratuityCents || 0) + (pricing.taxCents || 0);
  return {
    lineItemsSum,
    calculatedTotal,
    matchesTotal: calculatedTotal === pricing.totalCents,
  };
}

describe("Executive PDF Invoicing & Tariff Breakdown — Smoke Tests", () => {
  it("Smoke Test 1: Verifies line item financial totals match final reservation total", () => {
    const mockPricing: PriceBreakdown = {
      currency: "usd",
      subtotalCents: 20000,
      gratuityCents: 4400,
      gratuityPercent: 20,
      gratuityEditable: true,
      taxCents: 100,
      totalCents: 24500,
      estimatedTotalCents: 24500,
      isFinal: true,
      lineItems: [
        { code: "base_fare", label: "Executive SUV Base Rate", amountCents: 18500, detail: null },
        { code: "mileage", label: "Estimated Mileage (18.4 mi)", amountCents: 1500, detail: null },
      ]
    };

    const res = calculateInvoiceTotals(mockPricing);
    expect(res.calculatedTotal).toBe(24500);
    expect(res.matchesTotal).toBe(true);
  });

  it("Smoke Test 2: Handles zero-tax and custom corporate discount line items", () => {
    const mockPricing: PriceBreakdown = {
      currency: "usd",
      subtotalCents: 27000,
      gratuityCents: 5400,
      gratuityPercent: 20,
      gratuityEditable: false,
      taxCents: 0,
      totalCents: 32400,
      estimatedTotalCents: 32400,
      isFinal: true,
      lineItems: [
        { code: "base_fare", label: "First Class Sedan Base Rate", amountCents: 30000, detail: null },
        { code: "corp_discount", label: "Corporate Volume Discount (-10%)", amountCents: -3000, detail: null },
      ]
    };

    const res = calculateInvoiceTotals(mockPricing);
    expect(res.calculatedTotal).toBe(32400);
    expect(res.matchesTotal).toBe(true);
  });
});
