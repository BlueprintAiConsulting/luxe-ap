import { z } from "zod";
import { timestampSchema } from "./timestamp";

export const vehicleClassSchema = z.object({
  classId: z.string(),
  name: z.string(),
  description: z.string(),
  maxPassengers: z.number().int(),
  maxLuggage: z.number().int(),
  heroImageUrl: z.string(),
  sortOrder: z.number().int(),
  active: z.boolean(),
});

export type VehicleClass = z.infer<typeof vehicleClassSchema>;

export const vehicleSchema = z.object({
  vehicleId: z.string(),
  classId: z.string(),
  year: z.number().int(),
  make: z.string(),
  model: z.string(),
  color: z.string(),
  licensePlate: z.string(),
  photoUrls: z.array(z.string()),
  maxPassengers: z.number().int(),
  maxLuggage: z.number().int(),
  active: z.boolean(),
  outOfServiceUntil: timestampSchema.nullable(),
});

export type Vehicle = z.infer<typeof vehicleSchema>;
