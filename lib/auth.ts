"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { DocumentData } from "firebase-admin/firestore";
import type { Role } from "@/types/domain";
import { collectionPaths } from "@/lib/firebase/collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "@/lib/firebase/admin";

const sessionCookieName = "fitsplit-session";
const legacyCookieNames = [
  "fitsplit-role",
  "fitsplit-username",
  "fitsplit-member-id",
  "fitsplit-gym-id"
] as const;
const sessionExpiresIn = 1000 * 60 * 60 * 24 * 5;

type ProfileRecord = {
  id: string;
  uid: string;
  email: string;
  authEmail: string;
  fullName: string;
  role: Role;
  defaultGymId: string;
  isActive: boolean;
};

export type AuthenticatedUser = {
  uid: string;
  email: string;
  fullName: string;
  role: Role;
  gymId: string;
  memberId?: string;
};

type DemoLogin = {
  uid: string;
  authEmail: string;
  fullName: string;
  gymId: string;
  role: Role;
};

const demoLogins: Record<string, DemoLogin> = {
  admin: {
    uid: "admin-fitsplit",
    authEmail: "admin@fitsplit.app",
    fullName: "FitSplit Admin",
    gymId: "titan-v2-fitness",
    role: "admin"
  },
  "titan-owner-1": {
    uid: "titan-owner-1",
    authEmail: "owner@titanv2.local",
    fullName: "titan-owner-1",
    gymId: "titan-v2-fitness",
    role: "owner"
  },
  "dummy-gym-owner-1": {
    uid: "dummy-gym-owner-1",
    authEmail: "dummy-gym-owner-1@fitsplit.app",
    fullName: "Dummy Gym Owner",
    gymId: "dummy-gym",
    role: "owner"
  },
  "aarav@example.com": {
    uid: "member-aarav",
    authEmail: "aarav@example.com",
    fullName: "Aarav Sharma",
    gymId: "titan-v2-fitness",
    role: "member"
  },
  aarav: {
    uid: "member-aarav",
    authEmail: "aarav@example.com",
    fullName: "Aarav Sharma",
    gymId: "titan-v2-fitness",
    role: "member"
  },
  "9876543210": {
    uid: "member-aarav",
    authEmail: "aarav@example.com",
    fullName: "Aarav Sharma",
    gymId: "titan-v2-fitness",
    role: "member"
  },
  "+919876543210": {
    uid: "member-aarav",
    authEmail: "aarav@example.com",
    fullName: "Aarav Sharma",
    gymId: "titan-v2-fitness",
    role: "member"
  },
  "+91 9876543210": {
    uid: "member-aarav",
    authEmail: "aarav@example.com",
    fullName: "Aarav Sharma",
    gymId: "titan-v2-fitness",
    role: "member"
  },
  mehulchirania: {
    uid: "member-mehul",
    authEmail: "mehul@example.com",
    fullName: "Mehul Chirania",
    gymId: "titan-v2-fitness",
    role: "member"
  },
  "mehul@example.com": {
    uid: "member-mehul",
    authEmail: "mehul@example.com",
    fullName: "Mehul Chirania",
    gymId: "titan-v2-fitness",
    role: "member"
  },
  "+919688227039": {
    uid: "member-mehul",
    authEmail: "mehul@example.com",
    fullName: "Mehul Chirania",
    gymId: "titan-v2-fitness",
    role: "member"
  },
  "+91 9688227039": {
    uid: "member-mehul",
    authEmail: "mehul@example.com",
    fullName: "Mehul Chirania",
    gymId: "titan-v2-fitness",
    role: "member"
  }
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

  if (!["admin", "owner", "member"].includes(role)) {
    return null;
  }

  return {
    id,
    uid: String(data.uid ?? data.authUid ?? id),
    email: String(data.email ?? ""),
    authEmail: String(data.authEmail ?? data.email ?? ""),
    fullName: String(data.fullName ?? "FitSplit user"),
    role,
    defaultGymId: String(data.defaultGymId ?? ""),
    isActive: data.isActive !== false
  };
}

async function getProfileById(uid: string) {
  const { db } = getFirebaseAdminServices();
  const doc = await db.collection(collectionPaths.profiles).doc(uid).get();
  return doc.exists ? toProfile(doc.id, doc.data()) : null;
}

async function getProfileByEmail(email: string) {
  const { db } = getFirebaseAdminServices();
  const normalizedEmail = email.trim().toLowerCase();
  const queries = await Promise.all([
    db.collection(collectionPaths.profiles).where("authEmail", "==", normalizedEmail).limit(1).get(),
    db.collection(collectionPaths.profiles).where("email", "==", normalizedEmail).limit(1).get()
  ]);

  const doc = queries.flatMap((snapshot) => snapshot.docs)[0];
  return doc ? toProfile(doc.id, doc.data()) : null;
}

async function resolveProfileForIdentifier(identifier: string) {
  if (!hasFirebaseAdminConfig()) {
    return null;
  }

  const { db } = getFirebaseAdminServices();
  const keys = normalizedLookupKeys(identifier);
  const demoLogin = keys.map((key) => demoLogins[key]).find(Boolean);

  if (demoLogin) {
    return getProfileById(demoLogin.uid);
  }

  for (const key of keys) {
    const byId = await getProfileById(key);
    if (byId) {
      return byId;
    }
  }

  for (const field of ["username", "authEmail", "email", "phone"] as const) {
    for (const key of keys) {
      const snapshot = await db
        .collection(collectionPaths.profiles)
        .where(field, "==", field.includes("email") ? key.toLowerCase() : key)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return toProfile(doc.id, doc.data());
      }
    }
  }

  return null;
}

