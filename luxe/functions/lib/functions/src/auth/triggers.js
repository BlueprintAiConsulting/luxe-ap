"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserCreated = void 0;
const v1_1 = require("firebase-functions/v1");
const admin_1 = require("../lib/admin");
exports.onUserCreated = v1_1.auth.user().onCreate(async (user) => {
    const uid = user.uid;
    // Set custom claims
    await admin_1.admin.auth().setCustomUserClaims(uid, { role: "rider" });
    // Create User document
    const now = admin_1.admin.firestore.Timestamp.now();
    await admin_1.admin.firestore().collection("users").doc(uid).set({
        uid,
        role: "rider",
        phone: user.phoneNumber || "",
        email: user.email || null,
        firstName: "",
        lastName: "",
        searchName: "",
        stripeCustomerId: null,
        defaultPaymentMethodId: null,
        preferences: null,
        notes: "",
        totalRides: 0,
        createdAt: now,
        updatedAt: now,
        disabled: user.disabled,
    });
});
//# sourceMappingURL=triggers.js.map