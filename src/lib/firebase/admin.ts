import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function privateKey() {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

/**
 * True when server-side Firebase is usable. Setting FITSPLIT_LOCAL_MODE=true (never
 * honoured in production) forces the no-Firebase local mode even if credentials exist,
 * e.g. while the real project is unreachable.
 */
export function hasFirebaseAdminConfig() {
  if (process.env.FITSPLIT_LOCAL_MODE === "true" && process.env.NODE_ENV !== "production") return false;
  const hasServiceAccount = Boolean(process.env.FIREBASE_CLIENT_EMAIL && privateKey());
  const hasApplicationDefault = Boolean(
    // Local emulators need no credentials, only the project id.
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.K_SERVICE ||
      process.env.FUNCTION_TARGET ||
      process.env.FIREBASE_CONFIG
  );

  return Boolean(process.env.FIREBASE_PROJECT_ID && (hasServiceAccount || hasApplicationDefault));
}

function createFirebaseAdminApp() {
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
