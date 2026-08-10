"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.driverCredentialsSchema = exports.driverSchema = void 0;
const zod_1 = require("zod");
const timestamp_1 = require("./timestamp");
exports.driverSchema = zod_1.z.object({
    driverId: zod_1.z.string(),
    userId: zod_1.z.string(),
    displayName: zod_1.z.string(),
    photoUrl: zod_1.z.string(),
    bio: zod_1.z.string(),
    languages: zod_1.z.array(zod_1.z.string()),
    yearsExperience: zod_1.z.number().int(),
    rating: zod_1.z.number(),
    ratingCount: zod_1.z.number().int(),
    active: zod_1.z.boolean(),
    bookable: zod_1.z.boolean(),
    createdAt: timestamp_1.timestampSchema,
});
exports.driverCredentialsSchema = zod_1.z.object({
    licenseNumber: zod_1.z.string(),
    licenseExpiry: timestamp_1.timestampSchema,
    medicalCertExpiry: timestamp_1.timestampSchema.nullable(),
    backgroundCheckDate: timestamp_1.timestampSchema.nullable(),
    employmentType: zod_1.z.enum(["w2", "1099"]),
    phone: zod_1.z.string(),
    emergencyContact: zod_1.z.object({
        name: zod_1.z.string(),
        phone: zod_1.z.string(),
    }),
});
//# sourceMappingURL=driver.js.map