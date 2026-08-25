import { httpsCallable } from "firebase/functions";
import { signInWithEmailAndPassword, signInWithCustomToken, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, functions } from "@/lib/firebase";

export type LoginMode = "member" | "staff";

type LookupLoginEmailResult = { email: string };

const lookupLoginEmail = httpsCallable<{ identifier: string; mode: LoginMode }, LookupLoginEmailResult>(
  functions,
  "lookupLoginEmail"
);

export const requestPhoneOtpCallable = httpsCallable<{ phone: string }, { status: string; message: string; data?: { debugOtp?: string } }>(
  functions,
  "requestPhoneOtp"
);

export const verifyPhoneOtpCallable = httpsCallable<{ phone: string; code: string }, { status: string; message: string; data: { customToken: string; isNewAccount: boolean; uid: string; phone: string } }>(
  functions,
  "verifyPhoneOtp"
);

export const deleteOwnAccountCallable = httpsCallable<void, { status: string; message: string }>(
  functions,
  "deleteOwnAccount"
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

/**
 * Signs in using a custom token returned by verifyPhoneOtp.
 * Provisions personal workspace in Firestore if this is a new consumer account.
 */
export async function signInWithCustomOtpToken(customToken: string, fullName: string, phone: string): Promise<LoginResult> {
  try {
    const userCredential = await signInWithCustomToken(auth, customToken);
    const uid = userCredential.user.uid;
    const personalGymId = `personal-${uid}`;
    const now = new Date().toISOString();

    // Check if authProfile exists; if not, provision personal workspace
    const profileRef = doc(db, "authProfiles", uid);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists() || !profileSnap.data()?.defaultGymId) {
      await setDoc(profileRef, {
        id: uid,
        uid,
        fullName: fullName || "FitSplit Member",
        phone,
        role: "member",
        plan: "free",
        defaultGymId: personalGymId,
        activeGymId: personalGymId,
        isActive: true,
        termsAcceptedAt: now,
        createdAt: now,
        updatedAt: now
      }, { merge: true });

      // Personal gym
      await setDoc(doc(db, "gyms", personalGymId), {
        id: personalGymId,
        name: `${fullName || "My"} Workspace`,
        slug: `personal-${uid.slice(0, 8)}`,
        ownerName: fullName || "FitSplit Member",
        ownerUserId: uid,
        ownerId: uid,
        type: "personal",
        status: "active",
        memberCount: 1,
        expiryWarningDays: 7,
        createdAt: now,
        updatedAt: now
      }, { merge: true });

      // Member inside personal gym
      await setDoc(doc(db, "gyms", personalGymId, "members", uid), {
        id: uid,
        gymId: personalGymId,
        fullName: fullName || "FitSplit Member",
        phone,
        role: "member",
        isActive: true,
        joinedAt: now.slice(0, 10),
        createdAt: now,
        updatedAt: now
      }, { merge: true });

      // Affiliation
      await setDoc(doc(db, "authProfiles", uid, "affiliations", personalGymId), {
        gymId: personalGymId,
        gymName: `${fullName || "My"} Workspace`,
        type: "personal",
        role: "member",
        memberId: uid,
        status: "active",
        joinedAt: now
      }, { merge: true });
    }

    return { status: "success" };
  } catch (error) {
    console.error("[signInWithCustomOtpToken] Error:", error);
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
