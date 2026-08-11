"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corporateAccountSchema = void 0;
const zod_1 = require("zod");
const timestamp_1 = require("./timestamp");
exports.corporateAccountSchema = zod_1.z.object({
    id: zod_1.z.string(),
    companyName: zod_1.z.string(),
    billingEmail: zod_1.z.string().email(),
    promoCode: zod_1.z.string(),
    active: zod_1.z.boolean(),
    createdAt: timestamp_1.timestampSchema,
    updatedAt: timestamp_1.timestampSchema,
});
//# sourceMappingURL=corporate.js.map