"use server";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import type { DocumentData } from "firebase-admin/firestore";
import type { ConsumerPlan, Role } from "@/types/domain";
import { collectionPaths } from "@/lib/firebase/collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "@/lib/firebase/admin";

const sessionCookieName = "fitsplit-session";
const legacyCookieNames = [
  "fitsplit-role",
  "fitsplit-username",
  "fitsplit-member-id",
  "fitsplit-gym-id",
  "fitsplit-staff-type"
] as const;
const SESSION_SHORT_MS = 1000 * 60 * 60 * 2;        // 2 h  — default (no remember me)
const SESSION_LONG_MS  = 1000 * 60 * 60 * 24 * 14; // 14 d — remember me (Firebase max)

type ProfileRecord = {
  id: string;
  uid: string;
  email?: string;
  phone: string;
  authEmail: string;
  fullName: string;
  role: Role;
  staffType?: string;
  defaultGymId: string;
  /** Workspace the user is currently in. Absent ⇒ `defaultGymId`. See Increment 3. */
  activeGymId?: string;
  /** Consumer billing plan. Always "free" in v1 — no billing exists. */
  plan?: ConsumerPlan;
  isActive: boolean;
  mustChangePassword?: boolean;
  termsAcceptedAt?: string;
  avatarUrl?: string;
};

export type AuthenticatedUser = {
  uid: string;
  email?: string;
  phone: string;
  fullName: string;
  role: Role;
  staffType?: string;
  gymId: string;
  memberId?: string;
  /** True if this staff account is on the default password and must change it
   * before using the rest of the app. Set on staff creation, cleared by
   * changeStaffPassword. Only applies to role === "owner" (gym staff). */
  mustChangePassword?: boolean;
  /** ISO timestamp of when the user accepted the Terms + Privacy Policy.
   * Undefined until first acceptance; drives the first-login consent gate. */
  termsAcceptedAt?: string;
  /** Public download URL of the user's avatar (member) or staff image, if uploaded. */
  avatarUrl?: string;
  /** Consumer billing plan, for `resolveEntitlements`. Always "free" in v1. */
  plan?: ConsumerPlan;
};

type DemoLogin = {
  uid: string;
  authEmail: string;
  phone: string;
  fullName: string;
  gymId: string;
  role: Role;
  staffType?: string;
};

