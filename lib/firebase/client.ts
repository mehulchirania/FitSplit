import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

/** Region where Cloud Functions are deployed. Must match functions/src/index.ts. */
export const FUNCTIONS_REGION = "asia-south1";

export function createFirebaseApp() {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }

  return getApps()[0];
}

export function getFirebaseClientServices() {
  const app = createFirebaseApp();

  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    storage: getStorage(app),
    functions: getFunctions(app, FUNCTIONS_REGION),
  };
}
