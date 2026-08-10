"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalSettingsSchema = void 0;
const zod_1 = require("zod");
exports.globalSettingsSchema = zod_1.z.object({
    businessName: zod_1.z.string(),
    supportPhone: zod_1.z.string(),
    supportEmail: zod_1.z.string(),
    defaultTimezone: zod_1.z.string(),
    activePricingRuleSetId: zod_1.z.string(),
    bookingLeadTimeMinutes: zod_1.z.number().int(),
    maxAdvanceDays: zod_1.z.number().int(),
    brandColors: zod_1.z.object({
        primary: zod_1.z.string(),
        accent: zod_1.z.string(),
    }),
});
//# sourceMappingURL=settings.js.map