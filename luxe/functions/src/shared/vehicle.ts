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

export const vehicleAmenityTagsSchema = z.object({
  chilledSeats: z.boolean().optional(),
  massageSeats: z.boolean().optional(),
  starlineHeadliner: z.boolean().optional(),
  fijiWater: z.boolean().optional(),
  pellegrino: z.boolean().optional(),
  starlinkWifi: z.boolean().optional(),
  rearEntertainment: z.boolean().optional(),
  burmesterAudio: z.boolean().optional(),
  executivePartition: z.boolean().optional(),
});

export type VehicleAmenityTags = z.infer<typeof vehicleAmenityTagsSchema>;

export const vehicleSchema = z.object({
  vehicleId: z.string(),
  classId: z.string(),
  year: z.number().int(),
  make: z.string(),
  model: z.string(),
  trim: z.string().optional(),
  vin: z.string().optional(),
  color: z.string(),
  licensePlate: z.string(),
  photoUrls: z.array(z.string()),
  maxPassengers: z.number().int(),
  maxLuggage: z.number().int(),
  active: z.boolean(),
  assignedDriverId: z.string().nullable().optional(),
  amenityTags: vehicleAmenityTagsSchema.optional(),
  outOfServiceUntil: timestampSchema.nullable(),
});

export type Vehicle = z.infer<typeof vehicleSchema>;
