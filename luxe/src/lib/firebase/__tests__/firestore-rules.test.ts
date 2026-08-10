import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { setDoc, doc, getDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  // Read the rules file
  const rulesPath = resolve(__dirname, "../../../../firestore.rules");
  const rules = readFileSync(rulesPath, "utf8");

  // Initialize the test environment
  testEnv = await initializeTestEnvironment({
    projectId: "luxe-rules-test",
    firestore: {
      rules,
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

beforeEach(async () => {
  // Clear the database between tests
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Firestore Security Rules", () => {

  describe("Users Collection", () => {
    it("denies unauthenticated access to users", async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(unauthedDb, "users/riderA")));
    });

    it("allows a user to read their own document", async () => {
      const db = testEnv.authenticatedContext("riderA").firestore();
      await assertSucceeds(getDoc(doc(db, "users/riderA")));
    });

    it("prevents Rider A from reading Rider B's document", async () => {
      const db = testEnv.authenticatedContext("riderA").firestore();
      await assertFails(getDoc(doc(db, "users/riderB")));
    });

    it("allows admin to read any user document", async () => {
      const adminDb = testEnv.authenticatedContext("admin1", { role: "admin" }).firestore();
      await assertSucceeds(getDoc(doc(adminDb, "users/riderB")));
    });

    it("prevents any client from writing to users collection", async () => {
      const db = testEnv.authenticatedContext("riderA").firestore();
      await assertFails(setDoc(doc(db, "users/riderA"), { name: "Rider A" }));
    });

    it("prevents a rider from writing their own users/{uid}.role", async () => {
      const db = testEnv.authenticatedContext("riderA").firestore();
      await assertFails(setDoc(doc(db, "users/riderA"), { role: "admin" }, { merge: true }));
    });
  });

  describe("Users / savedPlaces", () => {
    it("allows a user to read and write their own savedPlaces", async () => {
      const db = testEnv.authenticatedContext("riderA").firestore();
      await assertSucceeds(setDoc(doc(db, "users/riderA/savedPlaces/home"), { address: "123 Main St" }));
      await assertSucceeds(getDoc(doc(db, "users/riderA/savedPlaces/home")));
    });

    it("prevents Rider A from reading or writing Rider B's savedPlaces", async () => {
      const db = testEnv.authenticatedContext("riderA").firestore();
      await assertFails(setDoc(doc(db, "users/riderB/savedPlaces/home"), { address: "Hack" }));
      await assertFails(getDoc(doc(db, "users/riderB/savedPlaces/home")));
    });
  });

  describe("Reservations Collection", () => {
    beforeEach(async () => {
      // Bypass rules to set up test data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "reservations/res1"), {
          riderId: "riderA",
          driverId: "driverA"
        });
        await setDoc(doc(db, "reservations/res2"), {
          riderId: "riderB",
          driverId: null
        });
      });
    });

    it("allows Rider A to read their own reservation", async () => {
      const db = testEnv.authenticatedContext("riderA").firestore();
      await assertSucceeds(getDoc(doc(db, "reservations/res1")));
    });

    it("prevents Rider A from reading Rider B's reservation", async () => {
      const db = testEnv.authenticatedContext("riderA").firestore();
      await assertFails(getDoc(doc(db, "reservations/res2")));
    });

    it("allows assigned Driver A to read the reservation", async () => {
      const db = testEnv.authenticatedContext("driverA").firestore();
      await assertSucceeds(getDoc(doc(db, "reservations/res1")));
    });

    it("prevents Driver B from reading a reservation they are not assigned to", async () => {
      const db = testEnv.authenticatedContext("driverB").firestore();
      await assertFails(getDoc(doc(db, "reservations/res1")));
    });

    it("allows admin to read any reservation", async () => {
      const db = testEnv.authenticatedContext("admin1", { role: "admin" }).firestore();
      await assertSucceeds(getDoc(doc(db, "reservations/res1")));
      await assertSucceeds(getDoc(doc(db, "reservations/res2")));
    });

    it("prevents any client from writing to reservations", async () => {
      const db = testEnv.authenticatedContext("riderA").firestore();
      await assertFails(setDoc(doc(db, "reservations/res1"), { fake: true }));
    });
  });

  describe("Driver Locations Collection", () => {
    beforeEach(async () => {
      // Bypass rules to set up test data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "driverLocations/loc1"), {
          reservationId: "res1", // Rider A is assigned to res1
          driverId: "driverA"
        });
        await setDoc(doc(db, "driverLocations/loc2"), {
          reservationId: "res2", // Rider B is assigned to res2
          driverId: "driverB"
        });
      });
    });

    it("allows Rider A to read driver location for their reservation", async () => {
      const db = testEnv.authenticatedContext("riderA").firestore();
      await assertSucceeds(getDoc(doc(db, "driverLocations/loc1")));
    });

    it("prevents Rider A from reading driver location for Rider B's reservation", async () => {
      const db = testEnv.authenticatedContext("riderA").firestore();
      await assertFails(getDoc(doc(db, "driverLocations/loc2")));
    });

    it("prevents any client (including rider) from writing to driverLocations", async () => {
      const db = testEnv.authenticatedContext("riderA").firestore();
      await assertFails(setDoc(doc(db, "driverLocations/loc1"), { lat: 10 }));
    });
  });

  describe("Global Deny", () => {
    it("denies access to unknown collections", async () => {
      const db = testEnv.authenticatedContext("admin1", { role: "admin" }).firestore();
      await assertFails(getDoc(doc(db, "unknown/123")));
      await assertFails(setDoc(doc(db, "unknown/123"), {}));
    });
  });
});
