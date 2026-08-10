"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timestampSchema = void 0;
const zod_1 = require("zod");
exports.timestampSchema = zod_1.z.custom((val) => val && typeof val.seconds === "number" && typeof val.nanoseconds === "number", "Invalid Timestamp");
//# sourceMappingURL=timestamp.js.map