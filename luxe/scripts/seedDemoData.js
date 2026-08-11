const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');

// Initialize Firebase Admin with ADC (Application Default Credentials)
initializeApp({
  credential: applicationDefault()
});

const db = getFirestore();

async function seed() {
  console.log("Seeding demo driver and rider...");

  // Seed a demo rider
  const riderRef = db.collection('users').doc('demo_rider_1');
  await riderRef.set({
    uid: 'demo_rider_1',
    role: 'rider',
    email: 'sarah.jenkins@example.com',
    firstName: 'Sarah',
    lastName: 'Jenkins',
    phone: '+15550123456',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
    createdAt: FieldValue.serverTimestamp(),
    searchName: 'sarah jenkins',
    totalRides: 14,
    disabled: false
  });
  console.log("Demo rider seeded.");

  // Seed a demo driver in the users collection first (so they can log in if needed)
  const driverUserRef = db.collection('users').doc('demo_driver_1');
  await driverUserRef.set({
    uid: 'demo_driver_1',
    role: 'driver',
    email: 'michael.chen@example.com',
    firstName: 'Michael',
    lastName: 'Chen',
    phone: '+15559876543',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80',
    createdAt: FieldValue.serverTimestamp(),
    searchName: 'michael chen',
    totalRides: 342,
    disabled: false
  });

  // Seed the driver's public profile in the drivers collection
  const driverProfileRef = db.collection('drivers').doc('demo_driver_1');
  await driverProfileRef.set({
    driverId: 'demo_driver_1',
    userId: 'demo_driver_1',
    displayName: 'Michael Chen',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80',
    bio: 'Professional chauffeur with over 10 years of experience navigating the city. Known for punctuality, smooth driving, and providing a quiet, relaxing atmosphere for business travelers.',
    languages: ['English', 'Mandarin'],
    yearsExperience: 12,
    rating: 4.9,
    ratingCount: 342,
    active: true,
    bookable: true,
    createdAt: FieldValue.serverTimestamp()
  });

  // Seed the driver's private credentials
  const driverCredsRef = db.collection('drivers').doc('demo_driver_1').collection('private').doc('credentials');
  await driverCredsRef.set({
    licenseNumber: 'DL-987654321',
    licenseExpiry: Timestamp.fromDate(new Date('2028-12-31')),
    medicalCertExpiry: Timestamp.fromDate(new Date('2027-06-30')),
    backgroundCheckDate: Timestamp.fromDate(new Date('2025-01-15')),
    employmentType: '1099',
    phone: '+15559876543',
    emergencyContact: {
      name: 'Lisa Chen',
      phone: '+15551239876'
    }
  });
  console.log("Demo driver seeded.");
  
  console.log("Done.");
}

seed().catch(console.error);
