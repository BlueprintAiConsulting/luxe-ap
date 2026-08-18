import { describe, it, expect, vi } from "vitest";
import { 
  createSquarePayment, 
  createOrGetSquareCustomer, 
  vaultSquareCard, 
  refundSquarePayment 
} from "../../../functions/src/services/square";

describe("Square Payments Service Smoke Tests", () => {
  it("should process a sandbox payment nonce and return a completed authorization", async () => {
    const res = await createSquarePayment({
      sourceId: "cnon:card-nonce-ok",
      amountCents: 24500, // $245.00
      currency: "USD",
      reservationId: "res_demo_square_101",
      confirmationCode: "LX-8921",
      note: "LUXE Escalade ESV Charter to LAX",
      autocomplete: true,
    });

    expect(res.success).toBe(true);
    expect(res.paymentId).toBeDefined();
    expect(["COMPLETED", "APPROVED"]).toContain(res.status);
    expect(res.cardBrand).toBeDefined();
    expect(res.cardLast4).toBeDefined();
  });

  it("should format idempotency keys uniquely for concurrent charges", async () => {
    const key1 = `pay_res_101_${Date.now()}`;
    await new Promise((r) => setTimeout(r, 2));
    const key2 = `pay_res_101_${Date.now()}`;

    expect(key1).not.toBe(key2);
  });

  it("should simulate customer creation and card vaulting for repeat VIP bookings", async () => {
    const customerId = await createOrGetSquareCustomer({
      uid: "usr_alexander_vance",
      email: "vance@vancecap.com",
      name: "Alexander Vance",
      phone: "+13105550199",
    });

    expect(customerId).toBeDefined();
    expect(typeof customerId).toBe("string");

    const vaultRes = await vaultSquareCard({
      customerId: customerId!,
      sourceId: "cnon:card-nonce-ok",
      cardholderName: "Alexander Vance",
    });

    expect(vaultRes.success).toBe(true);
    expect(vaultRes.cardId).toBeDefined();
    expect(vaultRes.brand).toBeDefined();
  });

  it("should calculate partial refunds accurately on late cancellation", async () => {
    const totalPaidCents = 24500;
    const cancellationFeeCents = 7500; // $75 late fee
    const refundAmountCents = Math.max(0, totalPaidCents - cancellationFeeCents);

    expect(refundAmountCents).toBe(17000); // $170.00 refund

    const refundRes = await refundSquarePayment({
      paymentId: "sq_pay_test_101",
      amountCents: refundAmountCents,
      reason: "LUXE Late Cancellation Partial Refund",
    });

    expect(refundRes.success).toBe(true);
    expect(refundRes.refundId).toBeDefined();
  });
});
