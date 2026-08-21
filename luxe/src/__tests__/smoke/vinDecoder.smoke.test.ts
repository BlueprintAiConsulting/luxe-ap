import { describe, it, expect } from "vitest";
import { decodeVinNumber, SAMPLE_LUXURY_VINS } from "../../lib/services/vinDecoder";

describe("NHTSA VIN Decoder & Fleet Auto-Provisioning Smoke Tests", { timeout: 10000 }, () => {
  
  it("should accurately decode Cadillac Escalade ESV VIN and map to SUV class with luxury amenities", async () => {
    const vin = "1GYS4HKL7RR123456";
    const decoded = await decodeVinNumber(vin);

    expect(decoded.vin).toBe(vin);
    expect(decoded.make).toBe("CADILLAC");
    expect(decoded.model).toContain("Escalade");
    expect(decoded.classId).toBe("suv");
    expect(decoded.maxPassengers).toBe(6);
    expect(decoded.maxLuggage).toBe(6);
    expect(decoded.color).toBe("Black");
    expect(decoded.suggestedAmenities.starlineHeadliner).toBe(true);
    expect(decoded.suggestedAmenities.chilledSeats).toBe(true);
    expect(decoded.suggestedAmenities.fijiWater).toBe(true);
  });

  it("should accurately decode Mercedes-Benz S-Class VIN and map to Sedan class with Burmester audio", async () => {
    const vin = "W1K5G5GB8RA789012";
    const decoded = await decodeVinNumber(vin);

    expect(decoded.vin).toBe(vin);
    expect(decoded.make).toBe("MERCEDES-BENZ");
    expect(decoded.classId).toBe("sedan");
    expect(decoded.maxPassengers).toBe(3);
    expect(decoded.maxLuggage).toBe(3);
    expect(decoded.suggestedAmenities.burmesterAudio).toBe(true);
    expect(decoded.suggestedAmenities.massageSeats).toBe(true);
  });

  it("should accurately decode Sprinter Van VIN and map to Sprinter class with executive partition", async () => {
    const vin = "WD3PF0CD7RP567890";
    const decoded = await decodeVinNumber(vin);

    expect(decoded.vin).toBe(vin);
    expect(decoded.make).toBe("MERCEDES-BENZ");
    expect(decoded.classId).toBe("sprinter");
    expect(decoded.maxPassengers).toBe(14);
    expect(decoded.maxLuggage).toBe(14);
    expect(decoded.suggestedAmenities.executivePartition).toBe(true);
  });

  it("should reject invalid VINs that are not 17 characters", async () => {
    await expect(decodeVinNumber("SHORT123")).rejects.toThrow(
      "Invalid VIN format. A standard Vehicle Identification Number must be exactly 17 characters."
    );
  });

  it("should provide sample luxury demo VINs for instant testing in the UI", () => {
    expect(SAMPLE_LUXURY_VINS.length).toBeGreaterThanOrEqual(3);
    expect(SAMPLE_LUXURY_VINS.some(s => s.make === "CADILLAC")).toBe(true);
    expect(SAMPLE_LUXURY_VINS.some(s => s.make === "MERCEDES-BENZ")).toBe(true);
  });

});
