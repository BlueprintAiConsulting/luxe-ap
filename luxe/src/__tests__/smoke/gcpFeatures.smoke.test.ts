import { describe, it, expect } from "vitest";
import { analyzeTripDebriefWithGemini } from "../../../functions/src/triggers/onTripCompletedDebrief";
import { calculatePredictiveStaging } from "../../../functions/src/services/routesPredictor";
import { Reservation } from "../../lib/types/reservation";

describe("Top Google Cloud Functions & Intelligence Services Smoke Tests", () => {
  
  it("Feature 1: Gemini 2.0 Flash / Vertex AI should generate a structured VIP trip debrief & sentiment score", async () => {
    const mockReservation = {
      reservationId: "res_vip_gemini_test",
      confirmationCode: "LUXE-GEMINI-01",
      status: "completed",
      riderId: "usr_vip_001",
      riderName: "Victoria Sterling (CEO)",
      riderPhone: "+13105550199",
      riderEmail: "v.sterling@apexholdings.example.com",
      bookedByAdmin: false,
      pickupAt: { toDate: () => new Date() },
      timezone: "America/Los_Angeles",
      tripType: "airport_departure",
      pickup: { formatted: "The Beverly Hills Hotel, CA", lat: 34.081, lng: -118.413, line1: null, line2: null, city: "Beverly Hills", state: "CA", postalCode: "90210", placeId: null, airportCode: null, notes: null },
      dropoff: { formatted: "LAX Bradley International Terminal, CA", lat: 33.942, lng: -118.408, line1: null, line2: null, city: "Los Angeles", state: "CA", postalCode: "90045", placeId: null, airportCode: "LAX", notes: null },
      stops: [],
      hours: null,
      passengers: 2,
      luggage: 3,
      flightNumber: "AF 066",
      airlineCode: "AF",
      classId: "suv",
      className: "Luxury SUV (Escalade ESV)",
      vehicleId: "veh_escalade_01",
      vehicleDescription: "2024 Cadillac Escalade ESV Sport Platinum",
      driverId: "drv_marcus",
      driverName: "Marcus Bennett",
      driverPhotoUrl: null,
      requestedDriverId: null,
      driverSubstituted: false,
      specialInstructions: "VIP prefers quiet cabin and chilled Fiji water.",
      preferences: {
        beverage: { brand: "Fiji Water", preference: "water_still", temperature: "chilled", notes: null },
        temperature: { targetF: 68 },
      },
      driverNotes: "Curbside arrival 15 mins early. Assisted with 3 Tumi bags. Flawless charter.",
      pricing: { currency: "usd", baseFareCents: 24500, estimatedTotalCents: 29400, gratuityCents: 4900, gratuityPercent: 20, gratuityEditable: true, tollsCents: 0, parkingCents: 0, promoDiscountCents: 0, subtotalCents: 24500, lineItems: [] },
      pricingRuleSetId: "rule_standard",
      waitMinutes: 0,
      tollsCents: 0,
      parkingCents: 0,
    } as unknown as Reservation;

    const chatLog = [
      "driver: Curbside staged at Door 4 with hazards on.",
      "rider: Perfect, stepping out with bags now.",
      "driver: Welcomed onboard. Cabin set to 68°F.",
    ];

    const debrief = await analyzeTripDebriefWithGemini(mockReservation, chatLog);

    expect(debrief).toBeDefined();
    expect(debrief.sentimentScore).toBe("positive");
    expect(debrief.vipSatisfactionFlag).toBe(true);
    expect(debrief.executiveSummary).toContain("Victoria Sterling");
    expect(debrief.serviceHighlights.length).toBeGreaterThan(0);
  });

  it("Feature 2: Google Maps Predictive Traffic Staging should calculate departure time and 15-min buffer", async () => {
    const targetPickup = new Date("2026-08-22T18:00:00Z"); // 6:00 PM peak traffic
    const plan = await calculatePredictiveStaging(
      "The Beverly Hills Hotel, 9641 Sunset Blvd, Beverly Hills, CA",
      "Los Angeles International Airport (LAX), Terminal 4",
      targetPickup
    );

    expect(plan).toBeDefined();
    expect(plan.estimatedTravelMinutes).toBeGreaterThan(20);
    expect(plan.recommendedBufferMinutes).toBe(15);
    expect(new Date(plan.recommendedDepartureTimestamp).getTime()).toBeLessThan(targetPickup.getTime());
    expect(["low", "moderate", "heavy"]).toContain(plan.trafficLevel);
    expect(plan.trafficNote).toBeDefined();
  });
});
