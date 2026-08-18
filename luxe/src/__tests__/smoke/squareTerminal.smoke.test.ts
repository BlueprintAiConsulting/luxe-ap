import { describe, it, expect } from "vitest";
import { 
  createSquareTerminalCheckout, 
  getSquareTerminalCheckout, 
  cancelSquareTerminalCheckout 
} from "../../../functions/src/services/square";

describe("Square Terminal In-Vehicle Dip/Tap Bridge Smoke Tests", () => {
  it("should initialize a terminal checkout prompt with formatted notes and reference IDs", async () => {
    const result = await createSquareTerminalCheckout({
      amountCents: 4500, // $45.00 for extra wait time
      reservationId: "res_terminal_12345",
      confirmationCode: "BCC-K8L9M2",
      deviceId: "DEVICE_SIM_001",
      note: "LUXE In-Vehicle Extra Wait Time (#BCC-K8L9M2)",
    });

    expect(result.success).toBe(true);
    expect(result.checkoutId).toBeDefined();
    expect(result.status).toBeDefined();
  });

  it("should poll terminal checkout status and return simulated or live settlement", async () => {
    const mockCheckoutId = `sq_term_mock_${Date.now()}`;
    const statusResult = await getSquareTerminalCheckout(mockCheckoutId);

    expect(statusResult.success).toBe(true);
    expect(statusResult.checkoutId).toBe(mockCheckoutId);
    expect(statusResult.status).toBe("COMPLETED");
    expect(statusResult.paymentId).toBeDefined();
  });

  it("should cancel an active terminal checkout cleanly", async () => {
    const cancelResult = await cancelSquareTerminalCheckout(`sq_term_mock_${Date.now()}`);
    expect(cancelResult.success).toBe(true);
  });
});
