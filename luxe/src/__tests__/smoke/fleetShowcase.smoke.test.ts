import { describe, it, expect } from "vitest";
import { LUXURY_FLEET_SHOWCASE } from "../../lib/data/fleetShowcase";

describe("360 Fleet Showcase, Interior Gallery & Telemetry Smoke Tests", () => {
  
  it("should contain complete flagship vehicle showcase data for Escalade, S-Class, and Sprinter", () => {
    expect(LUXURY_FLEET_SHOWCASE.length).toBeGreaterThanOrEqual(3);

    const escalade = LUXURY_FLEET_SHOWCASE.find((v) => v.id === "escalade_esv");
    expect(escalade).toBeDefined();
    expect(escalade?.name).toBe("Cadillac Escalade ESV");
    expect(escalade?.classId).toBe("suv");
    expect(escalade?.passengers).toBe(6);
    expect(escalade?.luggage).toBe(6);
    expect(escalade?.angles.length).toBeGreaterThanOrEqual(3);
    expect(escalade?.interiorSnapshots.length).toBeGreaterThanOrEqual(4);

    const sClass = LUXURY_FLEET_SHOWCASE.find((v) => v.id === "mercedes_s580");
    expect(sClass).toBeDefined();
    expect(sClass?.name).toBe("Mercedes-Benz S 580 4MATIC");
    expect(sClass?.classId).toBe("sedan");
    expect(sClass?.passengers).toBe(3);
    expect(sClass?.luggage).toBe(3);
    expect(sClass?.angles.length).toBeGreaterThanOrEqual(3);

    const sprinter = LUXURY_FLEET_SHOWCASE.find((v) => v.id === "sprinter_jet");
    expect(sprinter).toBeDefined();
    expect(sprinter?.classId).toBe("sprinter");
    expect(sprinter?.passengers).toBe(14);
    expect(sprinter?.luggage).toBe(14);
    expect(sprinter?.angles.length).toBeGreaterThanOrEqual(2);
  });

  it("should verify photographic vehicle angles have valid image URLs and degree metrics", () => {
    LUXURY_FLEET_SHOWCASE.forEach((vehicle) => {
      vehicle.angles.forEach((ang) => {
        expect(ang.angleDeg).toBeGreaterThanOrEqual(0);
        expect(ang.angleDeg).toBeLessThanOrEqual(360);
        expect(ang.label).toBeDefined();
        expect(ang.imageUrl).toContain("http");
        expect(ang.tagline).toBeDefined();
      });
    });
  });

  it("should verify interior snapshot metadata and hotspot coordinate boundaries", () => {
    LUXURY_FLEET_SHOWCASE.forEach((vehicle) => {
      // Verify snapshots
      vehicle.interiorSnapshots.forEach((snap) => {
        expect(snap.id).toBeDefined();
        expect(snap.title).toBeDefined();
        expect(snap.description).toBeDefined();
        expect(snap.imageUrl).toContain("http");
        expect(snap.tag).toBeDefined();
      });

      // Verify hotspots are within [0, 100]% position boundary
      vehicle.hotspots.forEach((hotspot) => {
        expect(hotspot.x).toBeGreaterThanOrEqual(0);
        expect(hotspot.x).toBeLessThanOrEqual(100);
        expect(hotspot.y).toBeGreaterThanOrEqual(0);
        expect(hotspot.y).toBeLessThanOrEqual(100);
        expect(hotspot.title).toBeDefined();
        expect(hotspot.detail).toBeDefined();
      });
    });
  });

});
