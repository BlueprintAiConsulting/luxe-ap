const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  projectId: "luxe-app-1786335311",
});

const db = getFirestore();

async function createTestVehicles() {
  const classId = 'luxury-suv';
  
  console.log("Creating vehicle class...");
  await db.collection('vehicleClasses').doc(classId).set({
    classId: classId,
    name: 'Luxury SUV',
    description: 'Spacious and comfortable SUV, perfect for airport transfers and groups.',
    maxPassengers: 6,
    maxLuggage: 6,
    heroImageUrl: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=60',
    sortOrder: 1,
    active: true
  });

  const vehicleId = 'veh_escalade_01';
  console.log("Creating vehicle...");
  await db.collection('vehicles').doc(vehicleId).set({
    vehicleId: vehicleId,
    classId: classId,
    year: 2024,
    make: 'Cadillac',
    model: 'Escalade ESV',
    color: 'Black',
    licensePlate: 'LUXURY1',
    photoUrls: ['https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=60'],
    maxPassengers: 6,
    maxLuggage: 6,
    active: true,
    outOfServiceUntil: null
  });

  const sedanClassId = 'executive-sedan';
  console.log("Creating another vehicle class...");
  await db.collection('vehicleClasses').doc(sedanClassId).set({
    classId: sedanClassId,
    name: 'Executive Sedan',
    description: 'Premium sedan for business professionals and individuals.',
    maxPassengers: 3,
    maxLuggage: 2,
    heroImageUrl: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&auto=format&fit=crop&q=60',
    sortOrder: 2,
    active: true
  });

  const sedanVehicleId = 'veh_sclass_01';
  console.log("Creating another vehicle...");
  await db.collection('vehicles').doc(sedanVehicleId).set({
    vehicleId: sedanVehicleId,
    classId: sedanClassId,
    year: 2024,
    make: 'Mercedes-Benz',
    model: 'S-Class',
    color: 'Black',
    licensePlate: 'LUXURY2',
    photoUrls: ['https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&auto=format&fit=crop&q=60'],
    maxPassengers: 3,
    maxLuggage: 2,
    active: true,
    outOfServiceUntil: null
  });

  console.log("Successfully created test vehicle classes and vehicles.");
}

createTestVehicles();
