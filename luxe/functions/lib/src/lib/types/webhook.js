"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookEventSchema = void 0;
const zod_1 = require("zod");
const timestamp_1 = require("./timestamp");
exports.webhookEventSchema = zod_1.z.object({
    eventId: zod_1.z.string(),
    type: zod_1.z.string(),
    processedAt: timestamp_1.timestampSchema,
});
//# sourceMappingURL=webhook.js.map