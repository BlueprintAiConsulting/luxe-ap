import { z } from "zod";
import { timestampSchema } from "./timestamp";
import { preferenceProfileSchema } from "./preferences";
import { addressSchema } from "./address";

export const userSchema = z.object({
  uid: z.string(),
  role: z.enum(["rider", "driver", "admin"]),
  phone: z.string(),
  email: z.string().nullable(),
  photoUrl: z.string().nullable().optional(),
  firstName: z.string(),
  lastName: z.string(),
  searchName: z.string(),
  stripeCustomerId: z.string().nullable(),
  defaultPaymentMethodId: z.string().nullable(),
  corporateAccountId: z.string().nullable().optional(),
  preferences: preferenceProfileSchema.nullable(),
  notes: z.string(),
  totalRides: z.number().int(),
  averageRating: z.number().nullable().optional(),
  totalRatings: z.number().int().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  disabled: z.boolean(),
});

export type User = z.infer<typeof userSchema>;

export const savedPlaceSchema = z.object({
  label: z.string(),
  address: addressSchema,
  isDefault: z.boolean(),
  createdAt: timestampSchema,
});

export type SavedPlace = z.infer<typeof savedPlaceSchema>;
