"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preferenceProfileSchema = void 0;
const zod_1 = require("zod");
const timestamp_1 = require("./timestamp");
exports.preferenceProfileSchema = zod_1.z.object({
    beverage: zod_1.z.object({
        preference: zod_1.z.enum(["none", "water_still", "water_sparkling", "soda", "coffee", "other"]),
        brand: zod_1.z.string().nullable(),
        temperature: zod_1.z.enum(["chilled", "room"]).nullable(),
        notes: zod_1.z.string().nullable(),
    }),
    conversation: zod_1.z.enum(["silent", "greeting_only", "chatty", "no_preference"]),
    cabinTempF: zod_1.z.number().nullable(),
    audio: zod_1.z.object({
        mode: zod_1.z.enum(["off", "genre", "station", "my_phone", "no_preference"]),
        value: zod_1.z.string().nullable(),
        volume: zod_1.z.enum(["low", "medium", "off"]).nullable(),
    }),
    scent: zod_1.z.enum(["none", "light", "no_preference"]),
    scentAllergy: zod_1.z.boolean(),
    chargerType: zod_1.z.enum(["usb_c", "lightning", "wireless", "none"]),
    reading: zod_1.z.string().nullable(),
    greeting: zod_1.z.object({
        style: zod_1.z.enum(["curbside", "meet_inside", "no_preference"]),
        nameSign: zod_1.z.boolean(),
        signText: zod_1.z.string().nullable(),
    }),
    seating: zod_1.z.object({
        preferredSeat: zod_1.z.enum(["rear_right", "rear_left", "rear_center", "front"]).nullable(),
        partition: zod_1.z.enum(["up", "down"]).nullable(),
        shades: zod_1.z.enum(["up", "down"]).nullable(),
    }),
    accessibility: zod_1.z.object({
        mobilityAssist: zod_1.z.boolean(),
        serviceAnimal: zod_1.z.boolean(),
        notes: zod_1.z.string().nullable(),
    }),
    childSeats: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(["infant", "convertible", "booster"]),
        count: zod_1.z.number().int(),
    })),
    route: zod_1.z.object({
        avoidHighways: zod_1.z.boolean(),
        avoidTolls: zod_1.z.boolean(),
        preference: zod_1.z.enum(["fastest", "scenic", "no_preference"]),
    }),
    preferredDriverIds: zod_1.z.array(zod_1.z.string()),
    blockedDriverIds: zod_1.z.array(zod_1.z.string()),
    medicalNotes: zod_1.z.string().nullable(),
    freeText: zod_1.z.string().nullable(),
    updatedAt: timestamp_1.timestampSchema,
});
//# sourceMappingURL=preferences.js.map