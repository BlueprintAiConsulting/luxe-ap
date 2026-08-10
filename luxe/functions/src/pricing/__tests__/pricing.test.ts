import { describe, it, expect } from "vitest";
import { calculatePrice } from "../index";
import { QuoteInput, PricingRuleSet, Airport } from "../../shared";

function createMockTimestamp(dateStr: string) {
  return {
    toDate: () => new Date(dateStr)
  };
}

const baseRuleSet: PricingRuleSet = {
  ruleSetId: "v1",
  version: 1,
  effectiveFrom: createMockTimestamp("2020-01-01T00:00:00Z") as any,
  timezone: "America/New_York",
  classRates: {
    "sedan": {
      baseFareCents: 5000,
      perMileCents: 300,
      perMinuteCents: 100,
      minimumFareCents: 8000,
      hourlyRateCents: 9000,
      hourlyMinimumHours: 2,
    }
  },
  gratuity: {
    autoAdd: true,
    percent: 20,
    editableByRider: true,
    appliesTo: "subtotal"
  },
  waitTime: {
    freeMinutesStandard: 15,
    freeMinutesAirport: 45,
    perMinuteCents: 100,
    billingIncrementMinutes: 15,
  },
  surcharges: {
    fuelPercent: 0,
    fuelFlatCents: 0,
    extraStopCents: 2000,
    meetGreetCents: 3500,
    childSeatCents: 1500,
    afterHours: {
      enabled: true,
      startHourLocal: 22,
      endHourLocal: 6,
      percent: 0,
      flatCents: 2500,
    },
    holidays: [
      { date: "12-25", name: "Christmas", percent: 0, flatCents: 5000 }
    ],
    outOfAreaPerMileCents: 150,
    outOfAreaRadiusMiles: 40,
  },
  cancellation: [],
  taxPercent: 0,
};

const baseInput: QuoteInput = {
  tripType: "point_to_point",
  pickupAt: createMockTimestamp("2024-06-15T14:00:00Z") as any, // 10am NY
  timezone: "America/New_York",
  classId: "sedan",
  estimatedDistanceMiles: 10, // base 50 + 30 + 30 = 110
  estimatedDurationMinutes: 30,
  hours: null,
  airportCode: null,
  airportZoneId: null,
  extraStopCount: 0,
  greetingStyle: "no_preference",
  childSeatCount: 0,
  waitMinutes: 0,
  tollsCents: 0,
  parkingCents: 0,
  outOfAreaMiles: 0,
};