const demoLogins: Record<string, DemoLogin> = {
  admin: {
    uid: "admin-fitsplit",
    authEmail: "admin@fitsplit.app",
    phone: "+91 9999999999",
    fullName: "FitSplit Admin",
    gymId: "shg",
    role: "admin"
  },
  "santosh-shg": {
    uid: "santosh-shg",
    authEmail: "santosh-shg@fitsplit.app",
    phone: "+91 8888888888",
    fullName: "Santosh SHG",
    gymId: "shg",
    role: "owner"
  },
  "shg-trainer-1": {
    uid: "shg-trainer-1",
    authEmail: "shg-trainer-1@fitsplit.app",
    phone: "+91 7777777777",
    fullName: "Ravi Kumar",
    gymId: "shg",
    role: "owner",
    staffType: "trainer"
  },
  "shg-trainer-2": {
    uid: "shg-trainer-2",
    authEmail: "shg-trainer-2@fitsplit.app",
    phone: "+91 6666666666",
    fullName: "Priya Nair",
    gymId: "shg",
    role: "owner",
    staffType: "trainer"
  },
  "dummy-gym-owner-1": {
    uid: "dummy-gym-owner-1",
    authEmail: "dummy-gym-owner-1@fitsplit.app",
    phone: "+91 5555555555",
    fullName: "Dummy Gym Owner",
    gymId: "dummy-gym",
    role: "owner"
  },
  "titan-owner-1": {
    uid: "titan-owner-1",
    authEmail: "titan-owner-1@fitsplit.app",
    phone: "+91 4444444444",
    fullName: "Titan Owner",
    gymId: "titan-gym",
    role: "owner"
  },
  "aarav@example.com": {
    uid: "member-aarav",
    authEmail: "aarav@example.com",
    phone: "+91 9876543210",
    fullName: "Aarav Sharma",
    gymId: "shg",
    role: "member"
  },
  aarav: {
    uid: "member-aarav",
    authEmail: "aarav@example.com",
    phone: "+91 9876543210",
    fullName: "Aarav Sharma",
    gymId: "shg",
    role: "member"
  },
  "9876543210": {
    uid: "member-aarav",
    authEmail: "aarav@example.com",
    phone: "+91 9876543210",
    fullName: "Aarav Sharma",
    gymId: "shg",
    role: "member"
  },
  "+919876543210": {
    uid: "member-aarav",
    authEmail: "aarav@example.com",
    phone: "+91 9876543210",
    fullName: "Aarav Sharma",
    gymId: "shg",
    role: "member"
  },
  "+91 9876543210": {
    uid: "member-aarav",
    authEmail: "aarav@example.com",
    phone: "+91 9876543210",
    fullName: "Aarav Sharma",
    gymId: "shg",
    role: "member"
  },
  meera: {
    uid: "member-meera",
    authEmail: "meera@example.com",
    phone: "+91 9876542109",
    fullName: "Meera Iyer",
    gymId: "shg",
    role: "member"
  },
  "meera@example.com": {
    uid: "member-meera",
    authEmail: "meera@example.com",
    phone: "+91 9876542109",
    fullName: "Meera Iyer",
    gymId: "shg",
    role: "member"
  },
  kabir: {
    uid: "member-kabir",
    authEmail: "kabir@example.com",
    phone: "+91 9876541098",
    fullName: "Kabir Khan",
    gymId: "shg",
    role: "member"
  },
  "kabir@example.com": {
    uid: "member-kabir",
    authEmail: "kabir@example.com",
    phone: "+91 9876541098",
    fullName: "Kabir Khan",
    gymId: "shg",
    role: "member"
  },
  nisha: {
    uid: "member-nisha",
    authEmail: "nisha@example.com",
    phone: "+91 9876540987",
    fullName: "Nisha Rao",
    gymId: "shg",
    role: "member"
  },
  "nisha@example.com": {
    uid: "member-nisha",
    authEmail: "nisha@example.com",
    phone: "+91 9876540987",
    fullName: "Nisha Rao",
    gymId: "shg",
    role: "member"
  },
  mehul: {
    uid: "member-mehul",
    authEmail: "mehul@members.fitsplit.app",
    phone: "+919688227039",
    fullName: "Mehul Chirania",
    gymId: "shg",
    role: "member"
  },
  "mehul@example.com": {
    uid: "member-mehul",
    authEmail: "mehul@example.com",
    phone: "+91 9688227039",
    fullName: "Mehul Chirania",
    gymId: "shg",
    role: "member"
  },
  "9688227039": {
    uid: "member-mehul",
    authEmail: "mehul@example.com",
    phone: "+91 9688227039",
    fullName: "Mehul Chirania",
    gymId: "shg",
    role: "member"
  },
  "+919688227039": {
    uid: "member-mehul",
    authEmail: "mehul@example.com",
    phone: "+91 9688227039",
    fullName: "Mehul Chirania",
    gymId: "shg",
    role: "member"
  },
  "+91 9688227039": {
    uid: "member-mehul",
    authEmail: "mehul@example.com",
    phone: "+91 9688227039",
    fullName: "Mehul Chirania",
    gymId: "shg",
    role: "member"
  },
};

function normalizeIdentifier(identifier: string) {
  const trimmed = identifier.trim();
  const compactPhone = trimmed.replace(/[\s-]/g, "");

  if (/^\d{10}$/.test(compactPhone)) {
    return `+91 ${compactPhone}`;
  }

  if (/^\+91\d{10}$/.test(compactPhone)) {
    return `+91 ${compactPhone.slice(3)}`;
  }

  return trimmed;
}

function normalizedLookupKeys(identifier: string) {
  const normalized = normalizeIdentifier(identifier);
  const compact = normalized.replace(/[\s-]/g, "");

  return Array.from(
    new Set([
      identifier.trim(),
      identifier.trim().toLowerCase(),
      normalized,
      normalized.toLowerCase(),
      compact,
      compact.toLowerCase()
    ].filter(Boolean))
  );
}

function redirectForRole(role: Role) {
  if (role === "admin") {
    return "/admin";
  }

  if (role === "owner") {
    return "/owner";
  }

  if (role === "trainer") {
    return "/trainer";
  }

  return "/member";
}

function cookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production"
  };
}

function toProfile(id: string, data: DocumentData | undefined): ProfileRecord | null {
  if (!data?.role) {
    return null;
  }

  const role = String(data.role) as Role;

  if (!["admin", "owner", "trainer", "member"].includes(role)) {
    return null;
  }

  return {
    id,
    uid: String(data.uid ?? data.authUid ?? id),
    email: data.email ? String(data.email) : undefined,
    phone: String(data.phone ?? ""),
    authEmail: String(data.authEmail ?? data.email ?? ""),
    fullName: String(data.fullName ?? "FitSplit user"),
    role,
    staffType: data.staffType ? String(data.staffType) : undefined,
    defaultGymId: String(data.defaultGymId ?? ""),
    activeGymId: data.activeGymId ? String(data.activeGymId) : undefined,
    plan: data.plan === "pro" ? "pro" : data.plan === "free" ? "free" : undefined,
    isActive: data.isActive !== false,
    mustChangePassword: data.mustChangePassword === true,
    termsAcceptedAt: data.termsAcceptedAt ? String(data.termsAcceptedAt) : undefined,
    // Members store the photo as `avatarUrl`; staff as `imageUrl`. Surface either.
    avatarUrl: data.avatarUrl ? String(data.avatarUrl) : data.imageUrl ? String(data.imageUrl) : undefined
  };
}

