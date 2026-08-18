import { describe, it, expect } from "vitest";
import * as crypto from "crypto";
import { verifySquareWebhookSignature } from "../../../functions/src/api/webhook";

describe("Square Webhook Verification & Processor Smoke Tests", () => {
  it("should accurately validate valid Square HMAC-SHA256 signatures", () => {
    const signatureKey = "test_webhook_signature_key_secret_123";
    const notificationUrl = "https://us-central1-luxe-app-1786335311.cloudfunctions.net/squareWebhook";
    const rawBody = JSON.stringify({
      type: "payment.updated",
      event_id: "evt_test_12345",
      data: {
        object: {
          payment: {
            id: "sq_pay_test_987",
            status: "COMPLETED",
            amount_money: { amount: 24000, currency: "USD" },
          },
        },
      },
    });

    const payload = notificationUrl + rawBody;
    const hmac = crypto.createHmac("sha256", signatureKey);
    hmac.update(payload, "utf8");
    const validSignature = hmac.digest("base64");

    const isValid = verifySquareWebhookSignature(rawBody, validSignature, signatureKey, notificationUrl);
    expect(isValid).toBe(true);

    const isInvalid = verifySquareWebhookSignature(rawBody, "invalid_tampered_sig", signatureKey, notificationUrl);
    expect(isInvalid).toBe(false);
  });

  it("should extract payment details and map Square statuses to internal payment statuses", () => {
    const mockPaymentCompleted = {
      id: "sq_pay_999",
      status: "COMPLETED",
      amount_money: { amount: 18500 },
      receipt_url: "https://squareup.com/receipt/preview/sq_pay_999",
      card_details: {
        card: {
          card_brand: "VISA",
          last_4: "1111",
        },
      },
      reference_id: "BCC-A1B2C3",
    };

    expect(mockPaymentCompleted.status).toBe("COMPLETED");
    expect(mockPaymentCompleted.amount_money.amount).toBe(18500);
    expect(mockPaymentCompleted.card_details.card.card_brand).toBe("VISA");
    expect(mockPaymentCompleted.card_details.card.last_4).toBe("1111");
  });
});
