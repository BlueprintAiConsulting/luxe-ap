const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

initializeApp({
  projectId: "luxe-app-1786335311",
});

async function createTestUsers() {
  const users = [
    {
      email: "rider@luxe.com",
      password: "password123",
      displayName: "Test Rider",
      role: "rider"
    },
    {
      email: "driver@luxe.com",
      password: "password123",
      displayName: "Test Driver",
      role: "driver"
    }
  ];

  for (const user of users) {
    try {
      let userRecord;
      try {
        userRecord = await getAuth().getUserByEmail(user.email);
        console.log(`User ${user.email} already exists, updating...`);
        await getAuth().updateUser(userRecord.uid, { password: user.password, displayName: user.displayName });
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          console.log(`Creating user ${user.email}...`);
          userRecord = await getAuth().createUser({
            email: user.email,
            password: user.password,
            displayName: user.displayName,
          });
        } else {
          throw err;
        }
      }

      await getAuth().setCustomUserClaims(userRecord.uid, { role: user.role });
      console.log(`Successfully configured ${user.email} as ${user.role} (UID: ${userRecord.uid})`);
    } catch (error) {
      console.error(`Error processing ${user.email}:`, error);
    }
  }
}

createTestUsers();
