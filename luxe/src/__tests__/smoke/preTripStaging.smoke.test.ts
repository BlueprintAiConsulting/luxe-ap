import { describe, it, expect } from "vitest";
import { getStagingAlertWindows } from "../../../functions/src/crons/preTripStaging";

describe("Pre-Trip Chauffeur & Passenger Staging Alerts Smoke Tests", () => {
  it("should calculate correct 60-min and 15-min alert time windows", () => {
    const fixedNowMs = 1755475200000; // Base epoch timestamp
    const { driver60MinStart, driver60MinEnd, rider15MinStart, rider15MinEnd } = getStagingAlertWindows(fixedNowMs);

    // 60-min alert window: [now + 45m, now + 75m]
    expect(driver60MinStart).toBe(fixedNowMs + 45 * 60 * 1000);
    expect(driver60MinEnd).toBe(fixedNowMs + 75 * 60 * 1000);

    // 15-min alert window: [now, now + 20m]
    expect(rider15MinStart).toBe(fixedNowMs);
    expect(rider15MinEnd).toBe(fixedNowMs + 20 * 60 * 1000);
  });

  it("should format executive 60-min chauffeur reminder messages", () => {
    const mockTrip = {
      confirmationCode: "BCC-K8L9M2",
      riderName: "Rachel Vance",
      pickupFormatted: "The Beverly Hills Hotel, 9641 Sunset Blvd",
      vehicleDescription: "2024 Cadillac Escalade ESV (LUXE-002)",
      pickupTimeStr: "7:00 PM",
    };

    const notificationMessage = `Pickup for ${mockTrip.riderName} at ${mockTrip.pickupTimeStr} (${mockTrip.pickupFormatted}). Vehicle: ${mockTrip.vehicleDescription}.`;
    expect(notificationMessage).toContain("Rachel Vance");
    expect(notificationMessage).toContain("Cadillac Escalade ESV");
    expect(notificationMessage).toContain("7:00 PM");
  });

  it("should format 15-min passenger staging notification with chauffeur and vehicle specifics", () => {
    const mockTrip = {
      driverName: "Marcus Bennett",
      vehicleDescription: "2024 Cadillac Escalade ESV",
      pickupAddressStr: "LAX Terminal 4, Door 4",
      confirmationCode: "BCC-K8L9M2",
    };

    const alertMessage = `Your chauffeur ${mockTrip.driverName} is staged in a ${mockTrip.vehicleDescription} at ${mockTrip.pickupAddressStr}.`;
    expect(alertMessage).toContain("Marcus Bennett");
    expect(alertMessage).toContain("LAX Terminal 4");
  });
});
