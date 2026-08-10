"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const reservation_1 = require("../reservation");
(0, vitest_1.describe)("Reservation Status State Machine", () => {
    (0, vitest_1.it)("allows admin to do anything", () => {
        (0, vitest_1.expect)((0, reservation_1.canTransition)("draft", "completed", "admin")).toBe(true);
        (0, vitest_1.expect)((0, reservation_1.canTransition)("cancelled", "en_route", "admin")).toBe(true);
    });
    (0, vitest_1.it)("handles draft transitions", () => {
        (0, vitest_1.expect)((0, reservation_1.canTransition)("draft", "quoted", "system")).toBe(true);
        (0, vitest_1.expect)((0, reservation_1.canTransition)("draft", "quoted", "rider")).toBe(true);
        (0, vitest_1.expect)((0, reservation_1.canTransition)("draft", "booked", "system")).toBe(false);
    });
    (0, vitest_1.it)("handles quoted transitions", () => {
        (0, vitest_1.expect)((0, reservation_1.canTransition)("quoted", "booked", "rider")).toBe(true);
        (0, vitest_1.expect)((0, reservation_1.canTransition)("quoted", "cancelled", "rider")).toBe(true);
        (0, vitest_1.expect)((0, reservation_1.canTransition)("quoted", "cancelled", "system")).toBe(true);
        (0, vitest_1.expect)((0, reservation_1.canTransition)("quoted", "booked", "driver")).toBe(false);
    });
    (0, vitest_1.it)("handles booked transitions", () => {
        (0, vitest_1.expect)((0, reservation_1.canTransition)("booked", "driver_assigned", "system")).toBe(true);
        (0, vitest_1.expect)((0, reservation_1.canTransition)("booked", "cancelled", "rider")).toBe(true);
        (0, vitest_1.expect)((0, reservation_1.canTransition)("booked", "en_route", "system")).toBe(false);
    });
    (0, vitest_1.it)("handles driver_assigned transitions", () => {
        (0, vitest_1.expect)((0, reservation_1.canTransition)("driver_assigned", "en_route", "driver")).toBe(true);
        (0, vitest_1.expect)((0, reservation_1.canTransition)("driver_assigned", "booked", "system")).toBe(true);
        (0, vitest_1.expect)((0, reservation_1.canTransition)("driver_assigned", "cancelled", "rider")).toBe(true);
    });
    (0, vitest_1.it)("handles en_route transitions", () => {
        (0, vitest_1.expect)((0, reservation_1.canTransition)("en_route", "arrived", "driver")).toBe(true);
        (0, vitest_1.expect)((0, reservation_1.canTransition)("en_route", "cancelled", "rider")).toBe(true);
        (0, vitest_1.expect)((0, reservation_1.canTransition)("en_route", "passenger_onboard", "driver")).toBe(false); // must arrive first
    });
    (0, vitest_1.it)("handles arrived transitions", () => {
        (0, vitest_1.expect)((0, reservation_1.canTransition)("arrived", "passenger_onboard", "driver")).toBe(true);
        (0, vitest_1.expect)((0, reservation_1.canTransition)("arrived", "no_show", "driver")).toBe(true);
        (0, vitest_1.expect)((0, reservation_1.canTransition)("arrived", "cancelled", "rider")).toBe(true);
    });
    (0, vitest_1.it)("handles passenger_onboard transitions", () => {
        (0, vitest_1.expect)((0, reservation_1.canTransition)("passenger_onboard", "completed", "driver")).toBe(true);
        (0, vitest_1.expect)((0, reservation_1.canTransition)("passenger_onboard", "cancelled", "rider")).toBe(false); // too late to cancel
    });
    (0, vitest_1.it)("prevents transitions from terminal states", () => {
        (0, vitest_1.expect)((0, reservation_1.canTransition)("completed", "booked", "system")).toBe(false);
        (0, vitest_1.expect)((0, reservation_1.canTransition)("completed", "cancelled", "system")).toBe(false);
        (0, vitest_1.expect)((0, reservation_1.canTransition)("cancelled", "booked", "rider")).toBe(false);
        (0, vitest_1.expect)((0, reservation_1.canTransition)("no_show", "completed", "driver")).toBe(false);
    });
    (0, vitest_1.it)("rejects unknown transitions", () => {
        // These 6 illegal transitions:
        (0, vitest_1.expect)((0, reservation_1.canTransition)("booked", "arrived", "driver")).toBe(false);
        (0, vitest_1.expect)((0, reservation_1.canTransition)("quoted", "completed", "system")).toBe(false);
        (0, vitest_1.expect)((0, reservation_1.canTransition)("en_route", "completed", "rider")).toBe(false);
        (0, vitest_1.expect)((0, reservation_1.canTransition)("driver_assigned", "passenger_onboard", "driver")).toBe(false);
        (0, vitest_1.expect)((0, reservation_1.canTransition)("arrived", "en_route", "system")).toBe(false);
        (0, vitest_1.expect)((0, reservation_1.canTransition)("passenger_onboard", "no_show", "driver")).toBe(false);
    });
});
//# sourceMappingURL=reservation.test.js.map