async function getProfileById(uid: string) {
  const { db } = getFirebaseAdminServices();
  
  const [doc, legacyDoc] = await Promise.all([
    db.collection(collectionPaths.authProfiles).doc(uid).get(),
    db.collection(collectionPaths.profiles).doc(uid).get()
  ]);

  let partialData: DocumentData | undefined = doc.exists ? doc.data() : undefined;
  if (!partialData?.role && legacyDoc.exists) {
    partialData = { ...legacyDoc.data(), ...partialData };
  }

  // If we still don't have a role, look in the gym collections
  if (!partialData?.role) {
    try {
      const [memberSnapshot, staffSnapshot] = await Promise.all([
        db.collectionGroup("members").where("id", "==", uid).limit(1).get(),
        db.collectionGroup("staff").where("id", "==", uid).limit(1).get()
      ]);
      const scopedDoc = memberSnapshot.docs[0] ?? staffSnapshot.docs[0];
      if (scopedDoc) {
        partialData = { ...scopedDoc.data(), ...partialData };
      }
    } catch {
      // ignore
    }
  }

  return partialData ? toProfile(uid, partialData) : null;
}

async function getProfileByEmail(email: string) {
  const { db } = getFirebaseAdminServices();
  const normalizedEmail = email.trim().toLowerCase();

  const [snap1, snap2, snap3, snap4] = await Promise.all([
    db.collection(collectionPaths.authProfiles).where("authEmail", "==", normalizedEmail).limit(1).get(),
    db.collection(collectionPaths.authProfiles).where("email", "==", normalizedEmail).limit(1).get(),
    db.collection(collectionPaths.profiles).where("authEmail", "==", normalizedEmail).limit(1).get(),
    db.collection(collectionPaths.profiles).where("email", "==", normalizedEmail).limit(1).get()
  ]);

  if (!snap1.empty) return toProfile(snap1.docs[0].id, snap1.docs[0].data());
  if (!snap2.empty) return toProfile(snap2.docs[0].id, snap2.docs[0].data());
  if (!snap3.empty) return toProfile(snap3.docs[0].id, snap3.docs[0].data());
  if (!snap4.empty) return toProfile(snap4.docs[0].id, snap4.docs[0].data());

  return null;
}

