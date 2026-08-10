"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quoteInputSchema = exports.pricingRuleSetSchema = exports.priceBreakdownSchema = void 0;
const zod_1 = require("zod");
const timestamp_1 = require("./timestamp");
exports.priceBreakdownSchema = zod_1.z.object({
    currency: zod_1.z.literal("usd"),
    lineItems: zod_1.z.array(zod_1.z.object({
        code: zod_1.z.string(),
        label: zod_1.z.string(),
        amountCents: zod_1.z.number().int(),
        detail: zod_1.z.string().nullable(),
    })),
    subtotalCents: zod_1.z.number().int(),
    gratuityCents: zod_1.z.number().int(),
    gratuityPercent: zod_1.z.number(),
    gratuityEditable: zod_1.z.boolean(),
    taxCents: zod_1.z.number().int(),
    totalCents: zod_1.z.number().int(),
    estimatedTotalCents: zod_1.z.number().int(),
    isFinal: zod_1.z.boolean(),
});
exports.pricingRuleSetSchema = zod_1.z.object({
    ruleSetId: zod_1.z.string(),
    version: zod_1.z.number().int(),
    effectiveFrom: timestamp_1.timestampSchema,
    timezone: zod_1.z.string(),
    classRates: zod_1.z.record(zod_1.z.string(), zod_1.z.object({
        baseFareCents: zod_1.z.number().int(),
        perMileCents: zod_1.z.number().int(),
        perMinuteCents: zod_1.z.number().int(),
        minimumFareCents: zod_1.z.number().int(),
        hourlyRateCents: zod_1.z.number().int(),
        hourlyMinimumHours: zod_1.z.number(),
    })),
    gratuity: zod_1.z.object({
        autoAdd: zod_1.z.boolean(),
        percent: zod_1.z.number(),
        editableByRider: zod_1.z.boolean(),
        appliesTo: zod_1.z.enum(["subtotal", "base_only"]),
    }),
    waitTime: zod_1.z.object({
        freeMinutesStandard: zod_1.z.number(),
        freeMinutesAirport: zod_1.z.number(),
        perMinuteCents: zod_1.z.number().int(),
        billingIncrementMinutes: zod_1.z.number(),
    }),
    surcharges: zod_1.z.object({
        fuelPercent: zod_1.z.number(),
        fuelFlatCents: zod_1.z.number().int(),
        extraStopCents: zod_1.z.number().int(),
        meetGreetCents: zod_1.z.number().int(),
        childSeatCents: zod_1.z.number().int(),
        afterHours: zod_1.z.object({
            enabled: zod_1.z.boolean(),
            startHourLocal: zod_1.z.number(),
            endHourLocal: zod_1.z.number(),
            percent: zod_1.z.number(),
            flatCents: zod_1.z.number().int(),
        }),
        holidays: zod_1.z.array(zod_1.z.object({
            date: zod_1.z.string(),
            name: zod_1.z.string(),
            percent: zod_1.z.number(),
            flatCents: zod_1.z.number().int(),
        })),
        outOfAreaPerMileCents: zod_1.z.number().int(),
        outOfAreaRadiusMiles: zod_1.z.number(),
    }),
    cancellation: zod_1.z.array(zod_1.z.object({
        hoursBeforePickup: zod_1.z.number(),
        feePercent: zod_1.z.number(),
        feeFlatCents: zod_1.z.number().int(),
        appliesToClasses: zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.literal("all")]),
    })),
    taxPercent: zod_1.z.number(),
});
exports.quoteInputSchema = zod_1.z.object({
    tripType: zod_1.z.enum(["point_to_point", "hourly", "airport_arrival", "airport_departure"]),
    pickupAt: timestamp_1.timestampSchema,
    timezone: zod_1.z.string(),
    classId: zod_1.z.string(),
    estimatedDistanceMiles: zod_1.z.number(),
    estimatedDurationMinutes: zod_1.z.number(),
    hours: zod_1.z.number().nullable(),
    airportCode: zod_1.z.string().nullable(),
    airportZoneId: zod_1.z.string().nullable(),
    extraStopCount: zod_1.z.number().int(),
    greetingStyle: zod_1.z.enum(["curbside", "meet_inside", "no_preference"]),
    childSeatCount: zod_1.z.number().int(),
    waitMinutes: zod_1.z.number().int().default(0),
    tollsCents: zod_1.z.number().int().default(0),
    parkingCents: zod_1.z.number().int().default(0),
    outOfAreaMiles: zod_1.z.number().default(0),
});
//# sourceMappingURL=pricing.js.map