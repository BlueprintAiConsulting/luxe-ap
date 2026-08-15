"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
const v2_1 = require("firebase-functions/v2");
(0, v2_1.setGlobalOptions)({ maxInstances: 10 });
__exportStar(require("./auth/triggers"), exports);
__exportStar(require("./auth/callables"), exports);
__exportStar(require("./api/booking"), exports);
__exportStar(require("./api/trip"), exports);
__exportStar(require("./api/dispatch"), exports);
__exportStar(require("./api/webhook"), exports);
__exportStar(require("./api/ratings"), exports);
__exportStar(require("./crons/stripe"), exports);
__exportStar(require("./triggers/notifications"), exports);
__exportStar(require("./triggers/mail"), exports);
//# sourceMappingURL=index.js.map