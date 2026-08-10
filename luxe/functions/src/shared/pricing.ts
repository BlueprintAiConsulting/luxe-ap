import { z } from "zod";
import { timestampSchema } from "./timestamp";

export const priceBreakdownSchema = z.object({
  currency: z.literal("usd"),
  lineItems: z.array(
    z.object({
      code: z.string(),
      label: z.string(),
      amountCents: z.number().int(),
      detail: z.string().nullable(),
    })
  ),
  subtotalCents: z.number().int(),
  gratuityCents: z.number().int(),
  gratuityPercent: z.number(),
  gratuityEditable: z.boolean(),
  taxCents: z.number().int(),
  totalCents: z.number().int(),
  estimatedTotalCents: z.number().int(),
  isFinal: z.boolean(),
});

export type PriceBreakdown = z.infer<typeof priceBreakdownSchema>;

export const pricingRuleSetSchema = z.object({
  ruleSetId: z.string(),
  version: z.number().int(),
  effectiveFrom: timestampSchema,
  timezone: z.string(),

  classRates: z.record(
    z.string(),
    z.object({
      baseFareCents: z.number().int(),
      perMileCents: z.number().int(),
      perMinuteCents: z.number().int(),
      minimumFareCents: z.number().int(),
      hourlyRateCents: z.number().int(),
      hourlyMinimumHours: z.number(),
    })
  ),

  gratuity: z.object({
    autoAdd: z.boolean(),
    percent: z.number(),
    editableByRider: z.boolean(),
    appliesTo: z.enum(["subtotal", "base_only"]),
  }),

  waitTime: z.object({
    freeMinutesStandard: z.number(),
    freeMinutesAirport: z.number(),
    perMinuteCents: z.number().int(),
    billingIncrementMinutes: z.number(),
  }),

  surcharges: z.object({
    fuelPercent: z.number(),
    fuelFlatCents: z.number().int(),
    extraStopCents: z.number().int(),
    meetGreetCents: z.number().int(),
    childSeatCents: z.number().int(),
    afterHours: z.object({
      enabled: z.boolean(),
      startHourLocal: z.number(),
      endHourLocal: z.number(),
      percent: z.number(),
      flatCents: z.number().int(),
    }),
    holidays: z.array(
      z.object({
        date: z.string(),
        name: z.string(),
        percent: z.number(),
        flatCents: z.number().int(),
      })
    ),
    outOfAreaPerMileCents: z.number().int(),
    outOfAreaRadiusMiles: z.number(),
  }),

  cancellation: z.array(
    z.object({
      hoursBeforePickup: z.number(),
      feePercent: z.number(),
      feeFlatCents: z.number().int(),
      appliesToClasses: z.union([z.array(z.string()), z.literal("all")]),
    })
  ),

  taxPercent: z.number(),
});

export type PricingRuleSet = z.infer<typeof pricingRuleSetSchema>;

export const quoteInputSchema = z.object({
  tripType: z.enum(["point_to_point", "hourly", "airport_arrival", "airport_departure"]),
  pickupAt: timestampSchema,
  timezone: z.string(),
  classId: z.string(),
  estimatedDistanceMiles: z.number(),
  estimatedDurationMinutes: z.number(),
  hours: z.number().nullable(),
  airportCode: z.string().nullable(),
  airportZoneId: z.string().nullable(),
  extraStopCount: z.number().int(),
  greetingStyle: z.enum(["curbside", "meet_inside", "no_preference"]),
  childSeatCount: z.number().int(),
  waitMinutes: z.number().int().default(0),
  tollsCents: z.number().int().default(0),
  parkingCents: z.number().int().default(0),
  outOfAreaMiles: z.number().default(0),
});

export type QuoteInput = z.infer<typeof quoteInputSchema>;
