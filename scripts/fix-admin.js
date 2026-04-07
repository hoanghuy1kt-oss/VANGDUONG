const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

async function createAdmin() {
  const serviceAccountPath = path.join(process.cwd(), 'service-account-key.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  const email = 'hoanghuy1kt@gmail.com';
  const password = '123456';
  
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log(`User already exists in Auth: ${userRecord.uid}. Updating password...`);
    await admin.auth().updateUser(userRecord.uid, { password });
    console.log('Password updated successfully.');
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.log('Creating new Auth user...');
      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: 'Hoàng Huy'
      });
      console.log(`Successfully created new user: ${userRecord.uid}`);
      
      // Update the firestore users collection to link the newly created uid
      const db = admin.firestore();
      
      // Since earlier it might have saved with `uid` or `id` differently
      // Let's sweep the existing ones and delete the dummy one, then add the real one
      const snapshot = await db.collection('users').where('email', '==', email).get();
      if (!snapshot.empty) {
         for (const doc of snapshot.docs) {
           await doc.ref.delete();
         }
      }
      
      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: email,
        name: 'Hoàng Huy',
        displayName: 'Hoàng Huy',
        role: 'admin',
        assignedProjects: [],
        active: true,
        joinDate: new Date().toLocaleDateString('vi-VN'),
        mustChangePwd: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('User inserted into Firestore securely.');
    } else {
      console.error('Error fetching user data:', error);
    }
  }
}

createAdmin().then(() => process.exit(0)).catch(console.error);