async function resolveProfileForIdentifier(identifier: string) {
  if (!hasFirebaseAdminConfig()) {
    return null;
  }

  const { db } = getFirebaseAdminServices();
  const keys = normalizedLookupKeys(identifier);

  // 1. Check usernames lookup collection
  for (const key of keys) {
    try {
      const usernameDoc = await db.collection(collectionPaths.usernames).doc(key.toLowerCase()).get();
      if (usernameDoc.exists) {
        const uid = usernameDoc.data()?.uid;
        if (uid) {
          const profile = await getProfileById(uid);
          if (profile) return profile;
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. Check phones lookup collection
  for (const key of keys) {
    const cleanDigits = key.replace(/\D/g, "");
    if (cleanDigits.length >= 10) {
      try {
        const phoneDoc = await db.collection(collectionPaths.phones).doc(cleanDigits).get();
        if (phoneDoc.exists) {
          const uid = phoneDoc.data()?.uid;
          if (uid) {
            const profile = await getProfileById(uid);
            if (profile) return profile;
          }
        }
      } catch {
        // ignore
      }
    }
  }

  // 3. Fallback to demoLogins static map if available
  const demoLogin = keys.map((key) => demoLogins[key]).find(Boolean);
  if (demoLogin) {
    const profile = await getProfileById(demoLogin.uid);
    if (profile) return profile;
  }

  // 4. Query authProfiles by username, email, authEmail, or phone
  if (keys.length > 0) {
    const uniqueKeys = Array.from(new Set(keys)).slice(0, 30);
    const promises = [
      db.collection(collectionPaths.authProfiles).where("username", "in", uniqueKeys).limit(1).get(),
      db.collection(collectionPaths.authProfiles).where("email", "in", uniqueKeys).limit(1).get(),
      db.collection(collectionPaths.authProfiles).where("authEmail", "in", uniqueKeys).limit(1).get(),
      db.collection(collectionPaths.authProfiles).where("phone", "in", uniqueKeys).limit(1).get()
    ];
    
    const results = await Promise.allSettled(promises);
    for (const res of results) {
      if (res.status === "fulfilled" && !res.value.empty) {
        const doc = res.value.docs[0];
        return toProfile(doc.id, doc.data());
      }
    }
  }

  // 5. Direct ID lookup
  for (const key of keys) {
    const profile = await getProfileById(key);
    if (profile) return profile;
  }

  return null;
}

async function setSessionCompatibilityCookies(user: AuthenticatedUser, rememberMe = false) {
  const cookieStore = await cookies();
  const expiresIn = rememberMe ? SESSION_LONG_MS : SESSION_SHORT_MS;
  const options = cookieOptions(Math.floor(expiresIn / 1000));

  cookieStore.set("fitsplit-role", user.role, options);
  cookieStore.set("fitsplit-username", user.phone || user.email || user.uid, options);
  cookieStore.set("fitsplit-gym-id", user.gymId, options);

  if (user.staffType) {
    cookieStore.set("fitsplit-staff-type", user.staffType, options);
  } else {
    cookieStore.delete("fitsplit-staff-type");
  }

  if (user.memberId) {
    cookieStore.set("fitsplit-member-id", user.memberId, options);
  } else {
    cookieStore.delete("fitsplit-member-id");
  }
}

async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
  // Clear the terms-acceptance cookie so a different user on the same browser
  // is re-prompted (real users are still covered by their profile flag).
  cookieStore.delete("fitsplit-terms-ack");

  for (const cookieName of legacyCookieNames) {
    cookieStore.delete(cookieName);
  }
}

function authUserFromProfile(profile: ProfileRecord): AuthenticatedUser {
  return {
    uid: profile.uid,
    email: profile.email,
    phone: profile.phone,
    fullName: profile.fullName,
    role: profile.role,
    staffType: profile.staffType,
    gymId: profile.defaultGymId,
    memberId: profile.role === "member" ? profile.id : undefined,
    mustChangePassword: profile.mustChangePassword === true,
    termsAcceptedAt: profile.termsAcceptedAt,
    avatarUrl: profile.avatarUrl,
    plan: profile.plan
  };
}

function authUserFromDemo(demoLogin: DemoLogin): AuthenticatedUser {
  return {
    uid: demoLogin.uid,
    email: demoLogin.authEmail,
    phone: demoLogin.phone,
    fullName: demoLogin.fullName,
    role: demoLogin.role,
    staffType: demoLogin.staffType,
    gymId: demoLogin.gymId,
    memberId: demoLogin.role === "member" ? demoLogin.uid : undefined,
    termsAcceptedAt: "2026-01-01T00:00:00.000Z"
  };
}

function findDemoLogin(identifier: string) {
  const keys = normalizedLookupKeys(identifier);
  return keys.map((key) => demoLogins[key]).find(Boolean);
}

function validateExpectedRole(role: Role, expectedRole?: "member" | "staff") {
  if (!expectedRole) {
    return null;
  }

  const isStaff = role === "admin" || role === "owner";

  if (expectedRole === "member" && isStaff) {
    return "This is a staff account. Please use the Staff tab.";
  }

  if (expectedRole === "staff" && role === "member") {
    return "This is a member account. Please use the Member tab.";
  }

  return null;
}

// ─── Login lockout ─────────────────────────────────────────────────────────
// After MAX_FAILED_ATTEMPTS consecutive failures, the account is locked for
// LOCKOUT_MINUTES. This sits in front of Firebase Auth — Firebase has its own
// per-IP throttling but it kicks in too late for brute-force-by-PIN, where 10k
// permutations are easily reachable in under a minute.
//
// D2: Two complementary lockout paths:
//   1. Profile-embedded: keyed on resolved email, stored on the authProfile doc.
//   2. Identifier-based: keyed on the raw identifier (phone/username/email),
//      stored in loginAttempts/{normalizedIdentifier}. This fires BEFORE email
//      resolution so an attacker who knows only a phone number is also gated.
//      The beforeSignIn Cloud Function (D1) reads the same collection.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;


async function checkLoginLockout(email: string): Promise<{ locked: boolean; minutesRemaining?: number }> {
  if (!hasFirebaseAdminConfig()) return { locked: false };
  const { db } = getFirebaseAdminServices();
  const normalized = email.trim().toLowerCase();
  const doc = await db.collection("loginAttempts").doc(normalized).get();
  const data = doc.data() ?? {};
  
  const lockedUntil = data.lockedUntil ? new Date(String(data.lockedUntil)) : null;
  if (lockedUntil && lockedUntil.getTime() > Date.now()) {
    const minutesRemaining = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000));
    return { locked: true, minutesRemaining };
  }
  return { locked: false };
}

async function incrementLoginFailure(email: string) {
  if (!hasFirebaseAdminConfig()) return;
  const { db } = getFirebaseAdminServices();
  const normalized = email.trim().toLowerCase();
  const ref = db.collection("loginAttempts").doc(normalized);
  const data = (await ref.get()).data() ?? {};
  
  const current = Number(data.failedLoginAttempts ?? 0);
  const next = current + 1;
  const update: Record<string, unknown> = {
    failedLoginAttempts: next,
    lastFailedLoginAt: new Date().toISOString()
  };
  
  if (next >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60_000);
    update.lockedUntil = lockedUntil.toISOString();
  }
  await ref.set(update, { merge: true });
}

