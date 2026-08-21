import { describe, it, expect } from "vitest";

describe("Chauffeur Financials, 70/30 Split & 1099-NEC Tax Center Smoke Tests", () => {
  
  it("should accurately calculate 70% base fare share, 100% tips, and 100% toll reimbursements", () => {
    const mockTrips = [
      {
        reservationId: "res_trip_01",
        baseFareCents: 20000, // $200 base
        gratuityCents: 4000,  // $40 tip (20%)
        tollsCents: 1500,     // $15 bridge toll
        parkingCents: 1000,   // $10 airport parking
        distanceMeters: 48280 // 30 miles
      },
      {
        reservationId: "res_trip_02",
        baseFareCents: 30000, // $300 base
        gratuityCents: 6000,  // $60 tip (20%)
        tollsCents: 0,
        parkingCents: 0,
        distanceMeters: 64373 // 40 miles
      }
    ];

    let totalGrossCharterCents = 0;
    let totalBaseShareCents = 0;
    let totalTipsCents = 0;
    let totalTollsReimbursedCents = 0;
    let totalMiles = 0;

    mockTrips.forEach((trip) => {
      const base = trip.baseFareCents;
      const gratuity = trip.gratuityCents;
      const tolls = trip.tollsCents + trip.parkingCents;

      totalGrossCharterCents += (base + gratuity + tolls);
      totalBaseShareCents += Math.round(base * 0.70); // 70% chauffeur split
      totalTipsCents += gratuity; // 100% tips
      totalTollsReimbursedCents += tolls; // 100% non-taxable toll reimbursement
      totalMiles += Math.round(trip.distanceMeters * 0.000621371);
    });

    const netTakeHomePayoutCents = totalBaseShareCents + totalTipsCents + totalTollsReimbursedCents;
    const standardMileageDeductionDollars = Math.round(totalMiles * 0.67);

    // Assertions
    // Trip 1: $140 base + $40 tip + $25 tolls = $205
    // Trip 2: $210 base + $60 tip + $0 tolls = $270
    // Total Payout: $475.00
    expect(totalBaseShareCents).toBe(35000); // $350.00 base share
    expect(totalTipsCents).toBe(10000);      // $100.00 tips
    expect(totalTollsReimbursedCents).toBe(2500); // $25.00 tolls
    expect(netTakeHomePayoutCents).toBe(47500); // $475.00 total take-home

    // IRS 1099-NEC & Mileage Assertions
    expect(totalMiles).toBe(70); // 30 + 40 miles
    expect(standardMileageDeductionDollars).toBe(47); // 70 * $0.67 = $46.90 -> $47
  });

  it("should verify company net margin calculation (30% retention)", () => {
    const grossBaseFaresCents = 1000000; // $10,000 in gross base fares
    const chauffeurBaseSplitCents = Math.round(grossBaseFaresCents * 0.70); // $7,000 (70%)
    const companyNetMarginCents = grossBaseFaresCents - chauffeurBaseSplitCents; // $3,000 (30%)

    expect(chauffeurBaseSplitCents).toBe(700000);
    expect(companyNetMarginCents).toBe(300000);
    expect(companyNetMarginCents / grossBaseFaresCents).toBe(0.30);
  });

});
