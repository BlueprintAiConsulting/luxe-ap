import { signInWithPopup, User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, appleProvider } from "./client";

export interface AppleSignInResult {
  user: User;
  isNewUser: boolean;
}

export async function signInWithAppleEnsureProfile(): Promise<AppleSignInResult> {
  const result = await signInWithPopup(auth, appleProvider);
  const user = result.user;

  const userDocRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDocRef);

  if (userSnap.exists()) {
    return { user, isNewUser: false };
  }

  // Extract names
  const [firstName, ...rest] = (user.displayName || "").split(" ");
  const lastName = rest.join(" ");

  // Create new profile default to rider
  const initialUserPayload = {
    uid: user.uid,
    role: "rider",
    phone: user.phoneNumber || "",
    email: user.email || null,
    firstName: firstName || "",
    lastName: lastName || "",
    searchName: (user.displayName || "").toLowerCase(),
    stripeCustomerId: null,
    defaultPaymentMethodId: null,
    preferences: null,
    notes: "",
    totalRides: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    disabled: false,
  };

  await setDoc(userDocRef, initialUserPayload);

  return { user, isNewUser: true };
}
