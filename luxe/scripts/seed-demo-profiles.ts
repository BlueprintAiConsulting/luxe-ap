/**
 * Seeds ONE polished driver + ONE polished rider (with photos + full preferences)
 * and a reservation linking them — so you can demo the entire story:
 *   rider profile & preferences  →  driver sees the trip + auto prep checklist.
 *
 * Login (works in the Auth emulator via email/password):
 *   Rider:  alexis@luxedemo.com  / Password123!
 *   Driver: marcus@luxedemo.com  / Password123!
 *   Admin:  drewhufnagle@gmail.com / Password123!  (seed-admin.ts)
 *
 * Run after the emulator is up:
 *   npm run seed:demo-profiles
 */
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

process.env.GCLOUD_PROJECT = "demo-luxe";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

if (!getApps().length) initializeApp({ projectId: "demo-luxe" });
const auth = getAuth();
const db = getFirestore();
const now = Timestamp.now();

const RIDER_UID = "demoRider";
const DRIVER_UID = "demoDriver";
const RIDER_PHOTO = "https://randomuser.me/api/portraits/women/68.jpg";
const DRIVER_PHOTO = "https://randomuser.me/api/portraits/men/32.jpg";

async function upsertAuthUser(uid: string, email: string, name: string) {
  try {
    await auth.getUser(uid);
    await auth.updateUser(uid, { email, password: "Password123!", displayName: name });
  } catch (e: any) {
    if (e.code === "auth/user-not-found") {
      await auth.createUser({ uid, email, password: "Password123!", displayName: name });
    } else throw e;
  }
}

