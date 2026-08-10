"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vehicleSchema = exports.vehicleClassSchema = void 0;
const zod_1 = require("zod");
const timestamp_1 = require("./timestamp");
exports.vehicleClassSchema = zod_1.z.object({
    classId: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    maxPassengers: zod_1.z.number().int(),
    maxLuggage: zod_1.z.number().int(),
    heroImageUrl: zod_1.z.string(),
    sortOrder: zod_1.z.number().int(),
    active: zod_1.z.boolean(),
});
exports.vehicleSchema = zod_1.z.object({
    vehicleId: zod_1.z.string(),
    classId: zod_1.z.string(),
    year: zod_1.z.number().int(),
    make: zod_1.z.string(),
    model: zod_1.z.string(),
    color: zod_1.z.string(),
    licensePlate: zod_1.z.string(),
    photoUrls: zod_1.z.array(zod_1.z.string()),
    maxPassengers: zod_1.z.number().int(),
    maxLuggage: zod_1.z.number().int(),
    active: zod_1.z.boolean(),
    outOfServiceUntil: timestamp_1.timestampSchema.nullable(),
});
//# sourceMappingURL=vehicle.js.map