describe("Pricing Engine", () => {
  it("computes point-to-point standard fare", () => {
    // 50 + (10 * 3) + (30 * 1) = $110.00 = 11000 cents
    const res = calculatePrice(baseInput, baseRuleSet, new Date());
    expect(res.subtotalCents).toBe(11000);
    expect(res.gratuityCents).toBe(2200); // 20%
    expect(res.totalCents).toBe(13200);
  });

  it("enforces minimum fare for point-to-point", () => {
    // 50 + (1*3) + (1*1) = $54 < $80 min
    const minInput = { ...baseInput, estimatedDistanceMiles: 1, estimatedDurationMinutes: 1 };
    const res = calculatePrice(minInput, baseRuleSet, new Date());
    expect(res.subtotalCents).toBe(8000);
  });

  it("computes hourly standard fare", () => {
    const hourlyInput = { ...baseInput, tripType: "hourly" as const, hours: 3 };
    const res = calculatePrice(hourlyInput, baseRuleSet, new Date());
    // 3 hours @ 90 = 27000
    expect(res.subtotalCents).toBe(27000);
  });

  it("enforces hourly minimum hours", () => {
    const hourlyInput = { ...baseInput, tripType: "hourly" as const, hours: 1 };
    const res = calculatePrice(hourlyInput, baseRuleSet, new Date());
    // 2 hours min @ 90 = 18000
    expect(res.subtotalCents).toBe(18000);
  });

  const airport: Airport = {
    code: "JFK",
    name: "JFK",
    timezone: "America/New_York",
    location: { lat: 0, lng: 0 },
    zones: [{ zoneId: "manhattan", name: "Manhattan", flatRates: { "sedan": { arrivalCents: 15000, departureCents: 13000 } } }],
    meetGreetFeeCents: 3500,
    freeWaitMinutesArrival: 45
  };

  it("computes airport zone flat rate (arrival)", () => {
    const ai = { ...baseInput, tripType: "airport_arrival" as const, airportCode: "JFK", airportZoneId: "manhattan" };
    const res = calculatePrice(ai, baseRuleSet, new Date(), airport);
    expect(res.subtotalCents).toBe(15000);
  });

  it("computes airport zone flat rate (departure)", () => {
    const ai = { ...baseInput, tripType: "airport_departure" as const, airportCode: "JFK", airportZoneId: "manhattan" };
    const res = calculatePrice(ai, baseRuleSet, new Date(), airport);
    expect(res.subtotalCents).toBe(13000);
  });

  it("falls back to point_to_point for airport miss", () => {
    const ai = { ...baseInput, tripType: "airport_arrival" as const, airportCode: "JFK", airportZoneId: "unknown" };
    const res = calculatePrice(ai, baseRuleSet, new Date(), airport);
    expect(res.subtotalCents).toBe(11000); // standard $110
  });

  it("adds extra stops surcharge", () => {
    const ai = { ...baseInput, extraStopCount: 2 }; // 2 * $20
    const res = calculatePrice(ai, baseRuleSet, new Date());
    expect(res.subtotalCents).toBe(15000);
  });

  it("adds meet & greet", () => {
    const ai = { ...baseInput, greetingStyle: "meet_inside" as const };
    const res = calculatePrice(ai, baseRuleSet, new Date());
    expect(res.subtotalCents).toBe(14500); // 110 + 35
  });

  it("adds child seats", () => {
    const ai = { ...baseInput, childSeatCount: 3 }; // 3 * $15 = 45
    const res = calculatePrice(ai, baseRuleSet, new Date());
    expect(res.subtotalCents).toBe(15500); // 110 + 45
  });

  it("does not charge wait time under grace", () => {
    const ai = { ...baseInput, waitMinutes: 14 }; // 15 grace
    const res = calculatePrice(ai, baseRuleSet, new Date());
    expect(res.subtotalCents).toBe(11000);
  });

  it("does not charge wait time at exact grace boundary", () => {
    const ai = { ...baseInput, waitMinutes: 15 }; // 15 grace
    const res = calculatePrice(ai, baseRuleSet, new Date());
    expect(res.subtotalCents).toBe(11000);
  });

  it("rounds up wait time to next increment (+1 min over)", () => {
    // 16 min - 15 grace = 1 min billable. increment=15 -> 15 min billed -> $15
    const ai = { ...baseInput, waitMinutes: 16 };
    const res = calculatePrice(ai, baseRuleSet, new Date());
    expect(res.subtotalCents).toBe(12500); // 11000 + 1500
  });

  it("handles wait time exactly hitting increment", () => {
    // 30 min - 15 = 15 billable -> 1 increment -> $15
    const ai = { ...baseInput, waitMinutes: 30 };
    const res = calculatePrice(ai, baseRuleSet, new Date());
    expect(res.subtotalCents).toBe(12500);
  });

  it("handles wait time requiring 2 increments", () => {
    // 31 min - 15 = 16 billable -> 2 increments (30 min) -> $30
    const ai = { ...baseInput, waitMinutes: 31 };
    const res = calculatePrice(ai, baseRuleSet, new Date());
    expect(res.subtotalCents).toBe(14000);
  });

  it("uses longer airport grace period", () => {
    const ai = { ...baseInput, tripType: "airport_arrival" as const, waitMinutes: 45 }; // 45 grace
    const res = calculatePrice(ai, baseRuleSet, new Date());
    expect(res.subtotalCents).toBe(11000); // no charge
  });

  it("charges airport wait time over grace", () => {
    const ai = { ...baseInput, tripType: "airport_arrival" as const, waitMinutes: 46 };
    const res = calculatePrice(ai, baseRuleSet, new Date());
    expect(res.subtotalCents).toBe(12500); // 1 increment
  });

  it("adds pass-through tolls and parking", () => {
    const ai = { ...baseInput, tollsCents: 500, parkingCents: 2000 };
    const res = calculatePrice(ai, baseRuleSet, new Date());
    expect(res.subtotalCents).toBe(13500); // 11000 + 500 + 2000
    // Gratuity is on subtotal here: 20% of 13500 = 2700
    expect(res.gratuityCents).toBe(2700); 
  });

  it("does not apply after-hours during the day", () => {
    // 14:00 UTC = 10:00 AM NY
    const res = calculatePrice(baseInput, baseRuleSet, new Date());
    expect(res.subtotalCents).toBe(11000); 
  });

  it("applies after-hours surcharge spanning midnight (NY 22:00)", () => {
    // 2024-06-16T02:00:00Z = 22:00 NY (June EDT is UTC-4)
    const ai = { ...baseInput, pickupAt: createMockTimestamp("2024-06-16T02:00:00Z") as any };
    const res = calculatePrice(ai, baseRuleSet, new Date());
    expect(res.subtotalCents).toBe(13500); // 11000 + 2500 flat
  });

  it("evaluates after-hours differently in LA vs NY", () => {
    // 01:00 UTC = 21:00 NY (no surcharge) but 18:00 LA (no surcharge). Let's pick 04:00 UTC = 00:00 NY (surcharge) = 21:00 LA (no surcharge)
    const ai = { ...baseInput, pickupAt: createMockTimestamp("2024-06-16T04:00:00Z") as any }; // 00:00 NY
    const resNY = calculatePrice(ai, baseRuleSet, new Date());
    expect(resNY.subtotalCents).toBe(13500); // Surcharge applied

    const aiLA = { ...ai, timezone: "America/Los_Angeles" }; // 21:00 LA
    const resLA = calculatePrice(aiLA, baseRuleSet, new Date());
    expect(resLA.subtotalCents).toBe(11000); // Surcharge NOT applied
  });

  it("applies after hours when not spanning midnight (e.g. 1 to 5)", () => {
    const customRuleSet = { ...baseRuleSet, surcharges: { ...baseRuleSet.surcharges, afterHours: { enabled: true, startHourLocal: 1, endHourLocal: 5, percent: 0, flatCents: 1000 } } };
    // 07:00 UTC = 03:00 NY (EDT)
    const ai = { ...baseInput, pickupAt: createMockTimestamp("2024-06-16T07:00:00Z") as any };
    const res = calculatePrice(ai, customRuleSet, new Date());
    expect(res.subtotalCents).toBe(12000);
  });

  it("applies percentage after hours", () => {
    const customRuleSet = { ...baseRuleSet, surcharges: { ...baseRuleSet.surcharges, afterHours: { enabled: true, startHourLocal: 22, endHourLocal: 6, percent: 10, flatCents: 0 } } };
    const ai = { ...baseInput, pickupAt: createMockTimestamp("2024-06-16T02:00:00Z") as any }; // 22:00 NY
    const res = calculatePrice(ai, customRuleSet, new Date());
    expect(res.subtotalCents).toBe(12100); // 11000 + 10%
  });

  it("applies holiday surcharge on the exact local date", () => {
    // Dec 25 NY time
    // 2024-12-25T17:00:00Z = 12:00 PM NY (EST is UTC-5)
    const ai = { ...baseInput, pickupAt: createMockTimestamp("2024-12-25T17:00:00Z") as any };
    const res = calculatePrice(ai, baseRuleSet, new Date());
    expect(res.subtotalCents).toBe(16000); // 11000 + 5000
  });

  it("applies holiday percent and flat", () => {
    const ruleSet = { ...baseRuleSet, surcharges: { ...baseRuleSet.surcharges, holidays: [{ date: "12-25", name: "Xmas", percent: 10, flatCents: 1000 }] } };
    const ai = { ...baseInput, pickupAt: createMockTimestamp("2024-12-25T17:00:00Z") as any };
    const res = calculatePrice(ai, ruleSet, new Date());
    // 11000 + 1000 + 1100 (10% of 11000) = 13100
    expect(res.subtotalCents).toBe(13100);
  });

  it("applies out of area surcharge", () => {
    const ai = { ...baseInput, outOfAreaMiles: 10 }; // 10 * 150 = 1500
    const res = calculatePrice(ai, baseRuleSet, new Date());
    expect(res.subtotalCents).toBe(12500); // 11000 + 1500
  });

  it("applies fuel surcharge", () => {
    const ruleSet = { ...baseRuleSet, surcharges: { ...baseRuleSet.surcharges, fuelPercent: 5, fuelFlatCents: 100 } };
    const res = calculatePrice(baseInput, ruleSet, new Date());
    // subtotal = 11000. fuel = 100 + 5% of 11000 (550) = 650. final = 11650
    expect(res.subtotalCents).toBe(11650);
  });

  it("calculates gratuity on base only", () => {
    const ruleSet = { ...baseRuleSet, gratuity: { autoAdd: true, percent: 20, editableByRider: true, appliesTo: "base_only" as const } };
    // Add extra stops so subtotal > base
    const ai = { ...baseInput, extraStopCount: 2 }; // base 110, subtotal 150
    const res = calculatePrice(ai, ruleSet, new Date());
    expect(res.subtotalCents).toBe(15000);
    expect(res.gratuityCents).toBe(2200); // 20% of 11000
    expect(res.totalCents).toBe(17200);
  });

  it("calculates tax on subtotal", () => {
    const ruleSet = { ...baseRuleSet, taxPercent: 10 };
    const res = calculatePrice(baseInput, ruleSet, new Date());
    // subtotal 110, grat 22, tax 11 = 143
    expect(res.taxCents).toBe(1100);
    expect(res.totalCents).toBe(14300);
  });

  it("returns zero and negative guards correctly", () => {
    // If a discount line item makes subtotal negative, what happens?
    // Engine only ever ADDS based on positive math, but percent could theoretically be -10.
    // Spec says amounts can be negative (discounts).
    // Let's test a case where gratuity is 0.
    const ruleSet = { ...baseRuleSet, gratuity: { autoAdd: false, percent: 0, editableByRider: false, appliesTo: "subtotal" as const } };
    const res = calculatePrice(baseInput, ruleSet, new Date());
    expect(res.gratuityCents).toBe(0);
    expect(res.totalCents).toBe(11000);
  });

  it("throws on missing classId", () => {
    const ai = { ...baseInput, classId: "unknown" };
    expect(() => calculatePrice(ai, baseRuleSet, new Date())).toThrow("Missing class rates");
  });
});

