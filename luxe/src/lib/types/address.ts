import { z } from "zod";

export const addressSchema = z.object({
  formatted: z.string(),
  placeId: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
  line1: z.string().nullable(),
  line2: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  airportCode: z.string().nullable(),
  notes: z.string().nullable(),
});

export type Address = z.infer<typeof addressSchema>;
