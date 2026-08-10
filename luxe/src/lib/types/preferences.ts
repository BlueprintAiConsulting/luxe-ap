import { z } from "zod";
import { timestampSchema } from "./timestamp";

export const preferenceProfileSchema = z.object({
  beverage: z.object({
    preference: z.enum(["none", "water_still", "water_sparkling", "soda", "coffee", "other", "no_preference"]),
    brand: z.string().nullable(),
    temperature: z.enum(["chilled", "room"]).nullable(),
    notes: z.string().nullable(),
  }),
  conversation: z.enum(["silent", "greeting_only", "chatty", "no_preference"]),
  cabinTempF: z.number().nullable(),
  audio: z.object({
    mode: z.enum(["off", "genre", "station", "my_phone", "no_preference"]),
    value: z.string().nullable(),
    volume: z.enum(["low", "medium", "off"]).nullable(),
  }),
  scent: z.enum(["none", "light", "no_preference"]),
  scentAllergy: z.boolean(),
  chargerType: z.enum(["usb_c", "lightning", "wireless", "none"]),
  reading: z.string().nullable(),
  greeting: z.object({
    style: z.enum(["curbside", "meet_inside", "no_preference"]),
    nameSign: z.boolean(),
    signText: z.string().nullable(),
  }),
  seating: z.object({
    preferredSeat: z.enum(["rear_right", "rear_left", "rear_center", "front"]).nullable(),
    partition: z.enum(["up", "down"]).nullable(),
    shades: z.enum(["up", "down"]).nullable(),
  }),
  accessibility: z.object({
    mobilityAssist: z.boolean(),
    serviceAnimal: z.boolean(),
    notes: z.string().nullable(),
  }),
  childSeats: z.array(
    z.object({
      type: z.enum(["infant", "convertible", "booster"]),
      count: z.number().int(),
    })
  ),
  route: z.object({
    avoidHighways: z.boolean(),
    avoidTolls: z.boolean(),
    preference: z.enum(["fastest", "scenic", "no_preference"]),
  }),
  preferredDriverIds: z.array(z.string()),
  blockedDriverIds: z.array(z.string()),
  medicalNotes: z.string().nullable(),
  freeText: z.string().nullable(),
  updatedAt: timestampSchema,
});

export type PreferenceProfile = z.infer<typeof preferenceProfileSchema>;

export const defaultPreferences: PreferenceProfile = {
  beverage: { preference: "no_preference", brand: null, temperature: null, notes: null },
  conversation: "no_preference",
  cabinTempF: null,
  audio: { mode: "no_preference", value: null, volume: null },
  scent: "no_preference",
  scentAllergy: false,
  chargerType: "none",
  reading: null,
  greeting: { style: "no_preference", nameSign: false, signText: null },
  seating: { preferredSeat: null, partition: null, shades: null },
  accessibility: { mobilityAssist: false, serviceAnimal: false, notes: null },
  childSeats: [],
  route: { avoidHighways: false, avoidTolls: false, preference: "no_preference" },
  preferredDriverIds: [],
  blockedDriverIds: [],
  medicalNotes: null,
  freeText: null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updatedAt: { seconds: 0, nanoseconds: 0 } as any, // Mock timestamp
};
