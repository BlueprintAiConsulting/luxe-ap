"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.squareClient = void 0;
exports.createSquarePayment = createSquarePayment;
exports.createOrGetSquareCustomer = createOrGetSquareCustomer;
exports.vaultSquareCard = vaultSquareCard;
exports.refundSquarePayment = refundSquarePayment;
const square_1 = require("square");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
// Environment & Credentials
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN || "";
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT === "production"
    ? square_1.SquareEnvironment.Production
    : square_1.SquareEnvironment.Sandbox;
exports.squareClient = new square_1.SquareClient({
    token: SQUARE_ACCESS_TOKEN,
    environment: SQUARE_ENVIRONMENT,
});
/**
 * Creates and authorizes/captures a payment via Square Payments API.
 * Gracefully falls back to sandbox mock if SQUARE_ACCESS_TOKEN is not yet configured.
 */
async function createSquarePayment(params) {
    const { sourceId, amountCents, currency = "USD", reservationId, confirmationCode = "LUXE", customerId, note, idempotencyKey = `pay_${reservationId}_${Date.now()}`, autocomplete = true, verificationToken, } = params;
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
        const response = await exports.squareClient.payments.create({
            sourceId,
            idempotencyKey,
            amountMoney: {
                amount: BigInt(amountCents),
                currency: currency,
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
    }
    catch (error) {
        console.error("Square createPayment error:", error);
        let errorMessage = "Payment processing failed";
        if (error instanceof square_1.SquareError && error.errors && error.errors.length > 0) {
            errorMessage = error.errors.map((e) => e.detail || e.category).join("; ");
        }
        else if (error.message) {
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
async function createOrGetSquareCustomer(user) {
    if (!SQUARE_ACCESS_TOKEN)
        return `sq_cust_mock_${user.uid}`;
    try {
        // Check if user already has squareCustomerId in Firestore
        const userDoc = await db.collection("users").doc(user.uid).get();
        const existingCustId = userDoc.data()?.squareCustomerId;
        if (existingCustId)
            return existingCustId;
        // Search Square for existing customer by referenceId
        const searchRes = await exports.squareClient.customers.search({
            query: {
                filter: {
                    referenceId: {
                        exact: user.uid,
                    },
                },
            },
        });
        if (searchRes.customers && searchRes.customers.length > 0) {
            const custId = searchRes.customers[0].id;
            await db.collection("users").doc(user.uid).set({ squareCustomerId: custId }, { merge: true });
            return custId;
        }
        // Create new customer
        const [firstName, ...rest] = (user.name || "VIP Passenger").split(" ");
        const lastName = rest.join(" ");
        const createRes = await exports.squareClient.customers.create({
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
    }
    catch (error) {
        console.error("Square createOrGetSquareCustomer error:", error);
        return null;
    }
}
/**
 * Vaults a card on file for repeat executive charter bookings.
 */
async function vaultSquareCard(params) {
    if (!SQUARE_ACCESS_TOKEN) {
        return {
            success: true,
            cardId: `sq_card_mock_${Date.now()}`,
            brand: "VISA",
            last4: "1111",
        };
    }
    try {
        const response = await exports.squareClient.cards.create({
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
    }
    catch (error) {
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
async function refundSquarePayment(params) {
    if (!SQUARE_ACCESS_TOKEN) {
        return { success: true, refundId: `sq_ref_mock_${Date.now()}` };
    }
    try {
        const response = await exports.squareClient.refunds.refundPayment({
            idempotencyKey: `ref_${params.paymentId}_${Date.now()}`,
            paymentId: params.paymentId,
            amountMoney: {
                amount: BigInt(params.amountCents),
                currency: (params.currency || "USD"),
            },
            reason: params.reason || "LUXE Charter Cancellation / Adjustment",
        });
        return {
            success: response.refund?.status === "COMPLETED" || response.refund?.status === "PENDING",
            refundId: response.refund?.id,
        };
    }
    catch (error) {
        console.error("Square refundPayment error:", error);
        return {
            success: false,
            errorMessage: error.message || "Refund failed",
        };
    }
}
//# sourceMappingURL=square.js.map