async function clearLoginAttempts(email: string) {
  if (!hasFirebaseAdminConfig()) return;
  const { db } = getFirebaseAdminServices();
  const normalized = email.trim().toLowerCase();
  await db.collection("loginAttempts").doc(normalized).set(
    { failedLoginAttempts: 0, lockedUntil: null, lastFailedLoginAt: null },
    { merge: true }
  );
}

// D2: Identifier-based lockout — stored in loginAttempts/{normalizedId}.
// Fires BEFORE email resolution so phone/username attacks are also gated.
// The D1 beforeUserSignIn blocking trigger reads the same collection.
async function checkIdentifierLockout(
  identifier: string
): Promise<{ locked: boolean; minutesRemaining?: number }> {
  if (!hasFirebaseAdminConfig()) return { locked: false };
  const { db } = getFirebaseAdminServices();
  const normalized = identifier.trim().toLowerCase();
  const doc = await db.collection("loginAttempts").doc(normalized).get();
  const data = doc.data();
  if (!data?.lockedUntil) return { locked: false };
  const lockExpiry = new Date(String(data.lockedUntil)).getTime();
  if (Date.now() < lockExpiry) {
    return { locked: true, minutesRemaining: Math.max(1, Math.ceil((lockExpiry - Date.now()) / 60_000)) };
  }
  return { locked: false };
}

async function incrementIdentifierFailure(identifier: string) {
  if (!hasFirebaseAdminConfig()) return;
  const { db } = getFirebaseAdminServices();
  const normalized = identifier.trim().toLowerCase();
  const ref = db.collection("loginAttempts").doc(normalized);
  const data = (await ref.get()).data() ?? {};
  const next = Number(data.failedLoginAttempts ?? 0) + 1;
  const update: Record<string, unknown> = {
    failedLoginAttempts: next,
    lastFailedLoginAt: new Date().toISOString()
  };
  if (next >= MAX_FAILED_ATTEMPTS) {
    update.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString();
  }
  await ref.set(update, { merge: true });
}

async function clearIdentifierAttempts(identifier: string) {
  if (!hasFirebaseAdminConfig()) return;
  const { db } = getFirebaseAdminServices();
  const normalized = identifier.trim().toLowerCase();
  await db.collection("loginAttempts").doc(normalized).set(
    { failedLoginAttempts: 0, lockedUntil: null, lastFailedLoginAt: null },
    { merge: true }
  );
}

async function resolveLoginIdentifier(identifier: string, expectedRole?: "member" | "staff") {
  const cleanIdentifier = identifier.trim();

  if (!cleanIdentifier) {
    return { status: "error" as const, message: "Enter your username or mobile number." };
  }

  const demoLogin = findDemoLogin(cleanIdentifier);

  if (demoLogin) {
    const roleError = validateExpectedRole(demoLogin.role, expectedRole);
    if (roleError) {
      return { status: "error" as const, message: roleError };
    }

    if (hasFirebaseAdminConfig()) {
      return {
        status: "success" as const,
        email: demoLogin.authEmail,
        phone: demoLogin.phone,
        role: demoLogin.role
      };
    }

    return {
      status: "success" as const,
      email: demoLogin.authEmail,
      phone: demoLogin.phone,
      localOnly: true,
      role: demoLogin.role
    };
  }

  if (!hasFirebaseAdminConfig()) {
    return { status: "error" as const, message: "No demo FitSplit account found." };
  }

  const profile = await resolveProfileForIdentifier(cleanIdentifier);

  if (!profile || !profile.isActive) {
    return { status: "error" as const, message: "No active FitSplit account found." };
  }

  const roleError = validateExpectedRole(profile.role, expectedRole);
  if (roleError) {
    return { status: "error" as const, message: roleError };
  }

  return {
    status: "success" as const,
    email: profile.authEmail ?? profile.email ?? "",
    phone: profile.phone,
    role: profile.role,
    profile
  };
}

async function createLocalDemoSession(
  identifier: string,
  password: string,
  expectedRole?: "member" | "staff",
  rememberMe = false
) {
  const demoLogin = findDemoLogin(identifier);

  if (!demoLogin) {
    return { status: "error" as const, message: "No demo FitSplit account found." };
  }

  const roleError = validateExpectedRole(demoLogin.role, expectedRole);
  if (roleError) {
    return { status: "error" as const, message: roleError };
  }

  const expectedPassword = demoLogin.role === "member" ? "1234" : "password";
  if (password !== expectedPassword) {
    return {
      status: "error" as const,
      message: demoLogin.role === "member" ? "Invalid PIN." : "Invalid password."
    };
  }

  // Clear any stale Firebase session cookie so getCurrentUser uses the
  // compatibility cookies we're about to set, not a previous user's session.
  await clearAuthCookies();

  const user = authUserFromDemo(demoLogin);
  await setSessionCompatibilityCookies(user, rememberMe);

  return {
    status: "success" as const,
    redirectUrl: redirectForRole(user.role),
    user
  };
}

