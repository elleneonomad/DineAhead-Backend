const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require(path.join(__dirname, '../firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID || 'chat-flutter-a10ed',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'chat-flutter-a10ed.appspot.com'
});

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();
const bucket = storage.bucket();

module.exports = {
  admin,
  db,
  auth,
  storage,
  bucket
};