async function setSessionCompatibilityCookies(user: AuthenticatedUser) {
  const cookieStore = await cookies();
  const options = cookieOptions(Math.floor(sessionExpiresIn / 1000));

  cookieStore.set("fitsplit-role", user.role, options);
  cookieStore.set("fitsplit-username", user.email, options);
  cookieStore.set("fitsplit-gym-id", user.gymId, options);

  if (user.memberId) {
    cookieStore.set("fitsplit-member-id", user.memberId, options);
  } else {
    cookieStore.delete("fitsplit-member-id");
  }
}

async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);

  for (const cookieName of legacyCookieNames) {
    cookieStore.delete(cookieName);
  }
}

function authUserFromProfile(profile: ProfileRecord): AuthenticatedUser {
  return {
    uid: profile.uid,
    email: profile.authEmail || profile.email,
    fullName: profile.fullName,
    role: profile.role,
    gymId: profile.defaultGymId,
    memberId: profile.role === "member" ? profile.id : undefined
  };
}

function authUserFromDemo(demoLogin: DemoLogin): AuthenticatedUser {
  return {
    uid: demoLogin.uid,
    email: demoLogin.authEmail,
    fullName: demoLogin.fullName,
    role: demoLogin.role,
    gymId: demoLogin.gymId,
    memberId: demoLogin.role === "member" ? demoLogin.uid : undefined
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

export async function resolveLoginIdentifier(identifier: string, expectedRole?: "member" | "staff") {
  const cleanIdentifier = identifier.trim();

  if (!cleanIdentifier) {
    return { status: "error" as const, message: "Enter your username, mobile number, or email." };
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
        role: demoLogin.role
      };
    }

    return {
      status: "success" as const,
      email: demoLogin.authEmail,
      localOnly: true,
      role: demoLogin.role
    };
  }

  if (!hasFirebaseAdminConfig()) {
    return { status: "error" as const, message: "No demo FitSplit account found." };
  }

  const keys = normalizedLookupKeys(cleanIdentifier);
  
  // Ensure basic demo profiles exist in Firestore
  try {
    const { ensureTitanWorkspace } = await import("@/lib/firebase/actions");
    await ensureTitanWorkspace();
  } catch (e) {
    console.warn("Failed to ensure Titan workspace", e);
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
    email: profile.authEmail ?? profile.email,
    role: profile.role
  };
}

export async function createLocalDemoSession(
  identifier: string,
  password: string,
  expectedRole?: "member" | "staff"
) {
  const demoLogin = findDemoLogin(identifier);

  if (!demoLogin) {
    return { status: "error" as const, message: "No demo FitSplit account found." };
  }

  const roleError = validateExpectedRole(demoLogin.role, expectedRole);
  if (roleError) {
    return { status: "error" as const, message: roleError };
  }

  const expectedPassword = demoLogin.role === "member" ? "123456" : "password";
  if (password !== expectedPassword) {
    return {
      status: "error" as const,
      message: demoLogin.role === "member" ? "Invalid PIN." : "Invalid password."
    };
  }

  const user = authUserFromDemo(demoLogin);
  await setSessionCompatibilityCookies(user);

  return {
    status: "success" as const,
    redirectUrl: redirectForRole(user.role),
    user
  };
}

export async function createSession(idToken: string) {
  if (!hasFirebaseAdminConfig()) {
    return { status: "error" as const, message: "Firebase Admin is not configured on the server yet." };
  }

  try {
    const { auth } = getFirebaseAdminServices();
    const decodedToken = await auth.verifyIdToken(idToken);
    const profile =
      (await getProfileById(decodedToken.uid)) ??
      (decodedToken.email ? await getProfileByEmail(decodedToken.email) : null);

    if (!profile || !profile.isActive) {
      await clearAuthCookies();
      return { status: "error" as const, message: "Your FitSplit profile is inactive or missing." };
    }

    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: sessionExpiresIn
    });
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieName, sessionCookie, cookieOptions(Math.floor(sessionExpiresIn / 1000)));

    const user = authUserFromProfile(profile);
    await setSessionCompatibilityCookies(user);

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

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(sessionCookieName)?.value;

  if (!hasFirebaseAdminConfig() || !session) {
    const role = cookieStore.get("fitsplit-role")?.value as Role | undefined;
    const email = cookieStore.get("fitsplit-username")?.value;
    const gymId = cookieStore.get("fitsplit-gym-id")?.value;
    const memberId = cookieStore.get("fitsplit-member-id")?.value;

    if (!role || !email || !gymId || !["admin", "owner", "member"].includes(role)) {
      return null;
    }

    const demoLogin = Object.values(demoLogins).find(
      (login) => login.authEmail === email || login.uid === memberId
    );

    return {
      uid: demoLogin?.uid ?? memberId ?? email,
      email,
      fullName: demoLogin?.fullName ?? "FitSplit user",
      role,
      gymId,
      memberId: role === "member" ? memberId : undefined
    };
  }

  try {
    const { auth } = getFirebaseAdminServices();
    const decodedSession = await auth.verifySessionCookie(session, true);
    const profile =
      (await getProfileById(decodedSession.uid)) ??
      (decodedSession.email ? await getProfileByEmail(decodedSession.email) : null);

    if (!profile || !profile.isActive) {
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

  return user;
}

export async function logoutUser() {
  await clearAuthCookies();
  redirect("/");
}

export async function requestPasswordReset() {
  return {
    status: "success" as const,
    message: "Use the Firebase password reset email from the login form."
  };
}
