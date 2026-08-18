import { z } from "zod";
import { timestampSchema } from "./timestamp";

export const driverSchema = z.object({
  driverId: z.string(),
  userId: z.string(),
  displayName: z.string(),
  photoUrl: z.string(),
  bio: z.string(),
  languages: z.array(z.string()),
  yearsExperience: z.number().int(),
  rating: z.number(),
  ratingCount: z.number().int(),
  active: z.boolean(),
  bookable: z.boolean(),
  driverType: z.enum(["in_house", "floater", "affiliate"]).default("in_house").optional(),
  assignedVehicleId: z.string().nullable().optional(),
  createdAt: timestampSchema,
});

export type Driver = z.infer<typeof driverSchema>;

export const driverCredentialsSchema = z.object({
  licenseNumber: z.string(),
  licenseExpiry: timestampSchema,
  medicalCertExpiry: timestampSchema.nullable(),
  backgroundCheckDate: timestampSchema.nullable(),
  employmentType: z.enum(["w2", "1099"]),
  phone: z.string(),
  emergencyContact: z.object({
    name: z.string(),
    phone: z.string(),
  }),
});

export type DriverCredentials = z.infer<typeof driverCredentialsSchema>;
