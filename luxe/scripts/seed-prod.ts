/**
 * PRODUCTION seed — writes demo data into the REAL Firestore (luxe-app-1786335311).
 * Uses Application Default Credentials (same approach as seed-admin.ts).
 *
 * Seeds: pricing rule set, global settings, LAX airport, vehicle classes,
 * drivers, vehicles, the two demo profiles (Alexis rider + Marcus driver),
 * and a few sample reservations — everything the demo needs, live.
 *
 * SAFETY: requires SEED_PROD=confirm to run, so you can't fire it by accident.
 *   SEED_PROD=confirm npx tsx scripts/seed-prod.ts
 *
 * All demo docs carry demoSeed:true so they can be purged later:
 *   (delete where demoSeed == true)
 *
 * PREREQS:
 *   - `gcloud auth application-default login` (or a service account) so ADC works
 *   - Email/Password sign-in enabled in Firebase Auth console (for the demo logins)
 */
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

if (process.env.SEED_PROD !== "confirm") {
  console.error("Refusing to seed PROD. Re-run with: SEED_PROD=confirm npx tsx scripts/seed-prod.ts");
  process.exit(1);
}

const PROJECT = "luxe-app-1786335311";
process.env.GCLOUD_PROJECT = PROJECT;
// NOTE: intentionally NO emulator host vars — this targets real prod.

if (!getApps().length) initializeApp({ projectId: PROJECT });
const auth = getAuth();
const db = getFirestore();
const now = Timestamp.now();

const IMG = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80";
const RIDER_UID = "demoRider";
const DRIVER_UID = "demoDriver";
const RIDER_PHOTO = "https://randomuser.me/api/portraits/women/68.jpg";
const DRIVER_PHOTO = "https://randomuser.me/api/portraits/men/32.jpg";

async function upsertAuthUser(uid: string, email: string, name: string, role: string) {
  try {
    await auth.getUser(uid);
    await auth.updateUser(uid, { email, password: "Password123!", displayName: name });
  } catch (e: any) {
    if (e.code === "auth/user-not-found") {
      await auth.createUser({ uid, email, password: "Password123!", displayName: name });
    } else throw e;
  }
  await auth.setCustomUserClaims(uid, { role });
}

const addr = (line1: string, city: string, lat: number, lng: number) => ({
  line1, line2: null, city, state: "CA", postalCode: "90045",
  lat, lng, formatted: `${line1}, ${city}, CA`, placeId: null, airportCode: null, notes: null,
});