export async function loginWithCredentials(formData: FormData) {
  try {
    return await _loginWithCredentials(formData);
  } catch (error) {
    console.error("[auth] loginWithCredentials unhandled error:", error);
    return { status: "error" as const, message: "Unable to sign in. Please try again." };
  }
}

async function _loginWithCredentials(formData: FormData) {
  const identifier = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const mode = String(formData.get("mode") ?? "member") as "member" | "staff";
  const rememberMe = formData.get("rememberMe") === "true";

  if (!identifier || !password) {
    return { status: "error" as const, message: "Enter your login details." };
  }

  const demoLogin = findDemoLogin(identifier);

  if (demoLogin) {
    // Validate role and password locally first (fast, no network).
    const roleError = validateExpectedRole(demoLogin.role, mode);
    if (roleError) return { status: "error" as const, message: roleError };

    const expectedPassword = demoLogin.role === "member" ? "1234" : "password";
    if (password !== expectedPassword) {
      return {
        status: "error" as const,
        message: demoLogin.role === "member" ? "Invalid PIN." : "Invalid password."
      };
    }

    // When Firebase Admin is configured, do a real Firebase Auth sign-in so a
    // proper fitsplit-session cookie is created — this clears any stale session
    // from a previous login. Fall back to compatibility cookies if Auth fails.
    if (hasFirebaseAdminConfig()) {
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      if (apiKey) {
        const fbPassword = demoLogin.role === "member" ? `pin-${password}` : password;
        const resp = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: demoLogin.authEmail, password: fbPassword, returnSecureToken: true })
          }
        );
        if (resp.ok) {
          const payload = (await resp.json()) as { idToken?: string };
          if (payload.idToken) {
            const sessionResult = await createSession(payload.idToken, rememberMe);
            // Only return the Firebase session if the Firestore profile was found.
            // If the demo Firebase Auth user exists but has no matching authProfile doc
            // (common when demo UIDs like "member-aarav" aren't real Firestore UIDs),
            // fall through to the local compatibility-cookie session below.
            if (sessionResult.status === "success") return sessionResult;
          }
        }
      }
    }

    // No Firebase Admin, Firebase Auth failed, or profile lookup failed for demo user
    // — use compatibility cookies so demo accounts always work.
    return createLocalDemoSession(identifier, password, mode, rememberMe);
  }

  // D2: Check identifier-based lockout BEFORE resolving to an email, so
  // brute-forcing by phone number or username is also blocked.
  const identifierLock = await checkIdentifierLockout(identifier);
  if (identifierLock.locked) {
    return {
      status: "error" as const,
      message: `Too many failed attempts. Try again in about ${identifierLock.minutesRemaining} minute${identifierLock.minutesRemaining === 1 ? "" : "s"}.`
    };
  }

  const resolved = await resolveLoginIdentifier(identifier, mode);

  if (resolved.status !== "success") {
    return resolved;
  }

  if (resolved.localOnly) {
    return createLocalDemoSession(identifier, password, mode);
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    return { status: "error" as const, message: "Firebase client API key is not configured." };
  }

  // Lockout check — bail out early if this account is currently locked from too
  // many failed attempts. Don't reveal whether the account exists; the error
  // message is generic on purpose.
  const lockState = await checkLoginLockout(resolved.email);
  if (lockState.locked) {
    return {
      status: "error" as const,
      message: `Too many failed attempts. Try again in about ${lockState.minutesRemaining} minute${lockState.minutesRemaining === 1 ? "" : "s"}.`
    };
  }

  const firebasePassword = mode === "member" ? `pin-${password}` : password;
  // D3: 10-second timeout so the server action can't hang if Firebase is slow.
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      body: JSON.stringify({
        email: resolved.email,
        password: firebasePassword,
        returnSecureToken: true
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(10_000)
    }
  );

  if (!response.ok) {
    // Increment both the profile-embedded and identifier-based failure counters.
    // Best-effort — if the write fails (mock mode, etc.) we still return the
    // standard auth error.
    try { await incrementLoginFailure(resolved.email); } catch {}
    try { await incrementIdentifierFailure(identifier); } catch {}
    return {
      status: "error" as const,
      message: mode === "member" ? "Invalid mobile/email or PIN." : "Invalid username or password."
    };
  }

  const payload = (await response.json()) as { idToken?: string };

  if (!payload.idToken) {
    return { status: "error" as const, message: "Unable to sign in. Please try again." };
  }

  // Successful auth — wipe both failure counters in parallel
  await Promise.all([
    clearLoginAttempts(resolved.email).catch(() => {}),
    clearIdentifierAttempts(identifier).catch(() => {})
  ]);

  return createSession(payload.idToken, rememberMe, resolved.profile);
}

