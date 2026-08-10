import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Connect to Emulator
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.GCLOUD_PROJECT = "demo-luxe";

if (!getApps().length) {
  initializeApp({
    projectId: "demo-luxe",
  });
}

const auth = getAuth();
const db = getFirestore();

const seedUsers = [
  { uid: "adminA", phone: "+15550000001", role: "admin", name: "Admin Alice" },
  { uid: "driverA", phone: "+15550000002", role: "driver", name: "Driver Dan" },
  { uid: "driverB", phone: "+15550000003", role: "driver", name: "Driver Dave" },
  { uid: "riderA", phone: "+15550000004", role: "rider", name: "Rider Rachel" },
  { uid: "riderB", phone: "+15550000005", role: "rider", name: "Rider Ross" },
  { uid: "riderC", phone: "+15550000006", role: "rider", name: "Rider Rita" },
];

async function seed() {
  console.log("Seeding users...");
  const now = Timestamp.now();

  for (const u of seedUsers) {
    try {
      // 1. Try to create the auth user
      try {
        await auth.getUser(u.uid);
        console.log(`User ${u.uid} already exists in Auth. Updating claims...`);
      } catch (e: any) {
        if (e.code === "auth/user-not-found") {
          await auth.createUser({
            uid: u.uid,
            phoneNumber: u.phone,
            displayName: u.name,
          });
          console.log(`Created Auth user: ${u.uid}`);
        } else {
          throw e;
        }
      }

      // 2. Set custom claims
      await auth.setCustomUserClaims(u.uid, { role: u.role });
      console.log(`Set custom claim role=${u.role} for ${u.uid}`);

      // 3. Create or update Firestore doc
      const [firstName, lastName] = u.name.split(" ");
      const docRef = db.collection("users").doc(u.uid);
      
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        await docRef.set({
          uid: u.uid,
          role: u.role,
          phone: u.phone,
          email: null,
          firstName,
          lastName,
          searchName: u.name.toLowerCase(),
          stripeCustomerId: null,
          defaultPaymentMethodId: null,
          preferences: null,
          notes: "Seeded user",
          totalRides: 0,
          createdAt: now,
          updatedAt: now,
          disabled: false,
        });
        console.log(`Created Firestore doc for ${u.uid}`);
      } else {
        await docRef.update({ role: u.role, updatedAt: now });
        console.log(`Updated Firestore doc for ${u.uid}`);
      }

    } catch (err) {
      console.error(`Failed to seed user ${u.uid}:`, err);
    }
  }

  console.log("Seeding complete.");
  process.exit(0);
}

seed().catch(console.error);
