import { auth } from "firebase-functions/v1";
import { admin } from "../lib/admin";

export const onUserCreated = auth.user().onCreate(async (user) => {
  const uid = user.uid;
  
  // Set custom claims
  await admin.auth().setCustomUserClaims(uid, { role: "rider" });

  // Create User document
  const now = admin.firestore.Timestamp.now();
  
  await admin.firestore().collection("users").doc(uid).set({
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
