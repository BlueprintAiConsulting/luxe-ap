"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.savedPlaceSchema = exports.userSchema = void 0;
const zod_1 = require("zod");
const timestamp_1 = require("./timestamp");
const preferences_1 = require("./preferences");
const address_1 = require("./address");
exports.userSchema = zod_1.z.object({
    uid: zod_1.z.string(),
    role: zod_1.z.enum(["rider", "driver", "admin"]),
    phone: zod_1.z.string(),
    email: zod_1.z.string().nullable(),
    photoUrl: zod_1.z.string().nullable().optional(),
    firstName: zod_1.z.string(),
    lastName: zod_1.z.string(),
    searchName: zod_1.z.string(),
    stripeCustomerId: zod_1.z.string().nullable(),
    defaultPaymentMethodId: zod_1.z.string().nullable(),
    corporateAccountId: zod_1.z.string().nullable().optional(),
    preferences: preferences_1.preferenceProfileSchema.nullable(),
    notes: zod_1.z.string(),
    totalRides: zod_1.z.number().int(),
    averageRating: zod_1.z.number().nullable().optional(),
    totalRatings: zod_1.z.number().int().optional(),
    createdAt: timestamp_1.timestampSchema,
    updatedAt: timestamp_1.timestampSchema,
    disabled: zod_1.z.boolean(),
});
exports.savedPlaceSchema = zod_1.z.object({
    label: zod_1.z.string(),
    address: address_1.addressSchema,
    isDefault: zod_1.z.boolean(),
    createdAt: timestamp_1.timestampSchema,
});
//# sourceMappingURL=user.js.map