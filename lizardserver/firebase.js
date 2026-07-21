const admin = require('firebase-admin');

// Firebase admin credential configuration for local and production runs.
// Use either FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY.
// Also set FIREBASE_DATABASE_URL for Realtime Database access.

let db = null;
let rtdb = null;
let initialized = false;
let firebaseApp = null;

function initFirebase() {
  if (initialized) return;

  if (process.env.NODE_ENV === 'test') {
    try {
      if (admin.apps.length === 0) {
        admin.initializeApp({ projectId: 'test-project', databaseURL: 'https://test-project-default-rtdb.firebaseio.com' });
      }
    } catch (error) {
      if (!error.message || !error.message.includes('already exists')) {
        console.warn('Firebase initialization skipped in test mode:', error.message);
      }
    }

    if (typeof admin.auth !== 'function') {
      admin.auth = () => ({ verifyIdToken: async () => ({ uid: 'test-user' }) });
    }
    db = null;
    rtdb = null;
    initialized = true;
    return;
  }

  if (admin.apps.length > 0) {
    firebaseApp = admin.apps[0];
    initialized = true;
    return;
  }

  const firebaseConfig = {};
  const formatPrivateKey = (key) => key?.replace(/\\n/g, '\n');
  const hasServiceAccountJson = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const hasGoogleCredentials = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  const hasEnvCredentials = Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
  const hasCredentials = hasServiceAccountJson || hasGoogleCredentials || hasEnvCredentials;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    firebaseConfig.credential = admin.credential.cert(serviceAccount);
  } else if (hasEnvCredentials) {
    firebaseConfig.credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    });
  } else if (hasGoogleCredentials) {
    firebaseConfig.credential = admin.credential.applicationDefault();
  }

  if (process.env.FIREBASE_DATABASE_URL) {
    firebaseConfig.databaseURL = process.env.FIREBASE_DATABASE_URL;
  }

  if (!hasCredentials && !process.env.FIREBASE_DATABASE_URL) {
    console.warn('Firebase not configured; running without Firebase services');
    firebaseApp = null;
    db = null;
    rtdb = null;
    initialized = true;
    return;
  }

  try {
    firebaseApp = admin.initializeApp(firebaseConfig);
  } catch (error) {
    console.warn('Firebase initialization failed, continuing without Firebase services:', error.message);
    firebaseApp = null;
  }

  try {
    db = firebaseApp && admin.firestore ? admin.firestore() : null;
  } catch (error) {
    console.warn('Firestore initialization skipped:', error.message);
    db = null;
  }

  if (process.env.FIREBASE_DATABASE_URL && firebaseApp) {
    try {
      rtdb = admin.database ? admin.database() : null;
    } catch (error) {
      console.warn('Realtime Database initialization skipped:', error.message);
      rtdb = null;
    }
  } else {
    rtdb = null;
  }

  initialized = true;
}

function getDb() {
  return db;
}

function getRtdb() {
  return rtdb;
}

function getAdmin() {
  return firebaseApp ? admin : null;
}

function isFirebaseReady() {
  return Boolean(firebaseApp);
}

module.exports = {
  initFirebase,
  getDb,
  getRtdb,
  getAdmin,
  isFirebaseReady,
  admin
};
