/** Env that wires the Next.js server to the local Firebase emulators. */
export const emulatorEnv = {
  FIREBASE_PROJECT_ID: "demo-fitsplit",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-fitsplit",
  NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-fitsplit.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-fitsplit.appspot.com",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  // Neutralise anything real that .env.local would otherwise inject.
  GOOGLE_APPLICATION_CREDENTIALS: "",
  FIREBASE_CLIENT_EMAIL: "",
  FIREBASE_PRIVATE_KEY: "",
  FITSPLIT_LOCAL_MODE: "false",
  NEXT_DIST_DIR: process.env.NEXT_DIST_DIR || ".next"
};
