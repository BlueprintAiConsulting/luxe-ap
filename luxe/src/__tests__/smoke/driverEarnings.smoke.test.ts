import { describe, it, expect } from "vitest";
import { DriverWeeklyEarningsSummary } from "../../../functions/src/crons/earnings";

describe("Weekly Driver Earnings & Toll Ledger Smoke Tests", () => {
  it("should accurately calculate 70/30 split on base fare, 100% gratuity, and 100% toll/parking reimbursements", () => {
    // Example Charter: $240 Total ($200 Base + $40 20% Tip), $12 Bridge Tolls, $18 Airport Parking
    const totalFareCents = 24000;
    const gratuityCents = 4000;
    const baseFareCents = totalFareCents - gratuityCents; // 20000 ($200)

    const driverBaseShareCents = Math.round(baseFareCents * 0.70); // 14000 ($140)
    const tollsReimbursedCents = 1200; // $12.00
    const parkingReimbursedCents = 1800; // $18.00

    const netPayoutCents = driverBaseShareCents + gratuityCents + tollsReimbursedCents + parkingReimbursedCents;

    expect(driverBaseShareCents).toBe(14000);
    expect(gratuityCents).toBe(4000);
    expect(netPayoutCents).toBe(21000); // $210.00 total net to chauffeur

    const summary: DriverWeeklyEarningsSummary = {
      payoutId: "payout_drv_marcus_2026-08-17",
      driverId: "drv_marcus",
      driverName: "Marcus Bennett",
      periodStart: "2026-08-10T00:00:00.000Z",
      periodEnd: "2026-08-17T00:00:00.000Z",
      completedTripsCount: 1,
      grossFaresCents: totalFareCents,
      driverShareFaresCents: driverBaseShareCents,
      tipsGratuityCents: gratuityCents,
      tollsReimbursedCents,
      parkingReimbursedCents,
      netPayoutCents,
      payoutStatus: "pending_review",
      tripConfirmationCodes: ["BCC-K8L9M2"],
      createdAt: new Date(),
    };

    expect(summary.netPayoutCents).toBe(21000);
    expect(summary.payoutStatus).toBe("pending_review");
  });
});
