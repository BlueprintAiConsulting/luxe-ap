const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp({ projectId: "luxe-app-1786335311" });
const db = getFirestore();

async function createProfiles() {
  let riderAuth, driverAuth;
  try {
    riderAuth = await getAuth().getUserByEmail('rider@luxe.com');
  } catch (e) {
    console.error("Rider not found");
  }
  
  try {
    driverAuth = await getAuth().getUserByEmail('driver@luxe.com');
  } catch (e) {
    console.error("Driver not found");
  }
  
  const riderImageUrl = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=60';
  const driverImageUrl = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=60';
  
  if (riderAuth) {
    console.log("Creating Rider user doc...");
    await db.collection('users').doc(riderAuth.uid).set({
      uid: riderAuth.uid,
      role: 'rider',
      phone: '+15551234567',
      email: riderAuth.email,
      photoUrl: riderImageUrl,
      firstName: 'Sarah',
      lastName: 'Jenkins',
      searchName: 'sarah jenkins',
      stripeCustomerId: null,
      defaultPaymentMethodId: null,
      preferences: null,
      notes: 'VIP client, prefers quiet rides.',
      totalRides: 12,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      disabled: false
    });
  }

  if (driverAuth) {
    console.log("Creating Driver user doc...");
    await db.collection('users').doc(driverAuth.uid).set({
      uid: driverAuth.uid,
      role: 'driver',
      phone: '+15559876543',
      email: driverAuth.email,
      photoUrl: driverImageUrl,
      firstName: 'Michael',
      lastName: 'Chen',
      searchName: 'michael chen',
      stripeCustomerId: null,
      defaultPaymentMethodId: null,
      preferences: null,
      notes: '',
      totalRides: 340,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      disabled: false
    });
    
    console.log("Creating Driver driver doc...");
    await db.collection('drivers').doc(driverAuth.uid).set({
      driverId: driverAuth.uid,
      userId: driverAuth.uid,
      displayName: 'Michael C.',
      photoUrl: driverImageUrl,
      bio: 'Professional chauffeur with 10 years of experience in luxury transport.',
      languages: ['English', 'Mandarin'],
      yearsExperience: 10,
      rating: 4.9,
      ratingCount: 340,
      active: true,
      bookable: true,
      createdAt: FieldValue.serverTimestamp()
    });
  }
  console.log("Profiles updated!");
}
createProfiles();
