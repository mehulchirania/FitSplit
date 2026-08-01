import { httpsCallable } from "firebase/functions";
import { signInWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, functions } from "@/lib/firebase";

export type LoginMode = "member" | "staff";

type LookupLoginEmailResult = { email: string };

const lookupLoginEmail = httpsCallable<{ identifier: string; mode: LoginMode }, LookupLoginEmailResult>(
  functions,
  "lookupLoginEmail"
);

export type LoginResult =
  | { status: "success" }
  | { status: "error"; message: string };

/**
 * Mirrors loginWithCredentials in src/lib/auth.ts (web): resolve the typed
 * username/phone to a Firebase Auth email via the shared lookupLoginEmail
 * callable, then sign in directly with the Firebase client SDK — no session
 * cookie, the SDK owns token storage/refresh via AsyncStorage persistence.
 */
export async function signIn(identifier: string, password: string, mode: LoginMode): Promise<LoginResult> {
  const trimmedIdentifier = identifier.trim();
  const trimmedPassword = password.trim();

  if (!trimmedIdentifier || !trimmedPassword) {
    return { status: "error", message: "Enter your login details." };
  }

  try {
    const { data } = await lookupLoginEmail({ identifier: trimmedIdentifier, mode });
    const firebasePassword = mode === "member" ? `pin-${trimmedPassword}` : trimmedPassword;
    await signInWithEmailAndPassword(auth, data.email, firebasePassword);
    return { status: "success" };
  } catch (error) {
    return { status: "error", message: mapAuthError(error) };
  }
}

export async function signOutUser() {
  await firebaseSignOut(auth);
}

export type AuthenticatedProfile = {
  uid: string;
  fullName: string;
  role: string;
  phone: string;
  defaultGymId: string;
};

/**
 * Reads the signed-in user's own authProfiles doc directly via the Firestore
 * client SDK — firestore.rules already allows isMemberSelf(userId) /
 * isStaffForGym self-reads, so this needs no backend endpoint.
 */
export async function getCurrentProfile(): Promise<AuthenticatedProfile | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;

  const snapshot = await getDoc(doc(db, "authProfiles", uid));
  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return {
    uid,
    fullName: String(data.fullName ?? "FitSplit user"),
    role: String(data.role ?? "member"),
    phone: String(data.phone ?? ""),
    defaultGymId: String(data.defaultGymId ?? "")
  };
}

function mapAuthError(error: unknown): string {
  const code = (error as { code?: string } | undefined)?.code ?? "";
  if (code === "functions/not-found") return "No account found for that username or phone number.";
  if (code === "functions/permission-denied") return "Your account has been suspended.";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password") return "Invalid password or PIN.";
  if (code === "auth/too-many-requests") return "Too many failed attempts. Try again shortly.";
  return "Unable to sign in. Please try again.";
}
