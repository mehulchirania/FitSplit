"use server";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { collectionPaths } from "@/lib/firebase/collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "@/lib/firebase/admin";
import { buildConsentRecord } from "@/lib/legal-config";
import { hitRateLimit } from "@/lib/rate-limit";
import { diagnosticsGranted, parseSignup, SIGNUP_LIMITS } from "@/lib/signup-schema";
import type { FormActionState } from "@/types/action-state";

/**
 * Authentication for FitSplit: one kind of account, email + password.
 *
 * - Production: Firebase Auth (identity) + a Firebase session cookie. The
 *   session cookie is verified server-side on every request (checkRevoked).
 * - Local development without Firebase credentials: a signed-out-by-default
 *   "local" account stored in a cookie so the UI can be exercised end to end.
 *   This path is disabled when NODE_ENV === "production".
 */

const sessionCookieName = "fitsplit-session";
const localUserCookieName = "fitsplit-local-user";
const SESSION_SHORT_MS = 1000 * 60 * 60 * 2; // 2 h  - default (no "remember me")
const SESSION_LONG_MS = 1000 * 60 * 60 * 24 * 14; // 14 d - remember me (Firebase max)

const HOME_PATH = "/member";

export type AuthenticatedUser = {
  uid: string;
  email?: string;
  fullName: string;
  /** Public URL of the user's avatar, when the identity provider supplies one. */
  avatarUrl?: string;
};

const isProd = process.env.NODE_ENV === "production";

function cookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: isProd
  };
}

function localModeAllowed() {
  return !isProd && !hasFirebaseAdminConfig();
}

/**
 * Basic abuse guard for signup/login. Skipped in local dev and against the emulator
 * (so automated tests aren't throttled). Per-instance, best effort.
 */
async function abuseLimited(scope: "signup" | "login", extra: string, limit: number, windowMs: number) {
  if (!isProd || process.env.FIREBASE_AUTH_EMULATOR_HOST) return false;
  const forwarded = (await headers()).get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  return hitRateLimit(`${scope}:${ip}:${extra}`, limit, windowMs).limited;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function initialsOf(name: string) {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase() || "FS"
  );
}

async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
  cookieStore.delete(localUserCookieName);
}

// -- Local (no Firebase) accounts ---------------------------------------------

async function startLocalSession(email: string, fullName: string) {
  const cookieStore = await cookies();
  const uid = `local-${Buffer.from(email.toLowerCase()).toString("hex").slice(0, 16)}`;
  cookieStore.set(localUserCookieName, JSON.stringify({ uid, email, fullName }), cookieOptions(SESSION_LONG_MS / 1000));
  return uid;
}

async function readLocalUser(): Promise<AuthenticatedUser | null> {
  if (!localModeAllowed()) return null;
  const raw = (await cookies()).get(localUserCookieName)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { uid?: string; email?: string; fullName?: string };
    if (!parsed.uid) return null;
    return { uid: parsed.uid, email: parsed.email, fullName: parsed.fullName || "FitSplit user" };
  } catch {
    return null;
  }
}

// -- Firebase REST helpers -----------------------------------------------------

type IdentityResult = { ok: true; idToken: string } | { ok: false; code: string };

/** Identity Toolkit REST base URL; points at the Auth emulator when one is configured. */
function identityToolkitBase() {
  const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  return emulator ? `http://${emulator}/identitytoolkit.googleapis.com/v1` : "https://identitytoolkit.googleapis.com/v1";
}

