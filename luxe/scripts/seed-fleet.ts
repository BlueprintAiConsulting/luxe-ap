/**
 * Seeds Joe's exact 6 owned flagship vehicles and 10-driver roster:
 *   - vehicleClasses (Sedan, SUV, Sprinter)
 *   - drivers        (Tier 1 5★ In-House, Tier 2 4★ In-House, Tier 3 Floaters)
 *   - vehicles       (Cadillac Escalades, Yukon Denali, Suburban, S580 Executive with VINs & Amenity Tags)
 *   - reservations   (Sample active and completed charters for dispatch, radar, and billing)
 */
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

process.env.GCLOUD_PROJECT = "luxe-app-1786335311";
if (!getApps().length) initializeApp({ projectId: "luxe-app-1786335311" });
const db = getFirestore();
const now = Timestamp.now();

const IMG_ESCALADE = "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80";
const IMG_SCLASS = "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80";
const IMG_DENALI = "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80";
const IMG_SPRINTER = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80";

async function seed() {
  console.log("Seeding Joe's 6 Owned Flagship Vehicles & 10 Chauffeurs...");

  // 1. VEHICLE CLASSES
  const vehicleClasses = [
    {
      classId: "sedan",
      name: "Luxury Sedan",
      description: "Mercedes-Benz S-Class S580 Executive. Up to 3 passengers.",
      maxPassengers: 3,
      maxLuggage: 3,
      heroImageUrl: IMG_SCLASS,
      sortOrder: 1,
      active: true,
    },
    {
      classId: "suv",
      name: "Luxury SUV",
      description: "Cadillac Escalade ESV Sport Platinum & Yukon Denali. Up to 6 passengers.",
      maxPassengers: 6,
      maxLuggage: 6,
      heroImageUrl: IMG_ESCALADE,
      sortOrder: 2,
      active: true,
    },
    {
      classId: "sprinter",
      name: "Executive Sprinter",
      description: "Mercedes-Benz Executive Sprinter Jet-Van. Up to 12 passengers.",
      maxPassengers: 12,
      maxLuggage: 12,
      heroImageUrl: IMG_SPRINTER,
      sortOrder: 3,
      active: true,
    },
  ];
  for (const vc of vehicleClasses) {
    await db.collection("vehicleClasses").doc(vc.classId).set(vc);
  }
  console.log(`✅ Seeded ${vehicleClasses.length} vehicleClasses`);

  // 2. JOE'S 10 CHAUFFEURS (Tier 1 In-House 5★, Tier 2 In-House 4★, Tier 3 Floaters)
  const drivers = [
    // Tier 1: 5-Star In-House Chauffeurs
    {
      driverId: "drv_marcus",
      userId: "demoDriver",
      displayName: "Marcus Bennett",
      photoUrl: "https://randomuser.me/api/portraits/men/32.jpg",
      bio: "12 years chauffeuring Fortune 500 executives and private aviation VIPs. Lead Chauffeur.",
      languages: ["English"],
      yearsExperience: 12,
      rating: 5.0,
      ratingCount: 342,
      driverType: "in_house",
      starRatingTier: 5,
      assignedVehicleId: "veh_escalade_01",
      active: true,
      bookable: true,
      createdAt: now,
    },
    {
      driverId: "drv_sullivan",
      userId: "driverA",
      displayName: "James Sullivan",
      photoUrl: "https://i.pravatar.cc/150?img=12",
      bio: "15 years executive transport experience. LAX and Van Nuys FBO specialist.",
      languages: ["English"],
      yearsExperience: 15,
      rating: 4.92,
      ratingCount: 214,
      driverType: "in_house",
      starRatingTier: 5,
      assignedVehicleId: "veh_escalade_02",
      active: true,
      bookable: true,
      createdAt: now,
    },
    {
      driverId: "drv_gomez",
      userId: "driverB",
      displayName: "Maria Gomez",
      photoUrl: "https://i.pravatar.cc/150?img=45",
      bio: "Fluent in English and Spanish. Expert in luxury hospitality & studio executive charters.",
      languages: ["English", "Spanish"],
      yearsExperience: 9,
      rating: 5.0,
      ratingCount: 198,
      driverType: "in_house",
      starRatingTier: 5,
      assignedVehicleId: "veh_denali_01",
      active: true,
      bookable: true,
      createdAt: now,
    },
    {
      driverId: "drv_dubois",
      userId: "driver_dubois",
      displayName: "Alexandre Dubois",
      photoUrl: "https://randomuser.me/api/portraits/men/44.jpg",
      bio: "14 years European diplomatic & VIP protection chauffeur training. S-Class flagship specialist.",
      languages: ["English", "French"],
      yearsExperience: 14,
      rating: 4.95,
      ratingCount: 180,
      driverType: "in_house",
      starRatingTier: 5,
      assignedVehicleId: "veh_sclass_01",
      active: true,
      bookable: true,
      createdAt: now,
    },

    // Tier 2: 4-Star In-House Chauffeurs
    {
      driverId: "drv_rossi",
      userId: "driver_rossi",
      displayName: "David Rossi",
      photoUrl: "https://randomuser.me/api/portraits/men/52.jpg",
      bio: "6 years corporate livery & airport charters. Prompt, courteous, and defensive driving certified.",
      languages: ["English", "Italian"],
      yearsExperience: 6,
      rating: 4.75,
      ratingCount: 92,
      driverType: "in_house",
      starRatingTier: 4,
      assignedVehicleId: "veh_escalade_03",
      active: true,
      bookable: true,
      createdAt: now,
    },
    {
      driverId: "drv_mendez",
      userId: "driver_mendez",
      displayName: "Carlos Mendez",
      photoUrl: "https://randomuser.me/api/portraits/men/62.jpg",
      bio: "8 years luxury transport. Suburban & group charter logistics expert.",
      languages: ["English", "Spanish"],
      yearsExperience: 8,
      rating: 4.70,
      ratingCount: 84,
      driverType: "in_house",
      starRatingTier: 4,
      assignedVehicleId: "veh_suburban_01",
      active: true,
      bookable: true,
      createdAt: now,
    },
    {
      driverId: "drv_chen",
      userId: "driver_chen",
      displayName: "Kevin Chen",
      photoUrl: "https://randomuser.me/api/portraits/men/22.jpg",
      bio: "5 years executive Sprinter & multi-passenger roadshow coordination.",
      languages: ["English", "Mandarin"],
      yearsExperience: 5,
      rating: 4.65,
      ratingCount: 65,
      driverType: "in_house",
      starRatingTier: 4,
      assignedVehicleId: null,
      active: true,
      bookable: true,
      createdAt: now,
    },
    {
      driverId: "drv_patel",
      userId: "driver_patel",
      displayName: "Sanjay Patel",
      photoUrl: "https://randomuser.me/api/portraits/men/75.jpg",
      bio: "4 years executive sedan & airport transfer experience.",
      languages: ["English", "Hindi"],
      yearsExperience: 4,
      rating: 4.60,
      ratingCount: 52,
      driverType: "in_house",
      starRatingTier: 4,
      assignedVehicleId: null,
      active: true,
      bookable: true,
      createdAt: now,
    },

    // Tier 3: Floater / Affiliate Network
    {
      driverId: "drv_floater_01",
      userId: "driver_floater_1",
      displayName: "Liam O'Connor (Affiliate)",
      photoUrl: "https://randomuser.me/api/portraits/men/85.jpg",
      bio: "On-demand partner chauffeur for overflow & peak hour coverage.",
      languages: ["English"],
      yearsExperience: 4,
      rating: 4.50,
      ratingCount: 28,
      driverType: "affiliate",
      starRatingTier: 3,
      assignedVehicleId: null,
      active: true,
      bookable: true,
      createdAt: now,
    },
    {
      driverId: "drv_floater_02",
      userId: "driver_floater_2",
      displayName: "Tyler Reed (Affiliate)",
      photoUrl: "https://randomuser.me/api/portraits/men/91.jpg",
      bio: "On-demand affiliate driver for overflow charters.",
      languages: ["English"],
      yearsExperience: 3,
      rating: 4.40,
      ratingCount: 19,
      driverType: "affiliate",
      starRatingTier: 3,
      assignedVehicleId: null,
      active: true,
      bookable: true,
      createdAt: now,
    },
  ];

  for (const d of drivers) {
    await db.collection("drivers").doc(d.driverId).set(d);
  }
  console.log(`✅ Seeded ${drivers.length} drivers`);

  // 3. JOE'S 6 OWNED FLAGSHIP VEHICLES (With Exact VINs & Luxury Amenity Tags)
  const vehicles = [
    {
      vehicleId: "veh_escalade_01",
      classId: "suv",
      year: 2024,
      make: "Cadillac",
      model: "Escalade ESV",
      trim: "Sport Platinum",
      vin: "1GYS4HKL8RR104829",
      color: "Black Raven",
      licensePlate: "LUXE-001",
      photoUrls: [IMG_ESCALADE],
      maxPassengers: 6,
      maxLuggage: 6,
      active: true,
      assignedDriverId: "drv_marcus",
      amenityTags: {
        starlineHeadliner: true,
        chilledSeats: true,
        fijiWater: true,
        starlinkWifi: true,
        rearEntertainment: true,
      },
      outOfServiceUntil: null,
    },
    {
      vehicleId: "veh_escalade_02",
      classId: "suv",
      year: 2024,
      make: "Cadillac",
      model: "Escalade ESV",
      trim: "Luxury",
      vin: "1GYS4HKL9RR109284",
      color: "Black Raven",
      licensePlate: "LUXE-002",
      photoUrls: [IMG_ESCALADE],
      maxPassengers: 6,
      maxLuggage: 6,
      active: true,
      assignedDriverId: "drv_sullivan",
      amenityTags: {
        chilledSeats: true,
        fijiWater: true,
        starlinkWifi: true,
      },
      outOfServiceUntil: null,
    },
    {
      vehicleId: "veh_escalade_03",
      classId: "suv",
      year: 2023,
      make: "Cadillac",
      model: "Escalade ESV",
      trim: "Premium Luxury",
      vin: "1GYS4HKL2PR182941",
      color: "Black Raven",
      licensePlate: "LUXE-003",
      photoUrls: [IMG_ESCALADE],
      maxPassengers: 6,
      maxLuggage: 6,
      active: true,
      assignedDriverId: "drv_rossi",
      amenityTags: {
        fijiWater: true,
        starlinkWifi: true,
      },
      outOfServiceUntil: null,
    },
    {
      vehicleId: "veh_denali_01",
      classId: "suv",
      year: 2024,
      make: "GMC",
      model: "Yukon XL",
      trim: "Denali Ultimate",
      vin: "1GKS2CKL5RR291048",
      color: "Onyx Black",
      licensePlate: "LUXE-004",
      photoUrls: [IMG_DENALI],
      maxPassengers: 6,
      maxLuggage: 6,
      active: true,
      assignedDriverId: "drv_gomez",
      amenityTags: {
        chilledSeats: true,
        pellegrino: true,
        starlinkWifi: true,
        burmesterAudio: true,
      },
      outOfServiceUntil: null,
    },
    {
      vehicleId: "veh_suburban_01",
      classId: "suv",
      year: 2024,
      make: "Chevrolet",
      model: "Suburban",
      trim: "Premier",
      vin: "1GNSKCKL7RR381920",
      color: "Black",
      licensePlate: "LUXE-005",
      photoUrls: [IMG_ESCALADE],
      maxPassengers: 6,
      maxLuggage: 6,
      active: true,
      assignedDriverId: "drv_mendez",
      amenityTags: {
        rearEntertainment: true,
        fijiWater: true,
        starlinkWifi: true,
      },
      outOfServiceUntil: null,
    },
    {
      vehicleId: "veh_sclass_01",
      classId: "sedan",
      year: 2024,
      make: "Mercedes-Benz",
      model: "S-Class S580",
      trim: "4MATIC Executive",
      vin: "W1KZF8HB9RA091823",
      color: "Obsidian Black",
      licensePlate: "LUXE-006",
      photoUrls: [IMG_SCLASS],
      maxPassengers: 3,
      maxLuggage: 3,
      active: true,
      assignedDriverId: "drv_dubois",
      amenityTags: {
        massageSeats: true,
        chilledSeats: true,
        executivePartition: true,
        burmesterAudio: true,
        fijiWater: true,
      },
      outOfServiceUntil: null,
    },
  ];

  for (const v of vehicles) {
    await db.collection("vehicles").doc(v.vehicleId).set(v);
  }
  console.log(`✅ Seeded ${vehicles.length} Joe's Flagship Owned Vehicles with VINs & Amenity Tags`);
}

seed()
  .then(() => {
    console.log("Fleet and Driver seeding completed successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seeding error:", err);
    process.exit(1);
  });
