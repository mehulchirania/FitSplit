"use server";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { collectionPaths } from "@/lib/firebase/collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "@/lib/firebase/admin";
import { buildConsentRecord } from "@/lib/legal-config";
import { emailToPhone, isValidPin, normalizePhone, phoneToEmail, pinToPassword } from "@/lib/phone-identity";
import { clearFailures, getLockRemaining, lockMessage, recordFailure } from "@/lib/pin-lockout";
import { hitRateLimit } from "@/lib/rate-limit";
import { diagnosticsGranted, parseSignup } from "@/lib/signup-schema";
import type { FormActionState } from "@/types/action-state";

/**
 * Authentication for FitSplit: one kind of account, mobile number + 4-digit PIN.
 *
 * Firebase Auth has no phone+PIN credential, so every account is an email/password
 * user with a synthetic identity derived from the number and PIN
 * (lib/phone-identity.ts). There is no OTP, no SMS and no email in the flow. Wrong
 * PINs are counted per number on the server (lib/pin-lockout.ts): 5 misses lock the
 * number for 15 minutes.
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
  /** E.164 mobile number, e.g. +919688227039. */
  phone?: string;
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

async function startLocalSession(phone: string, fullName: string) {
  const cookieStore = await cookies();
  const uid = `local-${phone.replace(/\D/g, "")}`;
  cookieStore.set(localUserCookieName, JSON.stringify({ uid, phone, fullName }), cookieOptions(SESSION_LONG_MS / 1000));
  return uid;
}

