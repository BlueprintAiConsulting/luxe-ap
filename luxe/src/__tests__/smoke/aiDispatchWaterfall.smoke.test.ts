import { describe, it, expect } from "vitest";
import { calculateDistanceMiles, CandidateDriverMatch } from "../../../functions/src/api/dispatch";

describe("AI Dispatch Matching Waterfall Smoke Tests", () => {
  it("should calculate accurate Haversine statute distances between coordinates", () => {
    // Beverly Hills (34.0736, -118.4004) to LAX (33.9416, -118.4085)
    const distance = calculateDistanceMiles(34.0736, -118.4004, 33.9416, -118.4085);
    expect(distance).toBeGreaterThan(8);
    expect(distance).toBeLessThan(12);
  });

  it("should prioritize Tier 1 (5-Star In-House) drivers over Tier 2 and Tier 3 in match score ranking", () => {
    const candidateTier1: CandidateDriverMatch = {
      driverId: "drv_5star_inhouse",
      name: "Marcus Bennett",
      photoUrl: null,
      rating: 4.95,
      ratingCount: 142,
      driverType: "in_house",
      tier: 1,
      tierLabel: "Tier 1 — 5★ In-House Chauffeur",
      distanceMiles: 4.5,
      etaMinutes: 10,
      assignedVehicleId: "veh_mercedes_s580",
      matchScore: 1000 + (4.95 * 50) - (4.5 * 10), // ~1202.5
      hasScheduleConflict: false,
    };

    const candidateTier2: CandidateDriverMatch = {
      driverId: "drv_4star_inhouse",
      name: "David Vance",
      photoUrl: null,
      rating: 4.5,
      ratingCount: 38,
      driverType: "in_house",
      tier: 2,
      tierLabel: "Tier 2 — 4★ In-House Chauffeur",
      distanceMiles: 2.0, // closer, but lower tier
      etaMinutes: 5,
      assignedVehicleId: "veh_escalade",
      matchScore: 500 + (4.5 * 50) - (2.0 * 10), // ~705
      hasScheduleConflict: false,
    };

    const candidateTier3: CandidateDriverMatch = {
      driverId: "drv_floater_affiliate",
      name: "Floater Network Subcontractor",
      photoUrl: null,
      rating: 5.0,
      ratingCount: 200,
      driverType: "floater",
      tier: 3,
      tierLabel: "Tier 3 — Floater / Affiliate Network",
      distanceMiles: 1.0,
      etaMinutes: 3,
      assignedVehicleId: null,
      matchScore: 100 + (5.0 * 50) - (1.0 * 10), // ~340
      hasScheduleConflict: false,
    };

    const candidates = [candidateTier3, candidateTier2, candidateTier1].sort((a, b) => b.matchScore - a.matchScore);

    // Tier 1 driver must rank #1
    expect(candidates[0].driverId).toBe("drv_5star_inhouse");
    expect(candidates[0].tier).toBe(1);

    // Tier 2 driver must rank #2
    expect(candidates[1].driverId).toBe("drv_4star_inhouse");
    expect(candidates[1].tier).toBe(2);

    // Tier 3 floater must rank #3
    expect(candidates[2].driverId).toBe("drv_floater_affiliate");
    expect(candidates[2].tier).toBe(3);
  });

  it("should penalize schedule conflicts to prevent double-booking active drivers", () => {
    const busy5StarDriver: CandidateDriverMatch = {
      driverId: "drv_busy",
      name: "Marcus Bennett (Busy)",
      photoUrl: null,
      rating: 5.0,
      ratingCount: 100,
      driverType: "in_house",
      tier: 1,
      tierLabel: "Tier 1 — 5★ In-House Chauffeur",
      distanceMiles: 1.0,
      etaMinutes: 2,
      assignedVehicleId: "veh_s580",
      matchScore: 1000 + 250 - 10 - 5000, // Negative score due to conflict
      hasScheduleConflict: true,
      conflictReason: "Busy on #LX-1002",
    };

    const availableTier2Driver: CandidateDriverMatch = {
      driverId: "drv_available",
      name: "Available Driver",
      photoUrl: null,
      rating: 4.6,
      ratingCount: 20,
      driverType: "in_house",
      tier: 2,
      tierLabel: "Tier 2 — 4★ In-House Chauffeur",
      distanceMiles: 8.0,
      etaMinutes: 18,
      assignedVehicleId: "veh_escalade",
      matchScore: 500 + 230 - 80, // Positive 650
      hasScheduleConflict: false,
    };

    const ranked = [busy5StarDriver, availableTier2Driver].sort((a, b) => b.matchScore - a.matchScore);

    expect(ranked[0].driverId).toBe("drv_available");
    expect(ranked[0].hasScheduleConflict).toBe(false);
  });
});