async function createSession(idToken: string, rememberMe = false, preFetchedProfile?: ProfileRecord | null) {
  if (!hasFirebaseAdminConfig()) {
    return { status: "error" as const, message: "Firebase Admin is not configured on the server yet." };
  }

  try {
    const { auth } = getFirebaseAdminServices();
    const decodedToken = await auth.verifyIdToken(idToken);
    const profile =
      preFetchedProfile ??
      ((await getProfileById(decodedToken.uid)) ??
      (decodedToken.email ? await getProfileByEmail(decodedToken.email) : null));

    if (!profile || !profile.isActive) {
      await clearAuthCookies();
      return { status: "error" as const, message: "Your FitSplit profile is inactive or missing." };
    }

    const expiresIn = rememberMe ? SESSION_LONG_MS : SESSION_SHORT_MS;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieName, sessionCookie, cookieOptions(Math.floor(expiresIn / 1000)));

    const user = authUserFromProfile(profile);
    await setSessionCompatibilityCookies(user, rememberMe);

    return {
      status: "success" as const,
      redirectUrl: redirectForRole(user.role),
      user
    };
  } catch (error) {
    console.error("Unable to create Firebase session", error);
    await clearAuthCookies();
    return { status: "error" as const, message: "Unable to sign in. Check your credentials." };
  }
}

// Per-request memoization — if multiple components in the same render call
// getCurrentUser (e.g. a layout + a page), the cookie verification + Firestore
// lookup only runs once. React's cache() is scoped to a single request so this
// is safe to share across server components.
const getCurrentUserCached = cache(_getCurrentUserImpl);
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  return getCurrentUserCached();
}

async function _getCurrentUserImpl(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(sessionCookieName)?.value;

  if (!hasFirebaseAdminConfig() || !session) {
    const role = cookieStore.get("fitsplit-role")?.value as Role | undefined;
    const email = cookieStore.get("fitsplit-username")?.value;
    const gymId = cookieStore.get("fitsplit-gym-id")?.value;
    const memberId = cookieStore.get("fitsplit-member-id")?.value;
    const staffType = cookieStore.get("fitsplit-staff-type")?.value;

    if (!role || !email || !gymId || !["admin", "owner", "trainer", "member"].includes(role)) {
      return null;
    }

    const demoLogin = Object.values(demoLogins).find(
      (login) => login.authEmail === email || login.uid === memberId
    );

    return {
      uid: demoLogin?.uid ?? memberId ?? email,
      email,
      phone: demoLogin?.phone ?? "",
      fullName: demoLogin?.fullName ?? "FitSplit user",
      role,
      staffType: staffType ?? demoLogin?.staffType,
      gymId,
      memberId: role === "member" ? memberId : undefined,
      termsAcceptedAt: "2026-01-01T00:00:00.000Z"
    };
  }

  try {
    const { auth, db } = getFirebaseAdminServices();
    // checkRevoked: true — required so a suspended/deactivated account (which
    // calls auth.revokeRefreshTokens, see toggleMemberAccess / setGymStatus)
    // is rejected immediately instead of the fast path below trusting the
    // isActive claim baked into this cookie at login time for up to 14 days.
    const decodedSession = await auth.verifySessionCookie(session, true);

    // SSR Profile Optimization: Check if custom claims have the profile data
    if (decodedSession.role && decodedSession.isActive !== undefined) {
      if (decodedSession.isActive === false) {
        const hdrs = await headers();
        const pathname = hdrs.get("x-pathname") ?? "";
        if (!pathname.startsWith("/suspended")) {
          redirect("/suspended");
        }
        return null;
      }

      // mustChangePassword is the one claim that can legitimately be cleared
      // MID-SESSION (changeStaffPassword) without revoking the cookie — revoking
      // would log the user out right after they changed their password, which
      // the /profile UI doesn't expect (it just stops showing the forceChange
      // banner). A session cookie's claims are baked in at login and don't
      // refresh on their own, so if the claim still says true, do a single
      // cheap re-check against Firestore before enforcing the redirect. This
      // only fires in the rare "just changed it this session" window — once a
      // fresh login happens, the persisted claim (patched by changeStaffPassword)
      // is already correct and this branch never runs.
      let mustChangePassword = decodedSession.mustChangePassword === true;
      if (mustChangePassword) {
        try {
          const profileDoc = await db.collection(collectionPaths.authProfiles).doc(decodedSession.uid).get();
          if (profileDoc.exists) {
            mustChangePassword = profileDoc.data()?.mustChangePassword === true;
          }
        } catch {
          // Best-effort self-heal — fall back to the (possibly stale) claim on error.
        }
      }

      return {
        uid: decodedSession.uid,
        email: decodedSession.email,
        phone: decodedSession.phone || "",
        fullName: decodedSession.fullName || "FitSplit user",
        role: decodedSession.role,
        staffType: decodedSession.staffType,
        gymId: decodedSession.gymId,
        memberId: decodedSession.memberId,
        mustChangePassword,
        termsAcceptedAt: decodedSession.termsAcceptedAt,
        avatarUrl: decodedSession.avatarUrl
      };
    }

    // Fallback for legacy sessions without claims
    const profile =
      (await getProfileById(decodedSession.uid)) ??
      (decodedSession.email ? await getProfileByEmail(decodedSession.email) : null);

    if (!profile || !profile.isActive) {
      const hdrs = await headers();
      const pathname = hdrs.get("x-pathname") ?? "";
      if (!pathname.startsWith("/suspended")) {
        redirect("/suspended");
      }
      return null;
    }

    return authUserFromProfile(profile);
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return user;
}

export async function requireRole(allowedRoles: Role[]) {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role)) {
    redirect(redirectForRole(user.role));
  }

  // Force-redirect new staff to /profile until they rotate the default password.
  // The middleware sets `x-pathname` on every protected request so we can detect
  // whether we're already on /profile and avoid a redirect loop.
  if (user.mustChangePassword && user.role === "owner") {
    const headerList = await headers();
    const pathname = headerList.get("x-pathname") ?? "";
    const isOnProfile = pathname.startsWith("/profile");
    if (!isOnProfile) {
      redirect("/profile?forceChange=1");
    }
  }

  return user;
}