async function readLocalUser(): Promise<AuthenticatedUser | null> {
  if (!localModeAllowed()) return null;
  const raw = (await cookies()).get(localUserCookieName)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { uid?: string; phone?: string; fullName?: string };
    if (!parsed.uid) return null;
    return { uid: parsed.uid, phone: parsed.phone, fullName: parsed.fullName || "FitSplit user" };
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

const WRONG_CREDENTIALS = "Incorrect mobile number or PIN.";

function loginErrorMessage(code: string) {
  if (code.startsWith("TOO_MANY_ATTEMPTS")) return "Too many failed attempts. Please wait a few minutes and try again.";
  if (code === "USER_DISABLED") return "This account has been disabled.";
  if (code === "MISSING_API_KEY") return "Sign-in is not configured (missing NEXT_PUBLIC_FIREBASE_API_KEY).";
  return WRONG_CREDENTIALS;
}

/** Errors that mean "that number/PIN pair is wrong" (as opposed to a network or config failure). */
function isWrongCredentials(code: string) {
  return code === "INVALID_LOGIN_CREDENTIALS" || code === "INVALID_PASSWORD" || code === "EMAIL_NOT_FOUND";
}

// -- Public actions ------------------------------------------------------------

export type AuthResult =
  | { status: "success"; redirectUrl: string }
  | { status: "error"; message: string };

/** Create a new account (name, mobile number, PIN) and sign the user in. */
export async function signUpWithPhone(formData: FormData): Promise<AuthResult> {
  try {
    // Server-side validation. The consent checkboxes are enforced here, not just in the browser.
    const parsed = parseSignup(formData);
    if (!parsed.ok) return { status: "error", message: parsed.message };
    const { fullName, phone, pin } = parsed.data;
    const email = phoneToEmail(phone);
    const password = pinToPassword(pin);
    const consent = buildConsentRecord({
      ageGroup: parsed.data.ageGroup,
      diagnostics: diagnosticsGranted(parsed.data.diagnosticsConsent),
      guardianEmail: parsed.data.guardianEmail
    });

    if (await abuseLimited("signup", "", 10, 60 * 60 * 1000)) {
      return { status: "error", message: "Too many sign-up attempts. Please try again later." };
    }

    if (localModeAllowed()) {
      await startLocalSession(phone, fullName);
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
        return { status: "error", message: "An account with this mobile number already exists. Try signing in." };
      }
      throw error;
    }

    const now = new Date().toISOString();
    await db.collection(collectionPaths.users).doc(uid).set({
      id: uid,
      fullName,
      phone,
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
    console.error("[auth] signUpWithPhone failed:", error);
    return { status: "error", message: "Unable to create your account. Please try again." };
  }
}

/** Sign in with mobile number + PIN. */
export async function loginWithPin(formData: FormData): Promise<AuthResult> {
  try {
    const phone = normalizePhone(String(formData.get("phone") ?? ""));
    const pin = String(formData.get("pin") ?? "");
    const rememberMe = formData.get("rememberMe") === "true";

    if (!phone) return { status: "error", message: "Enter a valid 10-digit mobile number." };
    if (!isValidPin(pin)) return { status: "error", message: "Enter your 4-digit PIN." };
    if (await abuseLimited("login", phone, 10, 10 * 60 * 1000)) {
      return { status: "error", message: "Too many sign-in attempts. Please wait a few minutes and try again." };
    }

    if (localModeAllowed()) {
      await startLocalSession(phone, "Athlete");
      return { status: "success", redirectUrl: HOME_PATH };
    }
    if (!hasFirebaseAdminConfig()) {
      return { status: "error", message: "Sign-in is unavailable: the server is not connected to Firebase." };
    }

    const { db } = getFirebaseAdminServices();
    const locked = await getLockRemaining(db, phone);
    if (locked > 0) return { status: "error", message: lockMessage(locked) };

    const result = await signInWithPasswordRest(phoneToEmail(phone), pinToPassword(pin));
    if (!result.ok) {
      if (isWrongCredentials(result.code)) {
        const state = await recordFailure(db, phone);
        if (state.lockedUntil) return { status: "error", message: lockMessage(state.lockedUntil - Date.now()) };
      }
      return { status: "error", message: loginErrorMessage(result.code) };
    }

    await clearFailures(db, phone);
    await createSessionFromIdToken(result.idToken, rememberMe);
    return { status: "success", redirectUrl: HOME_PATH };
  } catch (error) {
    console.error("[auth] loginWithPin failed:", error);
    return { status: "error", message: "Unable to sign in. Please try again." };
  }
}

/** Change the signed-in user's PIN (requires the current one; wrong guesses count toward the lock). */
export async function changePin(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  try {
    const user = await requireAuth();
    const currentPin = String(formData.get("currentPin") ?? "");
    const newPin = String(formData.get("newPin") ?? "");
    const confirmPin = String(formData.get("confirmPin") ?? "");

    if (!isValidPin(currentPin)) return { status: "error", message: "Enter your current 4-digit PIN." };
    if (!isValidPin(newPin)) return { status: "error", message: "Your new PIN must be exactly 4 digits." };
    if (newPin !== confirmPin) return { status: "error", message: "The new PINs do not match." };
    if (newPin === currentPin) return { status: "error", message: "Choose a different PIN." };

    if (!hasFirebaseAdminConfig()) {
      return { status: "success", message: "PIN updated (local mode)." };
    }
    if (!user.phone) return { status: "error", message: "This account has no mobile number." };

    const { auth, db } = getFirebaseAdminServices();
    const locked = await getLockRemaining(db, user.phone);
    if (locked > 0) return { status: "error", message: lockMessage(locked) };

    const verified = await signInWithPasswordRest(phoneToEmail(user.phone), pinToPassword(currentPin));
    if (!verified.ok) {
      if (isWrongCredentials(verified.code)) await recordFailure(db, user.phone);
      return { status: "error", message: "Your current PIN is incorrect." };
    }

    await auth.updateUser(user.uid, { password: pinToPassword(newPin) });
    await clearFailures(db, user.phone);
    return { status: "success", message: "PIN updated." };
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    console.error("[auth] changePin failed:", error);
    return { status: "error", message: "Unable to update your PIN. Please try again." };
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
    // checkRevoked: true so a disabled account or a PIN reset takes effect
    // immediately instead of when the cookie expires.
    const decoded = await auth.verifySessionCookie(session, true);
    return {
      uid: decoded.uid,
      phone: emailToPhone(decoded.email) ?? undefined,
      fullName: (decoded.name as string | undefined) || "FitSplit user",
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