async function seed() {
  console.log("Seeding demo rider + driver profiles...");

  // ---- RIDER: Alexis Carter, with a rich preference profile ----
  await upsertAuthUser(RIDER_UID, "alexis@luxedemo.com", "Alexis Carter");
  await auth.setCustomUserClaims(RIDER_UID, { role: "rider" });

  const riderPreferences = {
    beverage: { preference: "water_sparkling", brand: "San Pellegrino", temperature: "chilled", notes: null },
    conversation: "greeting_only",
    cabinTempF: 68,
    audio: { mode: "genre", value: "Jazz", volume: "low" },
    scent: "no_preference",
    scentAllergy: true,
    chargerType: "usb_c",
    reading: null,
    greeting: { style: "curbside", nameSign: true, signText: "Ms. Carter" },
    seating: { preferredSeat: "rear_right", partition: null, shades: "down" },
    accessibility: { mobilityAssist: false, serviceAnimal: false, notes: null },
    childSeats: [],
    route: { avoidHighways: false, avoidTolls: true, preference: "fastest" },
    preferredDriverIds: [DRIVER_UID],
    blockedDriverIds: [],
    medicalNotes: null,
    freeText: "Please have the cabin cool and quiet. I usually take calls on the way to the airport.",
    updatedAt: now,
  };

  await db.collection("users").doc(RIDER_UID).set({
    uid: RIDER_UID,
    role: "rider",
    phone: "+15550101010",
    email: "alexis@luxedemo.com",
    firstName: "Alexis",
    lastName: "Carter",
    searchName: "alexis carter",
    photoUrl: RIDER_PHOTO,
    stripeCustomerId: null,
    defaultPaymentMethodId: null,
    preferences: riderPreferences,
    notes: "VIP demo rider",
    totalRides: 12,
    createdAt: now,
    updatedAt: now,
    disabled: false,
  });
  console.log("✅ Rider: Alexis Carter (alexis@luxedemo.com)");

  // ---- DRIVER: Marcus Bennett ----
  await upsertAuthUser(DRIVER_UID, "marcus@luxedemo.com", "Marcus Bennett");
  await auth.setCustomUserClaims(DRIVER_UID, { role: "driver" });

  await db.collection("users").doc(DRIVER_UID).set({
    uid: DRIVER_UID,
    role: "driver",
    phone: "+15550202020",
    email: "marcus@luxedemo.com",
    firstName: "Marcus",
    lastName: "Bennett",
    searchName: "marcus bennett",
    photoUrl: DRIVER_PHOTO,
    stripeCustomerId: null,
    defaultPaymentMethodId: null,
    preferences: null,
    notes: "Demo driver",
    totalRides: 0,
    createdAt: now,
    updatedAt: now,
    disabled: false,
  });

  await db.collection("drivers").doc(DRIVER_UID).set({
    driverId: DRIVER_UID,
    userId: DRIVER_UID,
    displayName: "Marcus Bennett",
    photoUrl: DRIVER_PHOTO,
    bio: "Professional chauffeur, 12 years. Trusted with executive and celebrity clients.",
    languages: ["English"],
    yearsExperience: 12,
    rating: 4.95,
    ratingCount: 176,
    active: true,
    bookable: true,
    createdAt: now,
  });
  console.log("✅ Driver: Marcus Bennett (marcus@luxedemo.com)");

  // ---- RESERVATION linking them, so the driver trip screen + prep checklist demo ----
  const addr = (line1: string, city: string, lat: number, lng: number) => ({
    line1, line2: null, city, state: "CA", postalCode: "90045",
    lat, lng, formatted: `${line1}, ${city}, CA`, placeId: null, airportCode: null, notes: null,
  });

  const total = 21500;
  const ref = db.collection("reservations").doc();
  await ref.set({
    reservationId: ref.id,
    confirmationCode: "BCC-DEMO01",
    riderId: RIDER_UID,
    riderName: "Alexis Carter",
    riderPhone: "+15550101010",
    riderEmail: "alexis@luxedemo.com",
    bookedByAdmin: false,
    status: "assigned",
    pricingRuleSetId: "rule_set_v1",
    idempotencyKey: "demo_" + Math.random().toString(36).slice(2),
    createdAt: now,
    updatedAt: now,
    estimatedDistanceMeters: 19000,
    estimatedDurationSeconds: 1800,
    timezone: "America/Los_Angeles",
    tripType: "airport_departure",
    pickup: addr("9200 Sunset Blvd", "West Hollywood", 34.0900, -118.3860),
    dropoff: addr("1 World Way", "Los Angeles (LAX)", 33.9416, -118.4085),
    stops: [],
    hours: null,
    passengers: 1,
    luggage: 2,
    flightNumber: "DL 1290",
    airlineCode: "DL",
    specialInstructions: "Flight departs 6:45 PM — please allow time for traffic.",
    preferences: riderPreferences,
    classId: "sedan",
    className: "Luxury Sedan",
    vehicleId: "veh_sedan_1",
    vehicleDescription: "Mercedes-Benz S-Class (Black)",
    driverId: DRIVER_UID,
    driverName: "Marcus Bennett",
    driverPhotoUrl: DRIVER_PHOTO,
    requestedDriverId: DRIVER_UID,
    driverSubstituted: false,
    stripePaymentIntentId: null,
    paymentStatus: "authorized",
    actualStartAt: null,
    actualEndAt: null,
    waitMinutes: 0,
    tollsCents: 0,
    parkingCents: 0,
    driverNotes: "",
    authorizedAmountCents: total,
    capturedAmountCents: 0,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    cancellationFeeCents: 0,
    prepChecklistState: {},
    pricing: {
      lineItems: [
        { code: "base", label: "Airport Transfer (Sedan)", amountCents: 15000, detail: null },
        { code: "meet_greet", label: "Meet & Greet", amountCents: 3500, detail: null },
        { code: "gratuity", label: "Gratuity (20%)", amountCents: 3000, detail: null },
      ],
      subtotalCents: 18500,
      gratuityCents: 3000,
      taxCents: 0,
      totalCents: total,
      estimatedTotalCents: total,
      isFinal: false,
    },
  });
  console.log("✅ Reservation BCC-DEMO01: Alexis → Marcus (assigned, LAX departure)");

  console.log("\nDemo profiles seeded. Log in:");
  console.log("  Rider:  alexis@luxedemo.com / Password123!");
  console.log("  Driver: marcus@luxedemo.com / Password123!");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