/**
 * Requires admin or gym owner (staffType: "owner"). Trainers and staff are
 * allowed to view owner routes but must not call destructive actions.
 */
export async function requireOwner() {
  const user = await requireRole(["admin", "owner"]);

  if (user.role === "owner" && user.staffType && user.staffType !== "owner") {
    throw new Error("Trainers and staff cannot perform this action. Contact the gym owner.");
  }

  return user;
}

/**
 * Page-level variant of requireOwner: trainers/staff are silently redirected
 * to the owner dashboard instead of getting a thrown error page. Use on pages
 * that expose money or gym-configuration data (billing, reports, packages,
 * settings) — actions on those pages still call requireOwner() server-side.
 */
export async function requireOwnerPage() {
  const user = await requireRole(["admin", "owner"]);

  if (user.role === "owner" && user.staffType && user.staffType !== "owner") {
    redirect("/owner");
  }

  return user;
}

export async function logoutUser() {
  await clearAuthCookies();
  redirect("/");
}

export async function requestPasswordReset(formData: FormData) {
  const identifier = String(formData.get("username") ?? "").trim();
  const mode = String(formData.get("mode") ?? "member") as "member" | "staff";

  if (!identifier) {
    return { status: "error" as const, message: "Enter your login identifier first." };
  }

  if (!hasFirebaseAdminConfig()) {
    return {
      status: "success" as const,
      message:
        mode === "member"
          ? "Password reset request noted. Please contact your gym owner for a new PIN."
          : "Password reset request noted. Please contact the gym owner or admin."
    };
  }

  try {
    const profile = await resolveProfileForIdentifier(identifier);
    const { db } = getFirebaseAdminServices();
    const now = new Date().toISOString();
    const displayName = profile?.fullName ?? identifier;
    const requestType = mode === "member" ? "Member PIN reset request" : "Staff password reset request";
    const message =
      mode === "member"
        ? `${displayName} requested a member PIN reset.`
        : `${displayName} requested a staff password reset.`;

    const notifications = [
      {
        id: randomUUID(),
        recipientRole: "owner",
        recipientId: profile?.defaultGymId ? `${profile.defaultGymId}-owners` : "gym-owners",
        type: "password_reset_request",
        title: requestType,
        body: message,
        createdAt: now
      }
    ];

    if (mode === "staff") {
      notifications.push({
        id: randomUUID(),
        recipientRole: "admin",
        recipientId: "admin-fitsplit",
        type: "password_reset_request",
        title: requestType,
        body: message,
        createdAt: now
      });
    }

    await Promise.all(
      notifications.map((notification) =>
        db.collection(collectionPaths.notifications).doc(notification.id).set(notification)
      )
    );

    return {
      status: "success" as const,
      message:
        mode === "member"
          ? "Password reset request sent to the gym owner. Please contact them for your new PIN."
          : "Password reset request sent to the gym owner and admin."
    };
  } catch (error) {
    console.error("Unable to create password reset request", error);
    return { status: "error" as const, message: "Unable to send reset request. Please try again." };
  }
}