async function seed() {
  console.log(`Seeding PRODUCTION project ${PROJECT}...`);

  // 1. PRICING RULE SET
  await db.collection("pricingRuleSets").doc("rule_set_v1").set({
    ruleSetId: "rule_set_v1", version: 1, effectiveFrom: now, timezone: "America/Los_Angeles",
    classRates: {
      sedan:    { name: "Luxury Sedan",       baseFareCents: 5000,  perMileCents: 350, perMinuteCents: 100, minimumFareCents: 7500,  hourlyRateCents: 8500,  hourlyMinimumHours: 2 },
      suv:      { name: "Luxury SUV",         baseFareCents: 7500,  perMileCents: 450, perMinuteCents: 125, minimumFareCents: 9500,  hourlyRateCents: 11000, hourlyMinimumHours: 2 },
      sprinter: { name: "Executive Sprinter", baseFareCents: 15000, perMileCents: 650, perMinuteCents: 200, minimumFareCents: 25000, hourlyRateCents: 18000, hourlyMinimumHours: 3 },
    },
    gratuity: { autoAdd: true, percent: 20, editableByRider: false, appliesTo: "subtotal" },
    waitTime: { freeMinutesStandard: 15, freeMinutesAirport: 45, perMinuteCents: 150, billingIncrementMinutes: 15 },
    surcharges: {
      fuelPercent: 5, fuelFlatCents: 0, extraStopCents: 2500, meetGreetCents: 3500, childSeatCents: 2000,
      afterHours: { enabled: true, startHourLocal: 23, endHourLocal: 5, percent: 0, flatCents: 3000 },
      holidays: [
        { date: "12-25", name: "Christmas Day", percent: 25, flatCents: 0 },
        { date: "01-01", name: "New Years Day", percent: 25, flatCents: 0 },
      ],
      outOfAreaPerMileCents: 500, outOfAreaRadiusMiles: 50,
    },
    cancellation: [
      { hoursBeforePickup: 2, feePercent: 100, feeFlatCents: 0, appliesToClasses: "all" },
      { hoursBeforePickup: 24, feePercent: 50, feeFlatCents: 0, appliesToClasses: ["sprinter"] },
    ],
    taxPercent: 8.5,
  });

  await db.collection("settings").doc("global").set({
    businessName: "Luxe Black Car", supportPhone: "+1-555-0199", supportEmail: "support@luxeblackcar.example.com",
    defaultTimezone: "America/Los_Angeles", activePricingRuleSetId: "rule_set_v1",
    bookingLeadTimeMinutes: 120, maxAdvanceDays: 60,
    brandColors: { primary: "#000000", accent: "#D4AF37" },
  });

  await db.collection("airports").doc("LAX").set({
    code: "LAX", name: "Los Angeles International Airport", timezone: "America/Los_Angeles",
    location: { lat: 33.9416, lng: -118.4085 },
    zones: [
      { zoneId: "downtown_la", name: "Downtown LA", flatRates: {
        sedan: { arrivalCents: 12500, departureCents: 11000 }, suv: { arrivalCents: 15500, departureCents: 13000 }, sprinter: { arrivalCents: 35000, departureCents: 35000 } } },
      { zoneId: "beverly_hills", name: "Beverly Hills / West Hollywood", flatRates: {
        sedan: { arrivalCents: 14000, departureCents: 12500 }, suv: { arrivalCents: 17500, departureCents: 15500 }, sprinter: { arrivalCents: 38000, departureCents: 38000 } } },
    ],
    meetGreetFeeCents: 3500, freeWaitMinutesArrival: 45,
  });
  console.log("✅ pricing, settings, airport");

  // 2. VEHICLE CLASSES
  const classes = [
    { classId: "sedan", name: "Luxury Sedan", description: "Mercedes S-Class or equivalent. Up to 3 passengers.", maxPassengers: 3, maxLuggage: 3, heroImageUrl: IMG, sortOrder: 1, active: true, demoSeed: true },
    { classId: "suv", name: "Luxury SUV", description: "Cadillac Escalade or equivalent. Up to 6 passengers.", maxPassengers: 6, maxLuggage: 6, heroImageUrl: IMG, sortOrder: 2, active: true, demoSeed: true },
    { classId: "sprinter", name: "Executive Sprinter", description: "Mercedes Sprinter. Up to 12 passengers.", maxPassengers: 12, maxLuggage: 12, heroImageUrl: IMG, sortOrder: 3, active: true, demoSeed: true },
  ];
  for (const c of classes) await db.collection("vehicleClasses").doc(c.classId).set(c);
  console.log(`✅ ${classes.length} vehicleClasses`);

  // 3. DEMO PROFILES — rider Alexis + driver Marcus
  await upsertAuthUser(RIDER_UID, "alexis@luxedemo.com", "Alexis Carter", "rider");
  const riderPreferences = {
    beverage: { preference: "water_sparkling", brand: "San Pellegrino", temperature: "chilled", notes: null },
    conversation: "greeting_only", cabinTempF: 68, audio: { mode: "genre", value: "Jazz", volume: "low" },
    scent: "no_preference", scentAllergy: true, chargerType: "usb_c", reading: null,
    greeting: { style: "curbside", nameSign: true, signText: "Ms. Carter" },
    seating: { preferredSeat: "rear_right", partition: null, shades: "down" },
    accessibility: { mobilityAssist: false, serviceAnimal: false, notes: null },
    childSeats: [], route: { avoidHighways: false, avoidTolls: true, preference: "fastest" },
    preferredDriverIds: [DRIVER_UID], blockedDriverIds: [], medicalNotes: null,
    freeText: "Please have the cabin cool and quiet. I usually take calls on the way to the airport.", updatedAt: now,
  };
  await db.collection("users").doc(RIDER_UID).set({
    uid: RIDER_UID, role: "rider", phone: "+15550101010", email: "alexis@luxedemo.com",
    firstName: "Alexis", lastName: "Carter", searchName: "alexis carter", photoUrl: RIDER_PHOTO,
    stripeCustomerId: null, defaultPaymentMethodId: null, preferences: riderPreferences,
    notes: "VIP demo rider", totalRides: 12, createdAt: now, updatedAt: now, disabled: false, demoSeed: true,
  });

  await upsertAuthUser(DRIVER_UID, "marcus@luxedemo.com", "Marcus Bennett", "driver");
  await db.collection("users").doc(DRIVER_UID).set({
    uid: DRIVER_UID, role: "driver", phone: "+15550202020", email: "marcus@luxedemo.com",
    firstName: "Marcus", lastName: "Bennett", searchName: "marcus bennett", photoUrl: DRIVER_PHOTO,
    stripeCustomerId: null, defaultPaymentMethodId: null, preferences: null,
    notes: "Demo driver", totalRides: 0, createdAt: now, updatedAt: now, disabled: false, demoSeed: true,
  });
  await db.collection("drivers").doc(DRIVER_UID).set({
    driverId: DRIVER_UID, userId: DRIVER_UID, displayName: "Marcus Bennett", photoUrl: DRIVER_PHOTO,
    bio: "Professional chauffeur, 12 years. Trusted with executive and celebrity clients.",
    languages: ["English"], yearsExperience: 12, rating: 4.95, ratingCount: 176,
    active: true, bookable: true, createdAt: now, demoSeed: true,
  });
  console.log("✅ demo rider (alexis@luxedemo.com) + driver (marcus@luxedemo.com)");

  // 4. VEHICLES
  const vehicles = [
    { vehicleId: "veh_sedan_1", classId: "sedan", year: 2024, make: "Mercedes-Benz", model: "S-Class", color: "Black", licensePlate: "LUXE-001", photoUrls: [IMG], maxPassengers: 3, maxLuggage: 3, active: true, outOfServiceUntil: null, demoSeed: true },
    { vehicleId: "veh_suv_1", classId: "suv", year: 2024, make: "Cadillac", model: "Escalade", color: "Black", licensePlate: "LUXE-002", photoUrls: [IMG], maxPassengers: 6, maxLuggage: 6, active: true, outOfServiceUntil: null, demoSeed: true },
  ];
  for (const v of vehicles) await db.collection("vehicles").doc(v.vehicleId).set(v);
  console.log(`✅ ${vehicles.length} vehicles`);

  // 5. SAMPLE RESERVATION — Alexis → Marcus, so the whole loop demos
  const total = 21500;
  const ref = db.collection("reservations").doc();
  await ref.set({
    reservationId: ref.id, confirmationCode: "BCC-DEMO01", riderId: RIDER_UID, riderName: "Alexis Carter",
    riderPhone: "+15550101010", riderEmail: "alexis@luxedemo.com", bookedByAdmin: false, status: "assigned",
    pricingRuleSetId: "rule_set_v1", idempotencyKey: "demo_prod_1", createdAt: now, updatedAt: now,
    estimatedDistanceMeters: 19000, estimatedDurationSeconds: 1800, timezone: "America/Los_Angeles",
    tripType: "airport_departure",
    pickup: addr("9200 Sunset Blvd", "West Hollywood", 34.0900, -118.3860),
    dropoff: addr("1 World Way", "Los Angeles (LAX)", 33.9416, -118.4085),
    stops: [], hours: null, passengers: 1, luggage: 2, flightNumber: "DL 1290", airlineCode: "DL",
    specialInstructions: "Flight departs 6:45 PM — please allow time for traffic.",
    preferences: riderPreferences, classId: "sedan", className: "Luxury Sedan",
    vehicleId: "veh_sedan_1", vehicleDescription: "Mercedes-Benz S-Class (Black)",
    driverId: DRIVER_UID, driverName: "Marcus Bennett", driverPhotoUrl: DRIVER_PHOTO,
    requestedDriverId: DRIVER_UID, driverSubstituted: false,
    stripePaymentIntentId: null, paymentStatus: "authorized",
    actualStartAt: null, actualEndAt: null, waitMinutes: 0, tollsCents: 0, parkingCents: 0, driverNotes: "",
    authorizedAmountCents: total, capturedAmountCents: 0,
    cancelledAt: null, cancelledBy: null, cancellationReason: null, cancellationFeeCents: 0,
    prepChecklistState: {}, demoSeed: true,
    pricing: {
      lineItems: [
        { code: "base", label: "Airport Transfer (Sedan)", amountCents: 15000, detail: null },
        { code: "meet_greet", label: "Meet & Greet", amountCents: 3500, detail: null },
        { code: "gratuity", label: "Gratuity (20%)", amountCents: 3000, detail: null },
      ],
      subtotalCents: 18500, gratuityCents: 3000, taxCents: 0, totalCents: total, estimatedTotalCents: total, isFinal: false,
    },
  });
  // Also drop an unassigned one so dispatch has a "needs attention" item
  const ref2 = db.collection("reservations").doc();
  await ref2.set({
    reservationId: ref2.id, confirmationCode: "BCC-DEMO02", riderId: RIDER_UID, riderName: "Alexis Carter",
    riderPhone: "+15550101010", riderEmail: "alexis@luxedemo.com", bookedByAdmin: false, status: "confirmed",
    pricingRuleSetId: "rule_set_v1", idempotencyKey: "demo_prod_2", createdAt: now, updatedAt: now,
    estimatedDistanceMeters: 24000, estimatedDurationSeconds: 2100, timezone: "America/Los_Angeles",
    tripType: "point_to_point",
    pickup: addr("100 Universal City Plaza", "Universal City", 34.1381, -118.3534),
    dropoff: addr("900 Wilshire Blvd", "Los Angeles", 34.0522, -118.2600),
    stops: [], hours: null, passengers: 2, luggage: 2, flightNumber: null, airlineCode: null,
    specialInstructions: "", preferences: riderPreferences, classId: "suv", className: "Luxury SUV",
    vehicleId: null, vehicleDescription: null, driverId: null, driverName: null, driverPhotoUrl: null,
    requestedDriverId: null, driverSubstituted: false, stripePaymentIntentId: null, paymentStatus: "authorized",
    actualStartAt: null, actualEndAt: null, waitMinutes: 0, tollsCents: 0, parkingCents: 0, driverNotes: "",
    authorizedAmountCents: 26000, capturedAmountCents: 0,
    cancelledAt: null, cancelledBy: null, cancellationReason: null, cancellationFeeCents: 0,
    prepChecklistState: {}, demoSeed: true,
    pricing: { lineItems: [{ code: "base", label: "Base Fare", amountCents: 20000, detail: null }, { code: "gratuity", label: "Gratuity (20%)", amountCents: 6000, detail: null }], subtotalCents: 20000, gratuityCents: 6000, taxCents: 0, totalCents: 26000, estimatedTotalCents: 26000, isFinal: false },
  });
  console.log("✅ 2 sample reservations (1 assigned, 1 unassigned)");

  console.log("\n🎉 PROD seeded. Log in on the live site:");
  console.log("   Rider:  alexis@luxedemo.com  / Password123!");
  console.log("   Driver: marcus@luxedemo.com  / Password123!");
  console.log("   Admin:  drewhufnagle@gmail.com / Password123!  (run seed-admin.ts)");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
