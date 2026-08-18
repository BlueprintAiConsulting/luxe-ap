import { SquareClient, SquareEnvironment, SquareError } from "square";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

// Environment & Credentials
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN || "";
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT === "production" 
  ? SquareEnvironment.Production 
  : SquareEnvironment.Sandbox;

export const squareClient = new SquareClient({
  token: SQUARE_ACCESS_TOKEN,
  environment: SQUARE_ENVIRONMENT,
});

export interface CreatePaymentParams {
  sourceId: string; // Token from Square Web SDK (cnon:..., ccof:... or Apple/Google Pay nonce)
  amountCents: number;
  currency?: string;
  reservationId: string;
  confirmationCode?: string;
  customerId?: string;
  note?: string;
  idempotencyKey?: string;
  autocomplete?: boolean; // true = capture immediately, false = pre-auth hold
  verificationToken?: string; // For 3D Secure / SCA verification if required
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  status?: string;
  receiptUrl?: string;
  orderId?: string;
  cardBrand?: string;
  cardLast4?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  errorMessage?: string;
  isMock?: boolean;
}

/**
 * Creates and authorizes/captures a payment via Square Payments API.
 * Gracefully falls back to sandbox mock if SQUARE_ACCESS_TOKEN is not yet configured.
 */
export async function createSquarePayment(params: CreatePaymentParams): Promise<PaymentResult> {
  const {
    sourceId,
    amountCents,
    currency = "USD",
    reservationId,
    confirmationCode = "LUXE",
    customerId,
    note,
    idempotencyKey = `pay_${reservationId}_${Date.now()}`,
    autocomplete = true,
    verificationToken,
  } = params;

  if (!SQUARE_ACCESS_TOKEN) {
    console.warn("⚠️ SQUARE_ACCESS_TOKEN not set. Simulating successful Square sandbox authorization.");
    return {
      success: true,
      paymentId: `sq_mock_${Date.now()}`,
      status: autocomplete ? "COMPLETED" : "APPROVED",
      receiptUrl: `https://squareup.com/receipt/preview/mock_${reservationId}`,
      cardBrand: "VISA",
      cardLast4: "1111",
      cardExpMonth: 12,
      cardExpYear: 2028,
      isMock: true,
    };
  }

  try {
    const response = await squareClient.payments.create({
      sourceId,
      idempotencyKey,
      amountMoney: {
        amount: BigInt(amountCents),
        currency: currency as any,
      },
      autocomplete,
      customerId,
      referenceId: reservationId,
      note: note || `LUXE Executive Charter #${confirmationCode}`,
      verificationToken,
    });

    const payment = response.payment;
    if (!payment) {
      return {
        success: false,
        errorMessage: "No payment object returned from Square API",
      };
    }

    const cardDetails = payment.cardDetails?.card;

    return {
      success: payment.status === "COMPLETED" || payment.status === "APPROVED",
      paymentId: payment.id,
      status: payment.status,
      receiptUrl: payment.receiptUrl || undefined,
      orderId: payment.orderId || undefined,
      cardBrand: cardDetails?.cardBrand || undefined,
      cardLast4: cardDetails?.last4 || undefined,
      cardExpMonth: cardDetails?.expMonth ? Number(cardDetails.expMonth) : undefined,
      cardExpYear: cardDetails?.expYear ? Number(cardDetails.expYear) : undefined,
    };
  } catch (error: any) {
    console.error("Square createPayment error:", error);
    let errorMessage = "Payment processing failed";
    if (error instanceof SquareError && error.errors && error.errors.length > 0) {
      errorMessage = (error.errors as any[]).map((e: any) => e.detail || e.category).join("; ");
    } else if (error.message) {
      errorMessage = error.message;
    }
    return {
      success: false,
      errorMessage,
    };
  }
}

/**
 * Creates or retrieves a Square Customer associated with a Firebase user UID.
 */
export async function createOrGetSquareCustomer(user: {
  uid: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
}): Promise<string | null> {
  if (!SQUARE_ACCESS_TOKEN) return `sq_cust_mock_${user.uid}`;

  try {
    // Check if user already has squareCustomerId in Firestore
    const userDoc = await db.collection("users").doc(user.uid).get();
    const existingCustId = userDoc.data()?.squareCustomerId;
    if (existingCustId) return existingCustId;

    // Search Square for existing customer by referenceId
    const searchRes = await squareClient.customers.search({
      query: {
        filter: {
          referenceId: {
            exact: user.uid,
          },
        },
      },
    });

    if (searchRes.customers && searchRes.customers.length > 0) {
      const custId = searchRes.customers[0].id!;
      await db.collection("users").doc(user.uid).set({ squareCustomerId: custId }, { merge: true });
      return custId;
    }

    // Create new customer
    const [firstName, ...rest] = (user.name || "VIP Passenger").split(" ");
    const lastName = rest.join(" ");

    const createRes = await squareClient.customers.create({
      idempotencyKey: `cust_${user.uid}_${Date.now()}`,
      givenName: firstName || "VIP",
      familyName: lastName || "Passenger",
      emailAddress: user.email || undefined,
      phoneNumber: user.phone || undefined,
      referenceId: user.uid,
      note: "LUXE VIP Chauffeur & Livery Account",
    });

    const newCustId = createRes.customer?.id || null;
    if (newCustId) {
      await db.collection("users").doc(user.uid).set({ squareCustomerId: newCustId }, { merge: true });
    }
    return newCustId;
  } catch (error) {
    console.error("Square createOrGetSquareCustomer error:", error);
    return null;
  }
}

/**
 * Vaults a card on file for repeat executive charter bookings.
 */
