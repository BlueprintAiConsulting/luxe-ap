"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vehicleSchema = exports.vehicleAmenityTagsSchema = exports.vehicleClassSchema = void 0;
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
exports.vehicleAmenityTagsSchema = zod_1.z.object({
    chilledSeats: zod_1.z.boolean().optional(),
    massageSeats: zod_1.z.boolean().optional(),
    starlineHeadliner: zod_1.z.boolean().optional(),
    fijiWater: zod_1.z.boolean().optional(),
    pellegrino: zod_1.z.boolean().optional(),
    starlinkWifi: zod_1.z.boolean().optional(),
    rearEntertainment: zod_1.z.boolean().optional(),
    burmesterAudio: zod_1.z.boolean().optional(),
    executivePartition: zod_1.z.boolean().optional(),
});
exports.vehicleSchema = zod_1.z.object({
    vehicleId: zod_1.z.string(),
    classId: zod_1.z.string(),
    year: zod_1.z.number().int(),
    make: zod_1.z.string(),
    model: zod_1.z.string(),
    trim: zod_1.z.string().optional(),
    vin: zod_1.z.string().optional(),
    color: zod_1.z.string(),
    licensePlate: zod_1.z.string(),
    photoUrls: zod_1.z.array(zod_1.z.string()),
    maxPassengers: zod_1.z.number().int(),
    maxLuggage: zod_1.z.number().int(),
    active: zod_1.z.boolean(),
    assignedDriverId: zod_1.z.string().nullable().optional(),
    amenityTags: exports.vehicleAmenityTagsSchema.optional(),
    outOfServiceUntil: timestamp_1.timestampSchema.nullable(),
});
//# sourceMappingURL=vehicle.js.map