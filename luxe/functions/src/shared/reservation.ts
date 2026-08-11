import { z } from "zod";
import { timestampSchema } from "./timestamp";
import { addressSchema } from "./address";
import { priceBreakdownSchema, quoteInputSchema } from "./pricing";
import { preferenceProfileSchema } from "./preferences";

export const reservationStatusSchema = z.enum([
  "draft",
  "quoted",
  "confirmed",
  "assigned",
  "en_route",
  "arrived",
  "onboard",
  "completed",
  "cancelled",
  "no_show",
]);

export type ReservationStatus = z.infer<typeof reservationStatusSchema>;

export const driverLocationStubSchema = z.object({
  driverId: z.string(),
  reservationId: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
  headingDegrees: z.number().nullable(),
  recordedAt: timestampSchema,
  expiresAt: timestampSchema,
});

export type DriverLocationStub = z.infer<typeof driverLocationStubSchema>;

export const reservationSchema = z.object({
  reservationId: z.string(),
  confirmationCode: z.string(),
  status: reservationStatusSchema,

  // --- Rider (snapshotted) ---
  riderId: z.string(),
  riderName: z.string(),
  riderPhone: z.string(),
  riderEmail: z.string().nullable(),
  bookedByAdmin: z.boolean(),

  // --- Trip ---
  pickupAt: timestampSchema,
  timezone: z.string(),
  tripType: z.enum(["point_to_point", "hourly", "airport_arrival", "airport_departure"]),
  pickup: addressSchema,
  dropoff: addressSchema.nullable(),
  stops: z.array(addressSchema),
  hours: z.number().nullable(),
  passengers: z.number().int(),
  luggage: z.number().int(),
  flightNumber: z.string().nullable(),
  airlineCode: z.string().nullable(),

  // --- Assignment (snapshotted) ---
  classId: z.string(),
  className: z.string(),
  vehicleId: z.string().nullable(),
  vehicleDescription: z.string().nullable(),
  driverId: z.string().nullable(),
  driverName: z.string().nullable(),
  driverPhotoUrl: z.string().nullable(),
  requestedDriverId: z.string().nullable(),
  driverSubstituted: z.boolean(),

  // --- Preferences (snapshotted at booking) ---
  preferences: preferenceProfileSchema.nullable(),
  specialInstructions: z.string(),
  prepChecklistState: z.record(z.string(), z.boolean()).nullable().optional(),

  // --- Pricing (server-authored only) ---
  pricing: priceBreakdownSchema,
  pricingRuleSetId: z.string(),
  estimatedDistanceMeters: z.number().nullable(),
  estimatedDurationSeconds: z.number().nullable(),

  // --- Actuals, filled during trip ---
  actualStartAt: timestampSchema.nullable(),
  actualEndAt: timestampSchema.nullable(),
  waitMinutes: z.number(),
  tollsCents: z.number().int(),
  parkingCents: z.number().int(),
  driverNotes: z.string(),

  // --- Payment ---
  stripePaymentIntentId: z.string().nullable(),
  corporateAccountId: z.string().nullable().optional(),
  billedToCorporate: z.boolean().optional(),
  paymentStatus: z.enum(["none", "authorized", "captured", "failed", "refunded"]),
  authorizedAmountCents: z.number().int(),
  capturedAmountCents: z.number().int(),

  // --- Cancellation ---
  cancelledAt: timestampSchema.nullable(),
  cancelledBy: z.string().nullable(),
  cancellationReason: z.string().nullable(),
  cancellationFeeCents: z.number().int(),

  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  idempotencyKey: z.string(),
});

export type Reservation = z.infer<typeof reservationSchema>;

export const createReservationInputSchema = z.object({
  idempotencyKey: z.string(),
  quote: quoteInputSchema,
  requestedDriverId: z.string().nullable().optional(),
  pickup: addressSchema,
  dropoff: addressSchema.nullable(),
  stops: z.array(addressSchema),
  passengers: z.number().int(),
  luggage: z.number().int(),
  flightNumber: z.string().nullable(),
  promoCode: z.string().nullable().optional(),
  preferences: preferenceProfileSchema.nullable(),
  notes: z.string().nullable(),
});

export type CreateReservationInput = z.infer<typeof createReservationInputSchema>;

export const reservationStatusEventSchema = z.object({
  from: reservationStatusSchema.nullable(),
  to: reservationStatusSchema,
  actorId: z.string(),
  actorRole: z.enum(["rider", "driver", "admin", "system"]),
  at: timestampSchema,
  note: z.string().nullable(),
  location: z.null(),
});

export type ReservationStatusEvent = z.infer<typeof reservationStatusEventSchema>;

type ActorRole = "rider" | "driver" | "admin" | "system";

/**
 * Validates whether a reservation can transition from one state to another.
 * Exhaustive check based on the spec matrix.
 */
export function canTransition(
  from: ReservationStatus,
  to: ReservationStatus,
  actor: ActorRole
): boolean {
  if (actor === "admin") return true;

  switch (from) {
    case "draft":
      return to === "quoted" && (actor === "system" || actor === "rider");
    case "quoted":
      return (
        (to === "confirmed" && actor === "rider") ||
        (to === "cancelled" && (actor === "rider" || actor === "system"))
      );
    case "confirmed":
      return (
        (to === "assigned" && actor === "system") ||
        (to === "cancelled" && actor === "rider")
      );
    case "assigned":
      return (
        (to === "en_route" && actor === "driver") ||
        (to === "confirmed" && actor === "system") ||
        (to === "cancelled" && actor === "rider")
      );
    case "en_route":
      return (
        (to === "arrived" && actor === "driver") ||
        (to === "cancelled" && actor === "rider")
      );
    case "arrived":
      return (
        (to === "onboard" && actor === "driver") ||
        (to === "no_show" && actor === "driver") ||
        (to === "cancelled" && actor === "rider")
      );
    case "onboard":
      return to === "completed" && actor === "driver";
    case "completed":
    case "cancelled":
    case "no_show":
      // Terminal states. Only admin can override, but admin is handled at top.
      return false;
    default:
      return false;
  }
}
