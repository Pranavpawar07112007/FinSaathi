
import { getApps, initializeApp, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

export function getFirebaseApp() {
  if (!getApps().length) {
    // In a deployed Google environment, serviceAccount will be null,
    // and initializeApp() will automatically use the runtime credentials.
    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      // For local development without the env var, or in a deployed env.
      initializeApp();
    }
  }

  const app = getApp();
  const firestore = getFirestore(app);

  return { app, firestore };
}
