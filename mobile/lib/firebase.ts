import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth, type Auth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";

// getReactNativePersistence is genuinely exported at runtime for React Native
// (Metro resolves @firebase/auth's package.json "react-native" exports
// condition/field correctly), but neither firebase/auth's nor @firebase/auth's
// own "exports" map nests a "types" key under their "react-native" condition —
// the top-level "types" key wins regardless of platform, so tsc can never see
// this symbol through any import path. Verified in node_modules/@firebase/auth/
// package.json before reaching for this suppression rather than assuming.
// @ts-expect-error — see comment above; real export, missing types only.
import { getReactNativePersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// initializeAuth throws if the app already has an Auth instance attached —
// which happens on Fast Refresh during development, since this module
// re-evaluates but the underlying native app instance doesn't reset.
let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch {
  authInstance = getAuth(app);
}
export const auth = authInstance;

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});

// Same region every Cloud Function in functions/src/index.ts deploys to.
export const functions = getFunctions(app, "asia-south1");
