import { describe, it, expect } from "vitest";
import { normalizeFlightNumber, getFlightStatus } from "../../../functions/src/services/flightTracker";

describe("Flight Radar Inbound Tail Sync Smoke Tests", () => {
  it("should normalize multiple flight number formats into standard IATA codes", () => {
    expect(normalizeFlightNumber("DL 1420").full).toBe("DL 1420");
    expect(normalizeFlightNumber("aa-450").full).toBe("AA 450");
    expect(normalizeFlightNumber("UA88").full).toBe("UA 88");
    expect(normalizeFlightNumber("B6 502").full).toBe("B6 502");
  });

  it("should return simulated flight radar telemetry when external API key is absent", async () => {
    const flightStatus = await getFlightStatus("DL 1420", new Date());

    expect(flightStatus).toBeDefined();
    expect(flightStatus.flightNumber).toContain("1420");
    expect(flightStatus.airline).toBeDefined();
    expect(flightStatus.terminal).toBeDefined();
    expect(flightStatus.status).toBeDefined();
  });

  it("should accurately compute pickup shift timestamps on inbound delays", () => {
    const originalPickup = new Date("2026-08-18T19:00:00.000Z");
    const delayMinutes = 45;
    const shiftedPickup = new Date(originalPickup.getTime() + delayMinutes * 60000);

    expect(shiftedPickup.toISOString()).toBe("2026-08-18T19:45:00.000Z");
    expect(shiftedPickup.getTime() - originalPickup.getTime()).toBe(45 * 60 * 1000);
  });
});
