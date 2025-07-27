const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let firebaseApp;

function initializeFirebase() {
  if (!firebaseApp) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json');

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
  }
  return firebaseApp;
}

// Firestore Database
function getFirestore() {
  const app = initializeFirebase();
  return admin.firestore(app);
}

// Authentication
function getAuth() {
  const app = initializeFirebase();
  return admin.auth(app);
}

// Storage
function getStorage() {
  const app = initializeFirebase();
  return admin.storage(app);
}

// Interview Session Management
async function saveInterviewSession(sessionData) {
  try {
    const db = getFirestore();
    const docRef = await db.collection('interview_sessions').add({
      ...sessionData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving interview session:', error);
    throw error;
  }
}

async function getInterviewSession(sessionId) {
  try {
    const db = getFirestore();
    const doc = await db.collection('interview_sessions').doc(sessionId).get();
    
    if (!doc.exists) {
      throw new Error('Interview session not found');
    }
    
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error getting interview session:', error);
    throw error;
  }
}

async function updateInterviewSession(sessionId, updateData) {
  try {
    const db = getFirestore();
    await db.collection('interview_sessions').doc(sessionId).update({
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating interview session:', error);
    throw error;
  }
}

// User Management
async function createUser(userData) {
  try {
    const auth = getAuth();
    const user = await auth.createUser(userData);
    
    const db = getFirestore();
    await db.collection('users').doc(user.uid).set({
      ...userData,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

async function getUserProfile(userId) {
  try {
    const db = getFirestore();
    const doc = await db.collection('users').doc(userId).get();
    
    if (!doc.exists) {
      throw new Error('User not found');
    }
    
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
}

// Audio Storage
async function uploadAudioFile(audioBuffer, fileName, metadata = {}) {
  try {
    const storage = getStorage();
    const bucket = storage.bucket();
    const file = bucket.file(`audio/${fileName}`);
    
    await file.save(audioBuffer, {
      metadata: {
        contentType: 'audio/mpeg',
        ...metadata
      }
    });
    
    // Get signed URL for download
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });
    
    return url;
  } catch (error) {
    console.error('Error uploading audio file:', error);
    throw error;
  }
}

module.exports = {
  initializeFirebase,
  getFirestore,
  getAuth,
  getStorage,
  saveInterviewSession,
  getInterviewSession,
  updateInterviewSession,
  createUser,
  getUserProfile,
  uploadAudioFile
};