"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reservationStatusEventSchema = exports.createReservationInputSchema = exports.reservationSchema = exports.driverLocationStubSchema = exports.reservationStatusSchema = void 0;
exports.canTransition = canTransition;
const zod_1 = require("zod");
const timestamp_1 = require("./timestamp");
const address_1 = require("./address");
const pricing_1 = require("./pricing");
const preferences_1 = require("./preferences");
exports.reservationStatusSchema = zod_1.z.enum([
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
exports.driverLocationStubSchema = zod_1.z.object({
    driverId: zod_1.z.string(),
    reservationId: zod_1.z.string().nullable(),
    lat: zod_1.z.number(),
    lng: zod_1.z.number(),
    headingDegrees: zod_1.z.number().nullable(),
    recordedAt: timestamp_1.timestampSchema,
    expiresAt: timestamp_1.timestampSchema,
});
exports.reservationSchema = zod_1.z.object({
    reservationId: zod_1.z.string(),
    confirmationCode: zod_1.z.string(),
    status: exports.reservationStatusSchema,
    // --- Rider (snapshotted) ---
    riderId: zod_1.z.string(),
    riderName: zod_1.z.string(),
    riderPhone: zod_1.z.string(),
    riderEmail: zod_1.z.string().nullable(),
    bookedByAdmin: zod_1.z.boolean(),
    // --- Trip ---
    pickupAt: timestamp_1.timestampSchema,
    timezone: zod_1.z.string(),
    tripType: zod_1.z.enum(["point_to_point", "hourly", "airport_arrival", "airport_departure"]),
    pickup: address_1.addressSchema,
    dropoff: address_1.addressSchema.nullable(),
    stops: zod_1.z.array(address_1.addressSchema),
    hours: zod_1.z.number().nullable(),
    passengers: zod_1.z.number().int(),
    luggage: zod_1.z.number().int(),
    flightNumber: zod_1.z.string().nullable(),
    airlineCode: zod_1.z.string().nullable(),
    // --- Assignment (snapshotted) ---
    classId: zod_1.z.string(),
    className: zod_1.z.string(),
    vehicleId: zod_1.z.string().nullable(),
    vehicleDescription: zod_1.z.string().nullable(),
    driverId: zod_1.z.string().nullable(),
    driverName: zod_1.z.string().nullable(),
    driverPhotoUrl: zod_1.z.string().nullable(),
    requestedDriverId: zod_1.z.string().nullable(),
    driverSubstituted: zod_1.z.boolean(),
    // --- Preferences (snapshotted at booking) ---
    preferences: preferences_1.preferenceProfileSchema.nullable(),
    specialInstructions: zod_1.z.string(),
    prepChecklistState: zod_1.z.record(zod_1.z.string(), zod_1.z.boolean()).nullable().optional(),
    // --- Pricing (server-authored only) ---
    pricing: pricing_1.priceBreakdownSchema,
    pricingRuleSetId: zod_1.z.string(),
    estimatedDistanceMeters: zod_1.z.number().nullable(),
    estimatedDurationSeconds: zod_1.z.number().nullable(),
    // --- Actuals, filled during trip ---
    actualStartAt: timestamp_1.timestampSchema.nullable(),
    actualEndAt: timestamp_1.timestampSchema.nullable(),
    waitMinutes: zod_1.z.number(),
    tollsCents: zod_1.z.number().int(),
    parkingCents: zod_1.z.number().int(),
    driverNotes: zod_1.z.string(),
    // --- Payment ---
    stripePaymentIntentId: zod_1.z.string().nullable(),
    corporateAccountId: zod_1.z.string().nullable().optional(),
    billedToCorporate: zod_1.z.boolean().optional(),
    paymentStatus: zod_1.z.enum(["none", "authorized", "captured", "failed", "refunded"]),
    authorizedAmountCents: zod_1.z.number().int(),
    capturedAmountCents: zod_1.z.number().int(),
    // --- Cancellation ---
    cancelledAt: timestamp_1.timestampSchema.nullable(),
    cancelledBy: zod_1.z.string().nullable(),
    cancellationReason: zod_1.z.string().nullable(),
    cancellationFeeCents: zod_1.z.number().int(),
    createdAt: timestamp_1.timestampSchema,
    updatedAt: timestamp_1.timestampSchema,
    idempotencyKey: zod_1.z.string(),
});
exports.createReservationInputSchema = zod_1.z.object({
    idempotencyKey: zod_1.z.string(),
    quote: pricing_1.quoteInputSchema,
    requestedDriverId: zod_1.z.string().nullable().optional(),
    pickup: address_1.addressSchema,
    dropoff: address_1.addressSchema.nullable(),
    stops: zod_1.z.array(address_1.addressSchema),
    passengers: zod_1.z.number().int(),
    luggage: zod_1.z.number().int(),
    flightNumber: zod_1.z.string().nullable(),
    promoCode: zod_1.z.string().nullable().optional(),
    preferences: preferences_1.preferenceProfileSchema.nullable(),
    notes: zod_1.z.string().nullable(),
});
exports.reservationStatusEventSchema = zod_1.z.object({
    from: exports.reservationStatusSchema.nullable(),
    to: exports.reservationStatusSchema,
    actorId: zod_1.z.string(),
    actorRole: zod_1.z.enum(["rider", "driver", "admin", "system"]),
    at: timestamp_1.timestampSchema,
    note: zod_1.z.string().nullable(),
    location: zod_1.z.null(),
});
/**
 * Validates whether a reservation can transition from one state to another.
 * Exhaustive check based on the spec matrix.
 */
function canTransition(from, to, actor) {
    if (actor === "admin")
        return true;
    switch (from) {
        case "draft":
            return to === "quoted" && (actor === "system" || actor === "rider");
        case "quoted":
            return ((to === "confirmed" && actor === "rider") ||
                (to === "cancelled" && (actor === "rider" || actor === "system")));
        case "confirmed":
            return ((to === "assigned" && actor === "system") ||
                (to === "cancelled" && actor === "rider"));
        case "assigned":
            return ((to === "en_route" && actor === "driver") ||
                (to === "confirmed" && actor === "system") ||
                (to === "cancelled" && actor === "rider"));
        case "en_route":
            return ((to === "arrived" && actor === "driver") ||
                (to === "cancelled" && actor === "rider"));
        case "arrived":
            return ((to === "onboard" && actor === "driver") ||
                (to === "no_show" && actor === "driver") ||
                (to === "cancelled" && actor === "rider"));
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
//# sourceMappingURL=reservation.js.map