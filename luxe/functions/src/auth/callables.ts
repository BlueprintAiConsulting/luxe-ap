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
