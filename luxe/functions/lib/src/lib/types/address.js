"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addressSchema = void 0;
const zod_1 = require("zod");
exports.addressSchema = zod_1.z.object({
    formatted: zod_1.z.string(),
    placeId: zod_1.z.string().nullable(),
    lat: zod_1.z.number(),
    lng: zod_1.z.number(),
    line1: zod_1.z.string().nullable(),
    line2: zod_1.z.string().nullable(),
    city: zod_1.z.string(),
    state: zod_1.z.string(),
    postalCode: zod_1.z.string(),
    airportCode: zod_1.z.string().nullable(),
    notes: zod_1.z.string().nullable(),
});
//# sourceMappingURL=address.js.map