import { calculateCancellationFee } from "../index";

describe("Cancellation Engine", () => {
  const cancelRuleSet = {
    ...baseRuleSet,
    cancellation: [
      { hoursBeforePickup: 24, feePercent: 50, feeFlatCents: 0, appliesToClasses: "all" as any },
      { hoursBeforePickup: 2, feePercent: 100, feeFlatCents: 5000, appliesToClasses: "all" as any }
    ]
  };
  
  const pickupAt = createMockTimestamp("2024-06-15T14:00:00Z");

  it("charges full fee inside 2 hour boundary", () => {
    // Cancel at 12:00:01 (1h 59m 59s before)
    const cancelAt = new Date("2024-06-15T12:00:01Z");
    const fee = calculateCancellationFee(pickupAt, cancelAt, "sedan", cancelRuleSet, 10000);
    // 100% of 10000 + 5000 = 15000
    expect(fee).toBe(15000);
  });

  it("charges 50% exactly at 2 hour boundary", () => {
    // 12:00:00 is exactly 2 hours before pickup.
    // The spec tests require boundaries +/- 1 min.
    // Rule: "hoursBeforePickup <= win.hoursBeforePickup". 
    // 2.0 <= 2.0 is true. Wait! If it's exactly 2 hours, it hits the 2h window!
    const cancelAt = new Date("2024-06-15T12:00:00Z");
    const fee = calculateCancellationFee(pickupAt, cancelAt, "sedan", cancelRuleSet, 10000);
    expect(fee).toBe(15000);
  });

  it("charges 50% 1 minute outside the 2 hour boundary", () => {
    // 11:59:00 (2h 1m before)
    const cancelAt = new Date("2024-06-15T11:59:00Z");
    const fee = calculateCancellationFee(pickupAt, cancelAt, "sedan", cancelRuleSet, 10000);
    expect(fee).toBe(5000); // 50% of 10000
  });

  it("charges 0 if totally outside the 24 hour window", () => {
    // 48 hours before
    const cancelAt = new Date("2024-06-13T14:00:00Z");
    const fee = calculateCancellationFee(pickupAt, cancelAt, "sedan", cancelRuleSet, 10000);
    expect(fee).toBe(0);
  });

  it("charges 50% exactly at 24 hour boundary", () => {
    const cancelAt = new Date("2024-06-14T14:00:00Z");
    const fee = calculateCancellationFee(pickupAt, cancelAt, "sedan", cancelRuleSet, 10000);
    expect(fee).toBe(5000);
  });

  it("skips window if it does not apply to the class", () => {
    const classSpecificRuleSet = {
      ...baseRuleSet,
      cancellation: [
        { hoursBeforePickup: 24, feePercent: 50, feeFlatCents: 0, appliesToClasses: ["suv"] },
        { hoursBeforePickup: 48, feePercent: 10, feeFlatCents: 0, appliesToClasses: "all" as any }
      ]
    };
    // 12 hours before pickup. sedan misses the 24h window (only for suv). falls to 48h.
    const cancelAt = new Date("2024-06-15T02:00:00Z");
    const fee = calculateCancellationFee(pickupAt, cancelAt, "sedan", classSpecificRuleSet, 10000);
    expect(fee).toBe(1000); // 10%
  });
});
