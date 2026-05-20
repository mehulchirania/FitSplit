"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
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
const sessionExpiresIn = 1000 * 60 * 60 * 2;

type ProfileRecord = {
  id: string;
  uid: string;
  email: string;
  authEmail: string;
  fullName: string;
  role: Role;
  staffType?: string;
  defaultGymId: string;
  isActive: boolean;
};

export type AuthenticatedUser = {
  uid: string;
  email: string;
  fullName: string;
  role: Role;
  staffType?: string;
  gymId: string;
  memberId?: string;
};

type DemoLogin = {
  uid: string;
  authEmail: string;
  fullName: string;
  gymId: string;
  role: Role;
  staffType?: string;
};

const demoLogins: Record<string, DemoLogin> = {
  admin: {
    uid: "admin-fitsplit",
    authEmail: "admin@fitsplit.app",
    fullName: "FitSplit Admin",
    gymId: "shg",
    role: "admin"
  },
  "santosh-shg": {
    uid: "santosh-shg",
    authEmail: "santosh-shg@fitsplit.app",
    fullName: "Santosh SHG",
    gymId: "shg",
    role: "owner"
  },
  "shg-trainer-1": {
    uid: "shg-trainer-1",
    authEmail: "shg-trainer-1@fitsplit.app",
    fullName: "Ravi Kumar",
    gymId: "shg",
    role: "owner",
    staffType: "trainer"
  },
  "shg-trainer-2": {
    uid: "shg-trainer-2",
    authEmail: "shg-trainer-2@fitsplit.app",
    fullName: "Priya Nair",
    gymId: "shg",
    role: "owner",
    staffType: "trainer"
  },
  "dummy-gym-owner-1": {
    uid: "dummy-gym-owner-1",
    authEmail: "dummy-gym-owner-1@fitsplit.app",
    fullName: "Dummy Gym Owner",
    gymId: "dummy-gym",
    role: "owner"
  },
  "titan-owner-1": {
    uid: "titan-owner-1",
    authEmail: "titan-owner-1@fitsplit.app",
    fullName: "Titan Owner",
    gymId: "titan-gym",
    role: "owner"
  },
  "aarav@example.com": {
    uid: "member-aarav",
    authEmail: "aarav@example.com",
    fullName: "Aarav Sharma",
    gymId: "shg",
    role: "member"
  },
  aarav: {
    uid: "member-aarav",
    authEmail: "aarav@example.com",
    fullName: "Aarav Sharma",
    gymId: "shg",
    role: "member"
  },
  "9876543210": {
    uid: "member-aarav",
    authEmail: "aarav@example.com",
    fullName: "Aarav Sharma",
    gymId: "shg",
    role: "member"
  },
  "+919876543210": {
    uid: "member-aarav",
    authEmail: "aarav@example.com",
    fullName: "Aarav Sharma",
    gymId: "shg",
    role: "member"
  },
  "+91 9876543210": {
    uid: "member-aarav",
    authEmail: "aarav@example.com",
    fullName: "Aarav Sharma",
    gymId: "shg",
    role: "member"
  },
  mehulchirania: {
    uid: "member-mehul",
    authEmail: "mehul@example.com",
    fullName: "Mehul Chirania",
    gymId: "shg",
    role: "member"
  },
  "mehul@example.com": {
    uid: "member-mehul",
    authEmail: "mehul@example.com",
    fullName: "Mehul Chirania",
    gymId: "shg",
    role: "member"
  },
  "+919688227039": {
    uid: "member-mehul",
    authEmail: "mehul@example.com",
    fullName: "Mehul Chirania",
    gymId: "shg",
    role: "member"
  },
  "+91 9688227039": {
    uid: "member-mehul",
    authEmail: "mehul@example.com",
    fullName: "Mehul Chirania",
    gymId: "shg",
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
    staffType: data.staffType ? String(data.staffType) : undefined,
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
    staffType: profile.staffType,
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
    staffType: demoLogin.staffType,
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

  const expectedPassword = demoLogin.role === "member" ? "1234" : "password";
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

export async function loginWithCredentials(formData: FormData) {
  const identifier = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const mode = String(formData.get("mode") ?? "member") as "member" | "staff";

  if (!identifier || !password) {
    return { status: "error" as const, message: "Enter your login details." };
  }

  if (findDemoLogin(identifier)) {
    return createLocalDemoSession(identifier, password, mode);
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

  const firebasePassword = mode === "member" ? `pin-${password}` : password;
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      body: JSON.stringify({
        email: resolved.email,
        password: firebasePassword,
        returnSecureToken: true
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    }
  );

  if (!response.ok) {
    return {
      status: "error" as const,
      message: mode === "member" ? "Invalid mobile/email or PIN." : "Invalid username or password."
    };
  }

  const payload = (await response.json()) as { idToken?: string };

  if (!payload.idToken) {
    return { status: "error" as const, message: "Unable to sign in. Please try again." };
  }

  return createSession(payload.idToken);
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
    const decodedSession = await auth.verifySessionCookie(session);
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
