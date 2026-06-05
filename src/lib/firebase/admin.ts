import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getStorage } from "firebase-admin/storage";

function privateKey() {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

export function hasFirebaseAdminConfig() {
  const hasServiceAccount = Boolean(process.env.FIREBASE_CLIENT_EMAIL && privateKey());
  const hasApplicationDefault = Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.K_SERVICE ||
      process.env.FUNCTION_TARGET ||
      process.env.FIREBASE_CONFIG
  );

  return Boolean(process.env.FIREBASE_PROJECT_ID && (hasServiceAccount || hasApplicationDefault));
}

export function createFirebaseAdminApp() {
  if (getApps().length) {
    return getApps()[0];
  }

  return initializeApp({
    credential:
      process.env.FIREBASE_CLIENT_EMAIL && privateKey()
        ? cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey()
          })
        : applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  });
}

export function getFirebaseAdminServices() {
  const app = createFirebaseAdminApp();

  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    storage: getStorage(app)
  };
}

/**
 * Returns the Firebase Admin Messaging instance.
 * Must only be called from server-side code (Server Actions, API routes).
 */
export function getAdminMessaging() {
  const app = createFirebaseAdminApp();
  return getMessaging(app);
}
