import { https } from "firebase-functions/v2";
import { admin } from "../lib/admin";
import { z } from "zod";

const setRoleSchema = z.object({
  uid: z.string(),
  role: z.enum(["rider", "driver", "admin"]),
});

export const setUserRole = https.onCall(async (request) => {
  // 1. Verify Authentication & Admin Role
  if (!request.auth || request.auth.token.role !== "admin") {
    throw new https.HttpsError(
      "permission-denied",
      "Only admins can change user roles."
    );
  }

  // 2. Validate input
  const parsed = setRoleSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new https.HttpsError(
      "invalid-argument",
      "Invalid parameters for setUserRole."
    );
  }

  const { uid, role } = parsed.data;

  try {
    // 3. Set custom claim
    await admin.auth().setCustomUserClaims(uid, { role });

    // 4. Update Firestore
    // Note: The client must refresh its ID token for the new claim to take effect.
    await admin.firestore().collection("users").doc(uid).update({ 
      role,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    return { success: true, role };
  } catch (error) {
    console.error("Error setting user role:", error);
    throw new https.HttpsError("internal", "Failed to update user role.");
  }
});
export const demoPromoteToAdmin = https.onCall(async (request) => {
  if (!request.auth) {
    throw new https.HttpsError("unauthenticated", "Must be logged in.");
  }
  const uid = request.auth.uid;
  try {
    await admin.auth().setCustomUserClaims(uid, { role: "admin" });
    await admin.firestore().collection("users").doc(uid).update({ 
      role: "admin",
      updatedAt: admin.firestore.Timestamp.now(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error promoting to admin:", error);
    throw new https.HttpsError("internal", "Failed to promote.");
  }
});

const demoLoginSchema = z.object({
  role: z.enum(["rider", "driver", "admin"]),
});

export const loginAsDemoUser = https.onCall(async (request) => {
  const parsed = demoLoginSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new https.HttpsError("invalid-argument", "Role must be rider, driver, or admin.");
  }
  const { role } = parsed.data;

  const demoAccounts = {
    rider: {
      uid: "demo-rider-vip-uid",
      email: "rider@luxe.app",
      displayName: "Alexander Wright (VIP Rider)",
      role: "rider" as const,
    },
    driver: {
      uid: "demo-chauffeur-01-uid",
      email: "driver@luxe.app",
      displayName: "Marcus Bennett (Lead Chauffeur)",
      role: "driver" as const,
    },
    admin: {
      uid: "demo-admin-ops-uid",
      email: "admin@luxe.app",
      displayName: "Victoria Sterling (Dispatch Director)",
      role: "admin" as const,
    },
  };

  const account = demoAccounts[role];

  try {
    // 1. Check or create Firebase Auth user
    try {
      await admin.auth().getUser(account.uid);
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        await admin.auth().createUser({
          uid: account.uid,
          email: account.email,
          displayName: account.displayName,
        });
      }
    }

    // 2. Set Custom Role Claim
    await admin.auth().setCustomUserClaims(account.uid, { role: account.role });

    // 3. Sync User Profile in Firestore
    await admin.firestore().collection("users").doc(account.uid).set({
      uid: account.uid,
      email: account.email,
      displayName: account.displayName,
      role: account.role,
      isDemo: true,
      updatedAt: admin.firestore.Timestamp.now(),
    }, { merge: true });

    // If driver, ensure driver record exists for dispatch & today's schedule
    if (account.role === "driver") {
      await admin.firestore().collection("drivers").doc(account.uid).set({
        driverId: account.uid,
        displayName: account.displayName,
        email: account.email,
        phone: "+1 (310) 555-0199",
        active: true,
        rating: 4.98,
        photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256",
        vehicleDescription: "2025 Mercedes-Maybach S 580 (Obsidian Black)",
        updatedAt: admin.firestore.Timestamp.now(),
      }, { merge: true });
    }

    // 4. Create custom token
    const customToken = await admin.auth().createCustomToken(account.uid, { role: account.role });

    return {
      customToken,
      role: account.role,
      displayName: account.displayName,
    };
  } catch (error: any) {
    console.error("Error generating demo token:", error);
    throw new https.HttpsError("internal", error.message || "Failed to generate demo session.");
  }
});

