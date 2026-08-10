"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("../index");
function createMockTimestamp(dateStr) {
    return {
        toDate: () => new Date(dateStr)
    };
}
const baseRuleSet = {
    ruleSetId: "v1",
    version: 1,
    effectiveFrom: createMockTimestamp("2020-01-01T00:00:00Z"),
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
const baseInput = {
    tripType: "point_to_point",
    pickupAt: createMockTimestamp("2024-06-15T14:00:00Z"), // 10am NY
    timezone: "America/New_York",
    classId: "sedan",
    estimatedDistanceMiles: 10, // base 50 + 30 + 30 = 110
    estimatedDurationMinutes: 30,
    hours: null,
    airportCode: null,
    airportZoneId: null,
    extraStopCount: 0,
    meetAndGreet: false,
    childSeatCount: 0,
    waitMinutes: 0,
    tollsCents: 0,
    parkingCents: 0,
    outOfAreaMiles: 0,
};
(0, vitest_1.describe)("Pricing Engine", () => {
    (0, vitest_1.it)("computes point-to-point standard fare", () => {
        // 50 + (10 * 3) + (30 * 1) = $110.00 = 11000 cents
        const res = (0, index_1.calculatePrice)(baseInput, baseRuleSet, new Date());
        (0, vitest_1.expect)(res.subtotalCents).toBe(11000);
        (0, vitest_1.expect)(res.gratuityCents).toBe(2200); // 20%
        (0, vitest_1.expect)(res.totalCents).toBe(13200);
    });
    (0, vitest_1.it)("enforces minimum fare for point-to-point", () => {
        // 50 + (1*3) + (1*1) = $54 < $80 min
        const minInput = { ...baseInput, estimatedDistanceMiles: 1, estimatedDurationMinutes: 1 };
        const res = (0, index_1.calculatePrice)(minInput, baseRuleSet, new Date());
        (0, vitest_1.expect)(res.subtotalCents).toBe(8000);
    });
    (0, vitest_1.it)("computes hourly standard fare", () => {
        const hourlyInput = { ...baseInput, tripType: "hourly", hours: 3 };
        const res = (0, index_1.calculatePrice)(hourlyInput, baseRuleSet, new Date());
        // 3 hours @ 90 = 27000
        (0, vitest_1.expect)(res.subtotalCents).toBe(27000);
    });
    (0, vitest_1.it)("enforces hourly minimum hours", () => {
        const hourlyInput = { ...baseInput, tripType: "hourly", hours: 1 };
        const res = (0, index_1.calculatePrice)(hourlyInput, baseRuleSet, new Date());
        // 2 hours min @ 90 = 18000
        (0, vitest_1.expect)(res.subtotalCents).toBe(18000);
    });
    const airport = {
        code: "JFK",
        name: "JFK",
        timezone: "America/New_York",
        location: { lat: 0, lng: 0 },
        zones: [{ zoneId: "manhattan", name: "Manhattan", flatRates: { "sedan": { arrivalCents: 15000, departureCents: 13000 } } }],
        meetGreetFeeCents: 3500,
        freeWaitMinutesArrival: 45
    };
    (0, vitest_1.it)("computes airport zone flat rate (arrival)", () => {
        const ai = { ...baseInput, tripType: "airport_arrival", airportCode: "JFK", airportZoneId: "manhattan" };
        const res = (0, index_1.calculatePrice)(ai, baseRuleSet, new Date(), airport);
        (0, vitest_1.expect)(res.subtotalCents).toBe(15000);
    });
    (0, vitest_1.it)("computes airport zone flat rate (departure)", () => {
        const ai = { ...baseInput, tripType: "airport_departure", airportCode: "JFK", airportZoneId: "manhattan" };
        const res = (0, index_1.calculatePrice)(ai, baseRuleSet, new Date(), airport);
        (0, vitest_1.expect)(res.subtotalCents).toBe(13000);
    });
    (0, vitest_1.it)("falls back to point_to_point for airport miss", () => {
        const ai = { ...baseInput, tripType: "airport_arrival", airportCode: "JFK", airportZoneId: "unknown" };
        const res = (0, index_1.calculatePrice)(ai, baseRuleSet, new Date(), airport);
        (0, vitest_1.expect)(res.subtotalCents).toBe(11000); // standard $110
    });
    (0, vitest_1.it)("adds extra stops surcharge", () => {
        const ai = { ...baseInput, extraStopCount: 2 }; // 2 * $20
        const res = (0, index_1.calculatePrice)(ai, baseRuleSet, new Date());
        (0, vitest_1.expect)(res.subtotalCents).toBe(15000);
    });
    (0, vitest_1.it)("adds meet & greet", () => {
        const ai = { ...baseInput, meetAndGreet: true };
        const res = (0, index_1.calculatePrice)(ai, baseRuleSet, new Date());
        (0, vitest_1.expect)(res.subtotalCents).toBe(14500); // 110 + 35
    });
    (0, vitest_1.it)("adds child seats", () => {
        const ai = { ...baseInput, childSeatCount: 3 }; // 3 * $15 = 45
        const res = (0, index_1.calculatePrice)(ai, baseRuleSet, new Date());
        (0, vitest_1.expect)(res.subtotalCents).toBe(15500); // 110 + 45
    });
    (0, vitest_1.it)("does not charge wait time under grace", () => {
        const ai = { ...baseInput, waitMinutes: 14 }; // 15 grace
        const res = (0, index_1.calculatePrice)(ai, baseRuleSet, new Date());
        (0, vitest_1.expect)(res.subtotalCents).toBe(11000);
    });
    (0, vitest_1.it)("does not charge wait time at exact grace boundary", () => {
        const ai = { ...baseInput, waitMinutes: 15 }; // 15 grace
        const res = (0, index_1.calculatePrice)(ai, baseRuleSet, new Date());
        (0, vitest_1.expect)(res.subtotalCents).toBe(11000);
    });
    (0, vitest_1.it)("rounds up wait time to next increment (+1 min over)", () => {
        // 16 min - 15 grace = 1 min billable. increment=15 -> 15 min billed -> $15
        const ai = { ...baseInput, waitMinutes: 16 };
        const res = (0, index_1.calculatePrice)(ai, baseRuleSet, new Date());
        (0, vitest_1.expect)(res.subtotalCents).toBe(12500); // 11000 + 1500
    });
    (0, vitest_1.it)("handles wait time exactly hitting increment", () => {
        // 30 min - 15 = 15 billable -> 1 increment -> $15
        const ai = { ...baseInput, waitMinutes: 30 };
        const res = (0, index_1.calculatePrice)(ai, baseRuleSet, new Date());
        (0, vitest_1.expect)(res.subtotalCents).toBe(12500);
    });
    (0, vitest_1.it)("handles wait time requiring 2 increments", () => {
        // 31 min - 15 = 16 billable -> 2 increments (30 min) -> $30
        const ai = { ...baseInput, waitMinutes: 31 };
        const res = (0, index_1.calculatePrice)(ai, baseRuleSet, new Date());
        (0, vitest_1.expect)(res.subtotalCents).toBe(14000);
    });
    (0, vitest_1.it)("uses longer airport grace period", () => {
        const ai = { ...baseInput, tripType: "airport_arrival", waitMinutes: 45 }; // 45 grace
        const res = (0, index_1.calculatePrice)(ai, baseRuleSet, new Date());
        (0, vitest_1.expect)(res.subtotalCents).toBe(11000); // no charge
    });
    (0, vitest_1.it)("charges airport wait time over grace", () => {
        const ai = { ...baseInput, tripType: "airport_arrival", waitMinutes: 46 };
        const res = (0, index_1.calculatePrice)(ai, baseRuleSet, new Date());
        (0, vitest_1.expect)(res.subtotalCents).toBe(12500); // 1 increment
    });
    (0, vitest_1.it)("adds pass-through tolls and parking", () => {
        const ai = { ...baseInput, tollsCents: 500, parkingCents: 2000 };
        const res = (0, index_1.calculatePrice)(ai, baseRuleSet, new Date());
        (0, vitest_1.expect)(res.subtotalCents).toBe(13500); // 11000 + 500 + 2000
        // Gratuity is on subtotal here: 20% of 13500 = 2700
        (0, vitest_1.expect)(res.gratuityCents).toBe(2700);
    });
    (0, vitest_1.it)("does not apply after-hours during the day", () => {
        // 14:00 UTC = 10:00 AM NY
        const res = (0, index_1.calculatePrice)(baseInput, baseRuleSet, new Date());
        (0, vitest_1.expect)(res.subtotalCents).toBe(11000);
    });
    (0, vitest_1.it)("applies after-hours surcharge spanning midnight (NY 22:00)", () => {
        // 2024-06-16T02:00:00Z = 22:00 NY (June EDT is UTC-4)
        const ai = { ...baseInput, pickupAt: createMockTimestamp("2024-06-16T02:00:00Z") };
        const res = (0, index_1.calculatePrice)(ai, baseRuleSet, new Date());
        (0, vitest_1.expect)(res.subtotalCents).toBe(13500); // 11000 + 2500 flat
    });
    (0, vitest_1.it)("evaluates after-hours differently in LA vs NY", () => {
        // 01:00 UTC = 21:00 NY (no surcharge) but 18:00 LA (no surcharge). Let's pick 04:00 UTC = 00:00 NY (surcharge) = 21:00 LA (no surcharge)
        const ai = { ...baseInput, pickupAt: createMockTimestamp("2024-06-16T04:00:00Z") }; // 00:00 NY
        const resNY = (0, index_1.calculatePrice)(ai, baseRuleSet, new Date());
        (0, vitest_1.expect)(resNY.subtotalCents).toBe(13500); // Surcharge applied
        const aiLA = { ...ai, timezone: "America/Los_Angeles" }; // 21:00 LA
        const resLA = (0, index_1.calculatePrice)(aiLA, baseRuleSet, new Date());
        (0, vitest_1.expect)(resLA.subtotalCents).toBe(11000); // Surcharge NOT applied
    });
    (0, vitest_1.it)("applies after hours when not spanning midnight (e.g. 1 to 5)", () => {
        const customRuleSet = { ...baseRuleSet, surcharges: { ...baseRuleSet.surcharges, afterHours: { enabled: true, startHourLocal: 1, endHourLocal: 5, percent: 0, flatCents: 1000 } } };
        // 07:00 UTC = 03:00 NY (EDT)
        const ai = { ...baseInput, pickupAt: createMockTimestamp("2024-06-16T07:00:00Z") };
        const res = (0, index_1.calculatePrice)(ai, customRuleSet, new Date());
        (0, vitest_1.expect)(res.subtotalCents).toBe(12000);
    });
    (0, vitest_1.it)("applies percentage after hours", () => {
        const customRuleSet = { ...baseRuleSet, surcharges: { ...baseRuleSet.surcharges, afterHours: { enabled: true, startHourLocal: 22, endHourLocal: 6, percent: 10, flatCents: 0 } } };
        const ai = { ...baseInput, pickupAt: createMockTimestamp("2024-06-16T02:00:00Z") }; // 22:00 NY
        const res = (0, index_1.calculatePrice)(ai, customRuleSet, new Date());
        (0, vitest_1.expect)(res.subtotalCents).toBe(12100); // 11000 + 10%
    });
    (0, vitest_1.it)("applies holiday surcharge on the exact local date", () => {
        // Dec 25 NY time
        // 2024-12-25T17:00:00Z = 12:00 PM NY (EST is UTC-5)
        const ai = { ...baseInput, pickupAt: createMockTimestamp("2024-12-25T17:00:00Z") };
        const res = (0, index_1.calculatePrice)(ai, baseRuleSet, new Date());
        (0, vitest_1.expect)(res.subtotalCents).toBe(16000); // 11000 + 5000
    });
    (0, vitest_1.it)("applies holiday percent and flat", () => {
        const ruleSet = { ...baseRuleSet, surcharges: { ...baseRuleSet.surcharges, holidays: [{ date: "12-25", name: "Xmas", percent: 10, flatCents: 1000 }] } };
        const ai = { ...baseInput, pickupAt: createMockTimestamp("2024-12-25T17:00:00Z") };
        const res = (0, index_1.calculatePrice)(ai, ruleSet, new Date());
        // 11000 + 1000 + 1100 (10% of 11000) = 13100
        (0, vitest_1.expect)(res.subtotalCents).toBe(13100);
    });
    (0, vitest_1.it)("applies out of area surcharge", () => {
        const ai = { ...baseInput, outOfAreaMiles: 10 }; // 10 * 150 = 1500
        const res = (0, index_1.calculatePrice)(ai, baseRuleSet, new Date());
        (0, vitest_1.expect)(res.subtotalCents).toBe(12500); // 11000 + 1500
    });
    (0, vitest_1.it)("applies fuel surcharge", () => {
        const ruleSet = { ...baseRuleSet, surcharges: { ...baseRuleSet.surcharges, fuelPercent: 5, fuelFlatCents: 100 } };
        const res = (0, index_1.calculatePrice)(baseInput, ruleSet, new Date());
        // subtotal = 11000. fuel = 100 + 5% of 11000 (550) = 650. final = 11650
        (0, vitest_1.expect)(res.subtotalCents).toBe(11650);
    });
    (0, vitest_1.it)("calculates gratuity on base only", () => {
        const ruleSet = { ...baseRuleSet, gratuity: { autoAdd: true, percent: 20, editableByRider: true, appliesTo: "base_only" } };
        // Add extra stops so subtotal > base
        const ai = { ...baseInput, extraStopCount: 2 }; // base 110, subtotal 150
        const res = (0, index_1.calculatePrice)(ai, ruleSet, new Date());
        (0, vitest_1.expect)(res.subtotalCents).toBe(15000);
        (0, vitest_1.expect)(res.gratuityCents).toBe(2200); // 20% of 11000
        (0, vitest_1.expect)(res.totalCents).toBe(17200);
    });
    (0, vitest_1.it)("calculates tax on subtotal", () => {
        const ruleSet = { ...baseRuleSet, taxPercent: 10 };
        const res = (0, index_1.calculatePrice)(baseInput, ruleSet, new Date());
        // subtotal 110, grat 22, tax 11 = 143
        (0, vitest_1.expect)(res.taxCents).toBe(1100);
        (0, vitest_1.expect)(res.totalCents).toBe(14300);
    });
    (0, vitest_1.it)("returns zero and negative guards correctly", () => {
        // If a discount line item makes subtotal negative, what happens?
        // Engine only ever ADDS based on positive math, but percent could theoretically be -10.
        // Spec says amounts can be negative (discounts).
        // Let's test a case where gratuity is 0.
        const ruleSet = { ...baseRuleSet, gratuity: { autoAdd: false, percent: 0, editableByRider: false, appliesTo: "subtotal" } };
        const res = (0, index_1.calculatePrice)(baseInput, ruleSet, new Date());
        (0, vitest_1.expect)(res.gratuityCents).toBe(0);
        (0, vitest_1.expect)(res.totalCents).toBe(11000);
    });
    (0, vitest_1.it)("throws on missing classId", () => {
        const ai = { ...baseInput, classId: "unknown" };
        (0, vitest_1.expect)(() => (0, index_1.calculatePrice)(ai, baseRuleSet, new Date())).toThrow("Missing class rates");
    });
});
//# sourceMappingURL=pricing.test.js.map