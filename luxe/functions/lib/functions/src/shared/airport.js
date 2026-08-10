"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.airportSchema = void 0;
const zod_1 = require("zod");
exports.airportSchema = zod_1.z.object({
    code: zod_1.z.string(),
    name: zod_1.z.string(),
    timezone: zod_1.z.string(),
    location: zod_1.z.object({
        lat: zod_1.z.number(),
        lng: zod_1.z.number(),
    }),
    zones: zod_1.z.array(zod_1.z.object({
        zoneId: zod_1.z.string(),
        name: zod_1.z.string(),
        flatRates: zod_1.z.record(zod_1.z.string(), zod_1.z.object({
            arrivalCents: zod_1.z.number().int(),
            departureCents: zod_1.z.number().int(),
        })),
    })),
    meetGreetFeeCents: zod_1.z.number().int(),
    freeWaitMinutesArrival: zod_1.z.number(),
});
//# sourceMappingURL=airport.js.map