async function signInWithPasswordRest(email: string, password: string): Promise<IdentityResult> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return { ok: false, code: "MISSING_API_KEY" };

  const response = await fetch(`${identityToolkitBase()}/accounts:signInWithPassword?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    return { ok: false, code: body.error?.message ?? "UNKNOWN" };
  }
  const payload = (await response.json()) as { idToken?: string };
  return payload.idToken ? { ok: true, idToken: payload.idToken } : { ok: false, code: "NO_TOKEN" };
}

async function createSessionFromIdToken(idToken: string, rememberMe: boolean) {
  const { auth } = getFirebaseAdminServices();
  await auth.verifyIdToken(idToken);
  const expiresIn = rememberMe ? SESSION_LONG_MS : SESSION_SHORT_MS;
  const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
  (await cookies()).set(sessionCookieName, sessionCookie, cookieOptions(Math.floor(expiresIn / 1000)));
}

function loginErrorMessage(code: string) {
  if (code.startsWith("TOO_MANY_ATTEMPTS")) return "Too many failed attempts. Please wait a few minutes and try again.";
  if (code === "USER_DISABLED") return "This account has been disabled.";
  if (code === "MISSING_API_KEY") return "Sign-in is not configured (missing NEXT_PUBLIC_FIREBASE_API_KEY).";
  return "Invalid email or password.";
}

// -- Public actions ------------------------------------------------------------

export type AuthResult =
  | { status: "success"; redirectUrl: string }
  | { status: "error"; message: string };

/** Create a new account and sign the user in. */
export async function signUpWithEmail(formData: FormData): Promise<AuthResult> {
  try {
    // Server-side validation. The consent checkboxes are enforced here, not just in the browser.
    const parsed = parseSignup(formData);
    if (!parsed.ok) return { status: "error", message: parsed.message };
    const { fullName, email, password } = parsed.data;
    const consent = buildConsentRecord({
      ageGroup: parsed.data.ageGroup,
      diagnostics: diagnosticsGranted(parsed.data.diagnosticsConsent),
      guardianEmail: parsed.data.guardianEmail
    });

    if (await abuseLimited("signup", "", 10, 60 * 60 * 1000)) {
      return { status: "error", message: "Too many sign-up attempts. Please try again later." };
    }

    if (localModeAllowed()) {
      await startLocalSession(email, fullName);
      return { status: "success", redirectUrl: HOME_PATH };
    }
    if (!hasFirebaseAdminConfig()) {
      return { status: "error", message: "Sign-up is unavailable: the server is not connected to Firebase." };
    }

    const { auth, db } = getFirebaseAdminServices();
    let uid: string;
    try {
      const created = await auth.createUser({ email, password, displayName: fullName });
      uid = created.uid;
    } catch (error) {
      const code = (error as { code?: string }).code ?? "";
      if (code === "auth/email-already-exists") {
        return { status: "error", message: "An account with this email already exists. Try signing in." };
      }
      if (code === "auth/invalid-password") {
        return { status: "error", message: "Password must be at least 8 characters." };
      }
      throw error;
    }

    const now = new Date().toISOString();
    await db.collection(collectionPaths.users).doc(uid).set({
      id: uid,
      fullName,
      email,
      avatarInitials: initialsOf(fullName),
      goal: "General fitness",
      isActive: true,
      termsAcceptedAt: now,
      consent,
      isMinor: consent.ageGroup === "minor",
      joinedAt: now.slice(0, 10),
      createdAt: now,
      updatedAt: now
    });

    const signedIn = await signInWithPasswordRest(email, password);
    if (!signedIn.ok) {
      return { status: "error", message: "Your account was created. Please sign in." };
    }
    await createSessionFromIdToken(signedIn.idToken, true);
    return { status: "success", redirectUrl: HOME_PATH };
  } catch (error) {
    console.error("[auth] signUpWithEmail failed:", error);
    return { status: "error", message: "Unable to create your account. Please try again." };
  }
}

/** Sign in with email + password. */
export async function loginWithCredentials(formData: FormData): Promise<AuthResult> {
  try {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const rememberMe = formData.get("rememberMe") === "true";

    if (!email || !password) return { status: "error", message: "Enter your email and password." };
    if (email.length > SIGNUP_LIMITS.email || password.length > SIGNUP_LIMITS.password) {
      return { status: "error", message: "Invalid email or password." };
    }
    if (await abuseLimited("login", email, 10, 10 * 60 * 1000)) {
      return { status: "error", message: "Too many sign-in attempts. Please wait a few minutes and try again." };
    }

    if (localModeAllowed()) {
      await startLocalSession(email, email.split("@")[0] || "Athlete");
      return { status: "success", redirectUrl: HOME_PATH };
    }
    if (!hasFirebaseAdminConfig()) {
      return { status: "error", message: "Sign-in is unavailable: the server is not connected to Firebase." };
    }

    const result = await signInWithPasswordRest(email, password);
    if (!result.ok) return { status: "error", message: loginErrorMessage(result.code) };

    await createSessionFromIdToken(result.idToken, rememberMe);
    return { status: "success", redirectUrl: HOME_PATH };
  } catch (error) {
    console.error("[auth] loginWithCredentials failed:", error);
    return { status: "error", message: "Unable to sign in. Please try again." };
  }
}

/** Send a password-reset email through Firebase Auth. */
export async function requestPasswordReset(formData: FormData): Promise<{ status: "success" | "error"; message: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) return { status: "error", message: "Enter your email address first." };

  // Same response whether or not the account exists, so emails can't be probed.
  const generic = {
    status: "success" as const,
    message: "If an account exists for that email, a password reset link is on its way."
  };

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return generic;

  try {
    await fetch(`${identityToolkitBase()}/accounts:sendOobCode?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "PASSWORD_RESET", email }),
      signal: AbortSignal.timeout(10_000)
    });
  } catch (error) {
    console.error("[auth] requestPasswordReset failed:", error);
  }
  return generic;
}

/** Change the signed-in user's password (requires the current one). */
export async function changePassword(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  try {
    const user = await requireAuth();
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (newPassword.length < 8) return { status: "error", message: "New password must be at least 8 characters." };
    if (newPassword !== confirmPassword) return { status: "error", message: "New passwords do not match." };
    if (newPassword === currentPassword) return { status: "error", message: "Choose a different password." };

    if (!hasFirebaseAdminConfig()) {
      return { status: "success", message: "Password updated (local mode)." };
    }
    if (!user.email) return { status: "error", message: "This account has no email address." };

    const verified = await signInWithPasswordRest(user.email, currentPassword);
    if (!verified.ok) return { status: "error", message: "Your current password is incorrect." };

    const { auth } = getFirebaseAdminServices();
    await auth.updateUser(user.uid, { password: newPassword });
    return { status: "success", message: "Password updated." };
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    console.error("[auth] changePassword failed:", error);
    return { status: "error", message: "Unable to update your password. Please try again." };
  }
}

export async function logoutUser() {
  await clearAuthCookies();
  redirect("/");
}

// -- Session -------------------------------------------------------------------

// Per-request memoization: a layout and a page can both call getCurrentUser and
// the cookie verification only runs once.
const getCurrentUserCached = cache(_getCurrentUserImpl);
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  return getCurrentUserCached();
}

async function _getCurrentUserImpl(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(sessionCookieName)?.value;

  if (!hasFirebaseAdminConfig() || !session) {
    return readLocalUser();
  }

  try {
    const { auth } = getFirebaseAdminServices();
    // checkRevoked: true so a disabled account or a password reset takes effect
    // immediately instead of when the cookie expires.
    const decoded = await auth.verifySessionCookie(session, true);
    return {
      uid: decoded.uid,
      email: decoded.email,
      fullName: (decoded.name as string | undefined) || decoded.email?.split("@")[0] || "FitSplit user",
      avatarUrl: decoded.picture
    };
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}
