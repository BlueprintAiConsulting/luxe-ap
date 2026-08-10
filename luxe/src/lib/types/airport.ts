import { z } from "zod";

export const airportSchema = z.object({
  code: z.string(),
  name: z.string(),
  timezone: z.string(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  zones: z.array(
    z.object({
      zoneId: z.string(),
      name: z.string(),
      flatRates: z.record(
        z.string(),
        z.object({
          arrivalCents: z.number().int(),
          departureCents: z.number().int(),
        })
      ),
    })
  ),
  meetGreetFeeCents: z.number().int(),
  freeWaitMinutesArrival: z.number(),
});

export type Airport = z.infer<typeof airportSchema>;