export async function vaultSquareCard(params: {
  customerId: string;
  sourceId: string; // Token from Square Web SDK
  cardholderName?: string;
  verificationToken?: string;
}): Promise<{ success: boolean; cardId?: string; brand?: string; last4?: string; errorMessage?: string }> {
  if (!SQUARE_ACCESS_TOKEN) {
    return {
      success: true,
      cardId: `sq_card_mock_${Date.now()}`,
      brand: "VISA",
      last4: "1111",
    };
  }

  try {
    const response = await squareClient.cards.create({
      idempotencyKey: `card_${params.customerId}_${Date.now()}`,
      sourceId: params.sourceId,
      card: {
        customerId: params.customerId,
        cardholderName: params.cardholderName,
      },
      verificationToken: params.verificationToken,
    });

    const card = response.card;
    if (!card) {
      return { success: false, errorMessage: "Failed to vault card" };
    }

    return {
      success: true,
      cardId: card.id,
      brand: card.cardBrand,
      last4: card.last4,
    };
  } catch (error: any) {
    console.error("Square vaultCard error:", error);
    return {
      success: false,
      errorMessage: error.message || "Failed to vault card on file",
    };
  }
}

/**
 * Refunds a Square payment (e.g. on eligible cancellation or tariff adjustment).
 */
export async function refundSquarePayment(params: {
  paymentId: string;
  amountCents: number;
  currency?: string;
  reason?: string;
}): Promise<{ success: boolean; refundId?: string; errorMessage?: string }> {
  if (!SQUARE_ACCESS_TOKEN) {
    return { success: true, refundId: `sq_ref_mock_${Date.now()}` };
  }

  try {
    const response = await squareClient.refunds.refundPayment({
      idempotencyKey: `ref_${params.paymentId}_${Date.now()}`,
      paymentId: params.paymentId,
      amountMoney: {
        amount: BigInt(params.amountCents),
        currency: (params.currency || "USD") as any,
      },
      reason: params.reason || "LUXE Charter Cancellation / Adjustment",
    });

    return {
      success: response.refund?.status === "COMPLETED" || response.refund?.status === "PENDING",
      refundId: response.refund?.id,
    };
  } catch (error: any) {
    console.error("Square refundPayment error:", error);
    return {
      success: false,
      errorMessage: error.message || "Refund failed",
    };
  }
}

export interface TerminalCheckoutParams {
  amountCents: number;
  currency?: string;
  reservationId: string;
  confirmationCode?: string;
  deviceId?: string;
  note?: string;
}

export interface TerminalCheckoutResult {
  success: boolean;
  checkoutId?: string;
  status?: string;
  paymentId?: string;
  errorMessage?: string;
}

/**
 * Creates an in-vehicle card dip/tap prompt on a Square Terminal device.
 */
export async function createSquareTerminalCheckout(params: TerminalCheckoutParams): Promise<TerminalCheckoutResult> {
  if (!SQUARE_ACCESS_TOKEN) {
    return {
      success: true,
      checkoutId: `sq_term_mock_${Date.now()}`,
      status: "PENDING",
    };
  }

  try {
    const response = await squareClient.terminal.checkouts.create({
      idempotencyKey: `term_${params.reservationId}_${Date.now()}`,
      checkout: {
        amountMoney: {
          amount: BigInt(params.amountCents),
          currency: (params.currency || "USD") as any,
        },
        deviceOptions: {
          deviceId: params.deviceId || process.env.SQUARE_DEFAULT_DEVICE_ID || "DEVICE_SIMULATOR",
        },
        referenceId: params.confirmationCode || params.reservationId,
        note: params.note || `LUXE In-Vehicle Settlement (${params.confirmationCode})`,
      },
    });

    const checkout = response.checkout;
    return {
      success: true,
      checkoutId: checkout?.id,
      status: checkout?.status,
    };
  } catch (error: any) {
    console.error("Square createTerminalCheckout error:", error);
    return {
      success: false,
      errorMessage: error.message || "Failed to create terminal checkout",
    };
  }
}

/**
 * Polls the real-time status of a Square Terminal checkout.
 */
export async function getSquareTerminalCheckout(checkoutId: string): Promise<TerminalCheckoutResult> {
  if (!SQUARE_ACCESS_TOKEN || checkoutId.startsWith("sq_term_mock_")) {
    return {
      success: true,
      checkoutId,
      status: "COMPLETED",
      paymentId: `sq_pay_mock_${Date.now()}`,
    };
  }

  try {
    const response = await squareClient.terminal.checkouts.get({ checkoutId });
    const checkout = response.checkout;
    const paymentIds = checkout?.paymentIds || [];
    return {
      success: true,
      checkoutId: checkout?.id,
      status: checkout?.status,
      paymentId: paymentIds.length > 0 ? paymentIds[0] : undefined,
    };
  } catch (error: any) {
    console.error("Square getTerminalCheckout error:", error);
    return {
      success: false,
      errorMessage: error.message || "Failed to get terminal status",
    };
  }
}

/**
 * Cancels an active Square Terminal checkout prompt.
 */
export async function cancelSquareTerminalCheckout(checkoutId: string): Promise<{ success: boolean; errorMessage?: string }> {
  if (!SQUARE_ACCESS_TOKEN || checkoutId.startsWith("sq_term_mock_")) {
    return { success: true };
  }

  try {
    await squareClient.terminal.checkouts.cancel({ checkoutId });
    return { success: true };
  } catch (error: any) {
    console.error("Square cancelTerminalCheckout error:", error);
    return {
      success: false,
      errorMessage: error.message || "Failed to cancel terminal checkout",
    };
  }
}
