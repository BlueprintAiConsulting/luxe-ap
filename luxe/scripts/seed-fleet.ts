/**
 * Seeds the fleet + sample trips for the demo:
 *   - vehicleClasses (admin Vehicles page reads this)
 *   - drivers        (booking driver step + dispatch read this)
 *   - vehicles       (dispatch vehicle assignment reads this)
 *   - reservations   (dispatch board, admin dashboard, driver "today", rider dashboard)
 *
 * Run against the emulator AFTER seed-pricing and seed-users:
 *   npm run seed:pricing && npm run seed:users && npm run seed:fleet
 *
 * Class IDs (sedan/suv/sprinter) match the classRates keys in seed-pricing.ts.
 * Driver userIds (driverA/driverB) match seed-users.ts.
 */
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

process.env.GCLOUD_PROJECT = "demo-luxe";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

if (!getApps().length) initializeApp({ projectId: "demo-luxe" });
const db = getFirestore();
const now = Timestamp.now();

// Placeholder hero images (swap for the owner's real car photos after the meeting)
const IMG =
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80";

async function seed() {
  console.log("Seeding fleet + sample trips...");

  // 1. VEHICLE CLASSES (must match classRates keys: sedan, suv, sprinter)
  const vehicleClasses = [
    {
      classId: "sedan",
      name: "Luxury Sedan",
      description: "Mercedes S-Class or equivalent. Up to 3 passengers.",
      maxPassengers: 3,
      maxLuggage: 3,
      heroImageUrl: IMG,
      sortOrder: 1,
      active: true,
    },
    {
      classId: "suv",
      name: "Luxury SUV",
      description: "Cadillac Escalade or equivalent. Up to 6 passengers.",
      maxPassengers: 6,
      maxLuggage: 6,
      heroImageUrl: IMG,
      sortOrder: 2,
      active: true,
    },
    {
      classId: "sprinter",
      name: "Executive Sprinter",
      description: "Mercedes Sprinter. Up to 12 passengers.",
      maxPassengers: 12,
      maxLuggage: 12,
      heroImageUrl: IMG,
      sortOrder: 3,
      active: true,
    },
  ];
  for (const vc of vehicleClasses) {
    await db.collection("vehicleClasses").doc(vc.classId).set(vc);
  }
  console.log(`✅ Seeded ${vehicleClasses.length} vehicleClasses`);

  // 2. DRIVERS (driverId doc; userId links to the auth user from seed-users)
  const drivers = [
    {
      driverId: "driverA",
      userId: "driverA",
      displayName: "James Sullivan",
      photoUrl: "https://i.pravatar.cc/150?img=12",
      bio: "15 years chauffeuring executives and VIP clients.",
      languages: ["English"],
      yearsExperience: 15,
      rating: 4.9,
      ratingCount: 214,
      active: true,
      bookable: true,
      createdAt: now,
    },
    {
      driverId: "driverB",
      userId: "driverB",
      displayName: "Maria Gomez",
      photoUrl: "https://i.pravatar.cc/150?img=45",
      bio: "Fluent in English and Spanish. Airport specialist.",
      languages: ["English", "Spanish"],
      yearsExperience: 9,
      rating: 5.0,
      ratingCount: 98,
      active: true,
      bookable: true,
      createdAt: now,
    },
  ];
  for (const d of drivers) {
    await db.collection("drivers").doc(d.driverId).set(d);
  }
  console.log(`✅ Seeded ${drivers.length} drivers`);

  // 3. VEHICLES
  const vehicles = [
    {
      vehicleId: "veh_sedan_1",
      classId: "sedan",
      year: 2024,
      make: "Mercedes-Benz",
      model: "S-Class",
      color: "Black",
      licensePlate: "LUXE-001",
      photoUrls: [IMG],
      maxPassengers: 3,
      maxLuggage: 3,
      active: true,
      outOfServiceUntil: null,
    },
    {
      vehicleId: "veh_suv_1",
      classId: "suv",
      year: 2024,
      make: "Cadillac",
      model: "Escalade",
      color: "Black",
      licensePlate: "LUXE-002",
      photoUrls: [IMG],
      maxPassengers: 6,
      maxLuggage: 6,
      active: true,
      outOfServiceUntil: null,
    },
    {
      vehicleId: "veh_sprinter_1",
      classId: "sprinter",
      year: 2023,
      make: "Mercedes-Benz",
      model: "Sprinter",
      color: "Black",
      licensePlate: "LUXE-003",
      photoUrls: [IMG],
      maxPassengers: 12,
      maxLuggage: 12,
      active: true,
      outOfServiceUntil: null,
    },
  ];
  for (const v of vehicles) {
    await db.collection("vehicles").doc(v.vehicleId).set(v);
  }
  console.log(`✅ Seeded ${vehicles.length} vehicles`);

  // 4. SAMPLE RESERVATIONS (populate dispatch board, dashboards, driver today)
  const hoursFromNow = (h: number) =>
    Timestamp.fromMillis(Date.now() + h * 3600 * 1000);

  const addr = (line1: string, city: string, lat: number, lng: number) => ({
    line1,
    line2: null,
    city,
    state: "CA",
    postalCode: "90001",
    lat,
    lng,
    formatted: `${line1}, ${city}, CA`,
    placeId: null,
    airportCode: null,
    notes: null,
  });

  const pricing = (totalCents: number) => ({
    lineItems: [
      { code: "base", label: "Base Fare", amountCents: Math.round(totalCents * 0.7), detail: null },
      { code: "gratuity", label: "Gratuity (20%)", amountCents: Math.round(totalCents * 0.17), detail: null },
      { code: "tax", label: "Tax", amountCents: Math.round(totalCents * 0.13), detail: null },
    ],
    subtotalCents: Math.round(totalCents * 0.83),
    gratuityCents: Math.round(totalCents * 0.17),
    taxCents: Math.round(totalCents * 0.13),
    totalCents,
    estimatedTotalCents: totalCents,
    isFinal: false,
  });

  const baseRes = (over: Record<string, any>) => ({
    confirmationCode: "BCC-XXXXXX",
    riderId: "riderA",
    riderName: "Rider Rachel",
    riderPhone: "+15550000004",
    riderEmail: null,
    bookedByAdmin: false,
    pricingRuleSetId: "rule_set_v1",
    idempotencyKey: Math.random().toString(36).slice(2),
    createdAt: now,
    updatedAt: now,
    estimatedDistanceMeters: 24000,
    estimatedDurationSeconds: 2100,
    timezone: "America/Los_Angeles",
    tripType: "point_to_point",
    pickup: addr("100 Universal City Plaza", "Universal City", 34.1381, -118.3534),
    dropoff: addr("900 Wilshire Blvd", "Los Angeles", 34.0522, -118.2600),
    stops: [],
    hours: null,
    passengers: 2,
    luggage: 2,
    flightNumber: null,
    airlineCode: null,
    specialInstructions: "",
    preferences: {
      beverage: { preference: "water_sparkling", brand: "San Pellegrino", temperature: "chilled", notes: null },
      conversation: "greeting_only",
      cabinTempF: 68,
      audio: { mode: "genre", value: "Jazz", volume: null },
      greeting: { style: "curbside", nameSign: true, signText: "Ms. Rachel", partition: null },
      seating: { preferredSeat: "rear_right", partition: null, shades: null },
    },
    vehicleId: null,
    vehicleDescription: null,
    driverName: null,
    driverPhotoUrl: null,
    requestedDriverId: null,
    driverSubstituted: false,
    stripePaymentIntentId: null,
    paymentStatus: "authorized",
    actualStartAt: null,
    actualEndAt: null,
    waitMinutes: 0,
    tollsCents: 0,
    parkingCents: 0,
    driverNotes: "",
    authorizedAmountCents: 0,
    capturedAmountCents: 0,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    cancellationFeeCents: 0,
    prepChecklistState: {},
    ...over,
  });

  const reservations = [
    // Unassigned confirmed — shows up in dispatch "needs attention"
    baseRes({
      confirmationCode: "BCC-AA1001",
      status: "confirmed",
      pickupAt: hoursFromNow(3),
      classId: "sedan",
      className: "Luxury Sedan",
      driverId: null,
      pricing: pricing(18500),
    }),
    // Assigned to driverA today — shows in driver's "today"
    baseRes({
      confirmationCode: "BCC-BB2002",
      status: "assigned",
      pickupAt: hoursFromNow(6),
      classId: "suv",
      className: "Luxury SUV",
      driverId: "driverA",
      driverName: "James Sullivan",
      vehicleId: "veh_suv_1",
      vehicleDescription: "Cadillac Escalade (Black)",
      pricing: pricing(26000),
    }),
    // Completed — shows in rider dashboard history + dashboards
    baseRes({
      confirmationCode: "BCC-CC3003",
      status: "completed",
      pickupAt: hoursFromNow(-48),
      classId: "sedan",
      className: "Luxury Sedan",
      driverId: "driverB",
      driverName: "Maria Gomez",
      vehicleId: "veh_sedan_1",
      vehicleDescription: "Mercedes-Benz S-Class (Black)",
      pricing: { ...pricing(15500), isFinal: true },
      paymentStatus: "captured",
    }),
  ];

  for (const r of reservations) {
    const ref = db.collection("reservations").doc();
    await ref.set({ reservationId: ref.id, ...r });
  }
  console.log(`✅ Seeded ${reservations.length} sample reservations`);

  console.log("Fleet + trips seeding complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
