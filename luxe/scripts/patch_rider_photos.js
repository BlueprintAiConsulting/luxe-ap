const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({ projectId: "luxe-app-1786335311" });
const db = getFirestore();

async function patchRiderPhotos() {
  const usersSnap = await db.collection('users').get();
  const users = {};
  usersSnap.forEach(doc => {
    users[doc.id] = doc.data();
  });

  const resSnap = await db.collection('reservations').get();
  const batch = db.batch();
  let count = 0;

  resSnap.forEach(doc => {
    const data = doc.data();
    if (!data.riderPhotoUrl && data.riderId && users[data.riderId]?.photoUrl) {
      batch.update(doc.ref, { riderPhotoUrl: users[data.riderId].photoUrl });
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`Patched ${count} reservations with riderPhotoUrl.`);
  } else {
    console.log("No reservations needed patching.");
  }
}

patchRiderPhotos().catch(console.error);
