import { describe, it, expect } from "vitest";
import { canTransition } from "../reservation";

describe("Reservation Status State Machine", () => {
  it("allows admin to do anything", () => {
    expect(canTransition("draft", "completed", "admin")).toBe(true);
    expect(canTransition("cancelled", "en_route", "admin")).toBe(true);
  });

  it("handles draft transitions", () => {
    expect(canTransition("draft", "quoted", "system")).toBe(true);
    expect(canTransition("draft", "quoted", "rider")).toBe(true);
    expect(canTransition("draft", "confirmed", "system")).toBe(false);
  });

  it("handles quoted transitions", () => {
    expect(canTransition("quoted", "confirmed", "rider")).toBe(true);
    expect(canTransition("quoted", "cancelled", "rider")).toBe(true);
    expect(canTransition("quoted", "cancelled", "system")).toBe(true);
    expect(canTransition("quoted", "confirmed", "driver")).toBe(false);
  });

  it("handles confirmed transitions", () => {
    expect(canTransition("confirmed", "assigned", "system")).toBe(true);
    expect(canTransition("confirmed", "cancelled", "rider")).toBe(true);
    expect(canTransition("confirmed", "en_route", "system")).toBe(false);
  });

  it("handles assigned transitions", () => {
    expect(canTransition("assigned", "en_route", "driver")).toBe(true);
    expect(canTransition("assigned", "confirmed", "system")).toBe(true);
    expect(canTransition("assigned", "cancelled", "rider")).toBe(true);
  });

  it("handles en_route transitions", () => {
    expect(canTransition("en_route", "arrived", "driver")).toBe(true);
    expect(canTransition("en_route", "cancelled", "rider")).toBe(true);
    expect(canTransition("en_route", "onboard", "driver")).toBe(false); // must arrive first
  });

  it("handles arrived transitions", () => {
    expect(canTransition("arrived", "onboard", "driver")).toBe(true);
    expect(canTransition("arrived", "no_show", "driver")).toBe(true);
    expect(canTransition("arrived", "cancelled", "rider")).toBe(true);
  });

  it("handles onboard transitions", () => {
    expect(canTransition("onboard", "completed", "driver")).toBe(true);
    expect(canTransition("onboard", "cancelled", "rider")).toBe(false); // too late to cancel
  });

  it("prevents transitions from terminal states", () => {
    expect(canTransition("completed", "confirmed", "system")).toBe(false);
    expect(canTransition("completed", "cancelled", "system")).toBe(false);
    expect(canTransition("cancelled", "confirmed", "rider")).toBe(false);
    expect(canTransition("no_show", "completed", "driver")).toBe(false);
  });

  it("rejects unknown transitions", () => {
    // These 6 illegal transitions:
    expect(canTransition("confirmed", "arrived", "driver")).toBe(false);
    expect(canTransition("quoted", "completed", "system")).toBe(false);
    expect(canTransition("en_route", "completed", "rider")).toBe(false);
    expect(canTransition("assigned", "onboard", "driver")).toBe(false);
    expect(canTransition("arrived", "en_route", "system")).toBe(false);
    expect(canTransition("onboard", "no_show", "driver")).toBe(false);
  });
});
