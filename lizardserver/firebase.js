const admin = require('firebase-admin');

let db = null;
let initialized = false;

function initFirebase() {
  if (initialized) return;

  if (process.env.NODE_ENV === 'test') {
    try {
      if (admin.apps.length === 0) {
        admin.initializeApp({ projectId: 'test-project' });
      }
    } catch (error) {
      if (!error.message || !error.message.includes('already exists')) {
        console.warn('Firebase initialization skipped in test mode:', error.message);
      }
    }

    if (typeof admin.auth !== 'function') {
      admin.auth = () => ({ verifyIdToken: async () => ({ uid: 'test-user' }) });
    }
    db = admin.firestore ? admin.firestore() : null;
    initialized = true;
    return;
  }

  if (admin.apps.length > 0) return;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    admin.initializeApp();
  }
  db = admin.firestore();
  initialized = true;
}

module.exports = {
  initFirebase,
  db,
  admin
};
