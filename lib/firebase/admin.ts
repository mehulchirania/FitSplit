import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function privateKey() {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

export function hasFirebaseAdminConfig() {
  return Boolean(process.env.FIREBASE_PROJECT_ID);
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
