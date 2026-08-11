"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.demoPromoteToAdmin = exports.setUserRole = void 0;
const v2_1 = require("firebase-functions/v2");
const admin_1 = require("../lib/admin");
const zod_1 = require("zod");
const setRoleSchema = zod_1.z.object({
    uid: zod_1.z.string(),
    role: zod_1.z.enum(["rider", "driver", "admin"]),
});
exports.setUserRole = v2_1.https.onCall(async (request) => {
    // 1. Verify Authentication & Admin Role
    if (!request.auth || request.auth.token.role !== "admin") {
        throw new v2_1.https.HttpsError("permission-denied", "Only admins can change user roles.");
    }
    // 2. Validate input
    const parsed = setRoleSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new v2_1.https.HttpsError("invalid-argument", "Invalid parameters for setUserRole.");
    }
    const { uid, role } = parsed.data;
    try {
        // 3. Set custom claim
        await admin_1.admin.auth().setCustomUserClaims(uid, { role });
        // 4. Update Firestore
        // Note: The client must refresh its ID token for the new claim to take effect.
        await admin_1.admin.firestore().collection("users").doc(uid).update({
            role,
            updatedAt: admin_1.admin.firestore.Timestamp.now(),
        });
        return { success: true, role };
    }
    catch (error) {
        console.error("Error setting user role:", error);
        throw new v2_1.https.HttpsError("internal", "Failed to update user role.");
    }
});
exports.demoPromoteToAdmin = v2_1.https.onCall(async (request) => {
    if (!request.auth) {
        throw new v2_1.https.HttpsError("unauthenticated", "Must be logged in.");
    }
    const uid = request.auth.uid;
    try {
        await admin_1.admin.auth().setCustomUserClaims(uid, { role: "admin" });
        await admin_1.admin.firestore().collection("users").doc(uid).update({
            role: "admin",
            updatedAt: admin_1.admin.firestore.Timestamp.now(),
        });
        return { success: true };
    }
    catch (error) {
        console.error("Error promoting to admin:", error);
        throw new v2_1.https.HttpsError("internal", "Failed to promote.");
    }
});
//# sourceMappingURL=callables.js.map