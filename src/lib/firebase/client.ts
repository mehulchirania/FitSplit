import { getApps, initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getMessaging, isSupported } from "firebase/messaging";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const USE_EMULATOR = process.env.NEXT_PUBLIC_USE_EMULATOR === "true";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

/** Region where Cloud Functions are deployed. Must match functions/src/index.ts. */
const FUNCTIONS_REGION = "asia-south1";

function createFirebaseApp() {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }

  return getApps()[0];
}

let _emulatorsConnected = false;

export function getFirebaseClientServices() {
  const app = createFirebaseApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  const functions = getFunctions(app, FUNCTIONS_REGION);

  if (USE_EMULATOR && !_emulatorsConnected) {
    _emulatorsConnected = true;
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "localhost", 8080);
    connectStorageEmulator(storage, "localhost", 9199);
    connectFunctionsEmulator(functions, "localhost", 5001);
  }

  return { app, auth, db, storage, functions };
}

/**
 * Returns a Firebase Messaging instance if the browser supports it, otherwise null.
 * Must only be called in client-side code (not in Server Components or actions).
 */
export async function getFirebaseMessaging() {
  const supported = await isSupported();
  if (!supported) return null;
  const app = createFirebaseApp();
  return getMessaging(app);
}
