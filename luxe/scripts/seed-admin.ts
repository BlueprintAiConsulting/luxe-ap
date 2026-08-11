import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as crypto from "crypto";

// Connect to Emulator
// process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
// process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.GCLOUD_PROJECT = "luxe-app-1786335311";

if (!getApps().length) {
  initializeApp({
    projectId: "luxe-app-1786335311",
  });
}

const auth = getAuth();
const db = getFirestore();

async function seedAdmin() {
  console.log("Seeding admin...");
  const now = Timestamp.now();
  const email = "drewhufnagle@gmail.com";
  const password = "Password123!"; // Default password
  
  let uid = "";

  try {
    try {
      const userRecord = await auth.getUserByEmail(email);
      uid = userRecord.uid;
      console.log(`User ${email} already exists with UID ${uid}.`);
      
      // Update password just in case
      await auth.updateUser(uid, { password });
    } catch (e: any) {
      if (e.code === "auth/user-not-found") {
        const newUser = await auth.createUser({
          email: email,
          password: password,
          displayName: "Drew Hufnagle",
        });
        uid = newUser.uid;
        console.log(`Created Auth user: ${uid}`);
      } else {
        throw e;
      }
    }

    // Set custom claims
    await auth.setCustomUserClaims(uid, { role: "admin" });
    console.log(`Set custom claim role=admin for ${uid}`);

    // Create or update Firestore doc
    const docRef = db.collection("users").doc(uid);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      await docRef.set({
        uid: uid,
        role: "admin",
        phone: "",
        email: email,
        firstName: "Drew",
        lastName: "Hufnagle",
        searchName: "drew hufnagle",
        stripeCustomerId: null,
        defaultPaymentMethodId: null,
        preferences: null,
        notes: "Admin user seeded via script",
        totalRides: 0,
        createdAt: now,
        updatedAt: now,
        disabled: false,
      });
      console.log(`Created Firestore doc for ${uid}`);
    } else {
      await docRef.update({ role: "admin", updatedAt: now });
      console.log(`Updated Firestore doc for ${uid}`);
    }

    console.log("Admin seeding complete. Password is:", password);
  } catch (err) {
    console.error(`Failed to seed admin:`, err);
  }

  process.exit(0);
}

seedAdmin().catch(console.error);
