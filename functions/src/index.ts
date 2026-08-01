/* eslint-disable @typescript-eslint/no-explicit-any */
// runtime: nodejs22 — upgraded from nodejs20 on 2026-05-24
import { randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getStorage } from "firebase-admin/storage";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { beforeUserSignedIn } from "firebase-functions/v2/identity";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  addMonths,
  computeMembershipStatus,
  daysUntilExpiry,
  planExpiryTransition,
  warningWindowEnd,
} from "./membership-expiry-logic.js";

initializeApp();

const db = getFirestore();
const auth = getAuth();
const messaging = getMessaging();
const storage = getStorage();
const region = "asia-south1";
const primaryGymId = "shg";

type Role = "admin" | "owner" | "trainer" | "member";
type StaffType = "owner" | "trainer" | "staff";
type TrainerMemberVisibility = "assigned_only" | "all_pt_members" | "all_members";

type CallableUser = {
  uid: string;
  role: Role;
  gymId: string;
  memberId?: string;
};

type FunctionResult<T = Record<string, unknown>> = {
  status: "success";
  message: string;
  data?: T;
};

function asString(value: unknown, label: string) {
  const text = String(value ?? "").trim();
  if (!text) throw new HttpsError("invalid-argument", `${label} is required.`);
  return text;
}

function optionalString(value: unknown) {
  return String(value ?? "").trim();
}

function assertEmail(email: string, label = "Email") {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError("invalid-argument", `${label} is invalid.`);
  }
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function assertUsername(username: string) {
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw new HttpsError("invalid-argument", "Username must be 3-32 characters using letters, numbers, dots, underscores, or hyphens.");
  }
}

function slugifyGymName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function normalizeGymStatus(value: unknown) {
  const status = String(value ?? "active");
  return status === "paused" || status === "inactive" ? status : "active";
}

function parsePngDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!match?.[1]) {
    throw new HttpsError("invalid-argument", "Logo must be saved as a PNG preview before uploading.");
  }
  const buffer = Buffer.from(match[1], "base64");
  if (buffer.byteLength > 900_000) {
    throw new HttpsError("invalid-argument", "Logo is too large. Use the cropper preview before saving.");
  }
  return buffer;
}

function assertPin(pin: string) {
  if (!/^\d{4}$/.test(pin)) {
    throw new HttpsError("invalid-argument", "PIN must be exactly 4 numeric digits.");
  }
}

function memberAuthEmail(memberId: string) {
  return `${memberId}@members.fitsplit.app`;
}

function profileInitials(fullName: string) {
  return fullName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase() || "FS";
}

function authProfilePayload(profileId: string, profile: Record<string, unknown>) {
  const gymId = String(profile.defaultGymId ?? profile.gymId ?? primaryGymId);
  return {
    id: String(profile.id ?? profileId),
    authUid: String(profile.authUid ?? profile.uid ?? profileId),
    email: String(profile.email ?? ""),
    authEmail: String(profile.authEmail ?? profile.email ?? ""),
    username: profile.username ? String(profile.username) : "",
    phone: profile.phone ? String(profile.phone) : "",
    fullName: String(profile.fullName ?? "FitSplit user"),
    role: String(profile.role ?? "member"),
    staffType: profile.staffType ? String(profile.staffType) : "",
    defaultGymId: gymId,
    gymId,
    isActive: profile.isActive !== false,
    mustChangePassword: profile.mustChangePassword === true,
    authIndexOnly: true,
    updatedAt: String(profile.updatedAt ?? new Date().toISOString())
  };
}

function getCallableUser(request: { auth?: { uid: string; token: Record<string, unknown> } | null }): CallableUser {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in before calling this action.");
  }

  const role = String(request.auth.token.role ?? "") as Role;
  const gymId = String(request.auth.token.gymId ?? "");
  if (!["admin", "owner", "trainer", "member"].includes(role)) {
    throw new HttpsError("permission-denied", "Your account role is not allowed.");
  }

  return {
    uid: request.auth.uid,
    role,
    gymId,
    memberId: request.auth.token.memberId ? String(request.auth.token.memberId) : undefined
  };
}

function assertCanManageGym(user: CallableUser, gymId: string) {
  if (user.role === "admin") return;
  if (user.role === "owner" && user.gymId === gymId) return;
  throw new HttpsError("permission-denied", "You can only manage records for your assigned gym.");
}

async function assertMemberBelongsToGym(memberId: string, gymId: string) {
  const profile = await db.collection("authProfiles").doc(memberId).get();
  const data = profile.data();
  if (!profile.exists || data?.role !== "member") {
    throw new HttpsError("not-found", "Member profile was not found.");
  }
  const profileGymId = String(data.defaultGymId ?? data.gymId ?? "");
  if (profileGymId !== gymId) {
    throw new HttpsError("permission-denied", "This member is not part of your gym.");
  }
  return { ref: profile.ref, data };
}

async function assertUsernameAvailable(username: string, exceptProfileId?: string) {
  const normalized = normalizeUsername(username);
  const snapshot = await db.collection("authProfiles").where("username", "==", normalized).limit(2).get();
  const conflict = snapshot.docs.find((doc) => doc.id !== exceptProfileId);
  if (conflict) {
    throw new HttpsError("already-exists", "That username is already in use.");
  }
}

function normalizePhone(phone: string) {
  const compact = phone.trim().replace(/[\s-]/g, "");
  if (/^\d{10}$/.test(compact)) return `+91 ${compact}`;
  if (/^\+91\d{10}$/.test(compact)) return `+91 ${compact.slice(3)}`;
  return phone.trim();
}

async function assertPhoneAvailable(phone: string, exceptProfileId?: string) {
  const normalized = normalizePhone(phone);
  const snapshot = await db.collection("authProfiles").where("phone", "==", normalized).limit(2).get();
  const conflict = snapshot.docs.find((doc) => doc.id !== exceptProfileId);
  if (conflict) {
    throw new HttpsError("already-exists", "That phone number is already registered.");
  }
}

function gymDoc(gymId: string, collection: string, docId: string) {
  return db.collection(`gyms/${gymId}/${collection}`).doc(docId);
}

function asStringArray(value: unknown, label: string) {
  if (!Array.isArray(value)) {
    throw new HttpsError("invalid-argument", `${label} must be an array.`);
  }
  const ids = value.map((item) => String(item ?? "").trim()).filter(Boolean);
  if (!ids.length) {
    throw new HttpsError("invalid-argument", `${label} cannot be empty.`);
  }
  return Array.from(new Set(ids));
}

function asBoolean(value: unknown, label: string) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new HttpsError("invalid-argument", `${label} must be true or false.`);
}

function parsePlannedExercises(value: unknown) {
  const items = Array.isArray(value) ? value : [];
  return items
    .map((item) => {
      const row = item as Record<string, unknown>;
      const exerciseId = String(row.exerciseId ?? "").trim();
      if (!exerciseId) return null;
      return {
        exerciseId,
        sets: Number(row.sets ?? 3) || 3,
        reps: String(row.reps ?? "8-12").trim() || "8-12",
        notes: optionalString(row.notes) || undefined
      };
    })
    .filter(Boolean);
}

async function mirrorProfileToGym(profileId: string, profile: Record<string, unknown>) {
  const gymId = String(profile.defaultGymId ?? profile.gymId ?? primaryGymId);
  const collection = profile.role === "member" ? "members" : "staff";
  await gymDoc(gymId, collection, profileId).set(
    {
      ...profile,
      id: String(profile.id ?? profileId),
      authUid: String(profile.authUid ?? profileId),
      defaultGymId: gymId,
      gymId,
      mirroredFromRootProfile: true
    },
    { merge: true }
  );
}

async function mirrorGymRecord(gymId: string, collection: string, docId: string, data: Record<string, unknown>) {
  await gymDoc(gymId, collection, docId).set(
    {
      ...data,
      id: String(data.id ?? docId),
      gymId,
      mirroredFromRootCollection: true
    },
    { merge: true }
  );
}

async function sendPushToMember(memberId: string, title: string, body: string, url = "/member") {
  try {
    const profile = await db.collection("authProfiles").doc(memberId).get();
    const fcmToken = String(profile.get("fcmToken") ?? "");
    const expoPushToken = String(profile.get("expoPushToken") ?? "");

    const sends: Promise<unknown>[] = [];

    if (fcmToken) {
      sends.push(
        messaging.send({
          token: fcmToken,
          notification: { title, body },
          webpush: { fcmOptions: { link: url } }
        })
      );
    }

    // Mobile (Expo) has no native Firebase messaging module — routed through
    // Expo's own push service instead, keyed off the token registered by
    // registerPushTokenMobile. See docs/21_MOBILE_GO_LIVE_CHECKLIST.md.
    if (expoPushToken) {
      sends.push(
        fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ to: expoPushToken, title, body, data: { url } })
        })
      );
    }

    if (sends.length === 0) return;
    const results = await Promise.allSettled(sends);
    for (const result of results) {
      if (result.status === "rejected") {
        console.warn("[sendPushToMember] one channel failed", memberId, result.reason);
      }
    }
  } catch (error) {
    console.warn("[sendPushToMember] skipped or failed", memberId, error);
  }
}

function archiveExpiry() {
  return new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
}

async function archiveSnapshot(
  snapshot: FirebaseFirestore.DocumentSnapshot,
  options: { entityType: string; deletedBy: string; gymId?: string; reason: string }
) {
  if (!snapshot.exists) return;
  const archiveId = `${options.entityType}_${snapshot.id}_${Date.now()}_${randomUUID().slice(0, 8)}`;
  await db.collection("archives").doc(archiveId).set({
    id: archiveId,
    entityType: options.entityType,
    originalId: snapshot.id,
    originalPath: snapshot.ref.path,
    gymId: options.gymId ?? snapshot.get("gymId") ?? snapshot.get("defaultGymId") ?? null,
    reason: options.reason,
    deletedBy: options.deletedBy,
    archivedAt: new Date().toISOString(),
    retentionDays: 60,
    retentionExpiresAt: archiveExpiry(),
    data: snapshot.data()
  });
}

async function archiveQuery(
  snapshot: FirebaseFirestore.QuerySnapshot,
  options: { entityType: string; deletedBy: string; gymId?: string; reason: string }
) {
  await Promise.all(snapshot.docs.map((doc) => archiveSnapshot(doc, options)));
}

async function deleteDocs(docs: FirebaseFirestore.QueryDocumentSnapshot[]) {
  for (let i = 0; i < docs.length; i += 450) {
    const batch = db.batch();
    docs.slice(i, i + 450).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function createAuthUser(params: {
  uid: string;
  email: string;
  fullName: string;
  password: string;
  role: Role;
  gymId: string;
  memberId?: string;
  isActive?: boolean;
  staffType?: StaffType;
  mustChangePassword?: boolean;
}) {
  await auth.createUser({
    uid: params.uid,
    email: params.email,
    emailVerified: true,
    displayName: params.fullName,
    password: params.password,
    disabled: params.isActive === false
  });
  await auth.setCustomUserClaims(params.uid, {
    gymId: params.gymId,
    role: params.role,
    // SSR Profile Optimization (mirrors src/lib/auth.ts _getCurrentUserImpl /
    // src/lib/firebase/actions/shared.ts upsertAuthUser) — keep these three in
    // sync with the authProfiles doc so the web app's fast path doesn't need a
    // Firestore read on every request.
    isActive: params.isActive !== false,
    mustChangePassword: params.mustChangePassword === true,
    ...(params.staffType ? { staffType: params.staffType } : {}),
    ...(params.memberId ? { memberId: params.memberId } : {})
  });
}

/**
 * Patches a single field into a user's EXISTING persistent custom claims
 * without clobbering the rest. Mirrors patchUserClaims in
 * src/lib/firebase/actions/shared.ts — see that function's doc comment.
 */
async function patchUserClaims(uid: string, patch: Record<string, unknown>) {
  try {
    const userRecord = await auth.getUser(uid);
    const existingClaims = (userRecord.customClaims ?? {}) as Record<string, unknown>;
    await auth.setCustomUserClaims(uid, { ...existingClaims, ...patch });
  } catch (error: any) {
    if (error?.code !== "auth/user-not-found") throw error;
  }
}

export const createMemberAccount = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const gymId = optionalString(request.data?.gymId) || user.gymId || primaryGymId;
  assertCanManageGym(user, gymId);

  const fullName = asString(request.data?.fullName, "Full name");
  const phone = asString(request.data?.phone, "Phone number");
  const email = optionalString(request.data?.email).toLowerCase();
  const username = normalizeUsername(asString(request.data?.username, "Username"));
  const goal = optionalString(request.data?.goal) || "General fitness";
  if (email) assertEmail(email);
  assertUsername(username);
  await assertUsernameAvailable(username);
  await assertPhoneAvailable(phone);

  const memberId = randomUUID();
  const authEmail = memberAuthEmail(memberId);
  const now = new Date().toISOString();

  try {
    await createAuthUser({
      uid: memberId,
      email: authEmail,
      fullName,
      password: "pin-1234",
      role: "member",
      gymId,
      memberId,
      isActive: true
    });

    const memberProfile = {
      id: memberId,
      fullName,
      email,
      authEmail,
      username,
      phone,
      role: "member",
      defaultGymId: gymId,
      goal,
      avatarInitials: profileInitials(fullName),
      isActive: true,
      joinedAt: now.slice(0, 10),
      createdAt: now,
      updatedAt: now
    };

    await db.collection("authProfiles").doc(memberId).set(authProfilePayload(memberId, memberProfile));
    await mirrorProfileToGym(memberId, memberProfile);
    await db.collection("gyms").doc(gymId).set(
      {
        memberCount: FieldValue.increment(1),
        updatedAt: now
      },
      { merge: true }
    );

    const activityId = randomUUID();
    const activity = {
      id: activityId,
      gymId,
      audience: "owner",
      memberId,
      title: `New member joined - ${fullName}`,
      detail: `${fullName} was added by ${user.uid}.`,
      icon: "users",
      createdAt: now
    };
    await db.collection("activityEvents").doc(activityId).set(activity);
    await mirrorGymRecord(gymId, "activityEvents", activityId, activity);

    return { status: "success", memberId, message: `${fullName} was added.` };
  } catch (error) {
    try {
      await auth.deleteUser(memberId);
    } catch {
      // best effort cleanup
    }
    throw error;
  }
});

export const createStaffAccount = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  if (user.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can create gym staff.");
  }

  const gymId = asString(request.data?.gymId, "Gym ID");
  const fullName = asString(request.data?.fullName, "Full name");
  const phone = asString(request.data?.phone, "Phone number");
  const email = optionalString(request.data?.email).toLowerCase();
  const staffType = optionalString(request.data?.staffType) as StaffType || "owner";
  const normalizedStaffType: StaffType = ["owner", "trainer", "staff"].includes(staffType) ? staffType : "owner";
  if (email) assertEmail(email);
  await assertPhoneAvailable(phone);

  const staffId = randomUUID();
  const now = new Date().toISOString();
  const authEmail = `${staffId}@staff.fitsplit.app`;

  // Trainers get the first-class "trainer" role; owners stay "owner".
  const authRole: Role = normalizedStaffType === "trainer" ? "trainer" : "owner";

  await createAuthUser({
    uid: staffId,
    email: authEmail,
    fullName,
    password: "password",
    role: authRole,
    gymId,
    isActive: true,
    staffType: normalizedStaffType,
    mustChangePassword: true
  });

  const staffProfile = {
    id: staffId,
    fullName,
    email,
    phone,
    authEmail,
    username: phone,
    role: authRole,
    staffType: normalizedStaffType,
    defaultGymId: gymId,
    avatarInitials: profileInitials(fullName),
    isActive: true,
    mustChangePassword: true,
    createdAt: now,
    updatedAt: now
  };
  await db.collection("authProfiles").doc(staffId).set(authProfilePayload(staffId, staffProfile));
  await mirrorProfileToGym(staffId, staffProfile);

  return { status: "success", staffId, message: `${fullName} was added as gym ${normalizedStaffType}.` };
});

export const createGymWorkspace = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  if (user.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can create gyms.");
  }

  const name = asString(request.data?.name, "Gym name");
  const slug = slugifyGymName(optionalString(request.data?.slug) || name);
  const locationUrl = optionalString(request.data?.locationUrl);
  if (!slug) {
    throw new HttpsError("invalid-argument", "Gym slug is invalid.");
  }
  if (locationUrl) {
    try {
      new URL(locationUrl);
    } catch {
      throw new HttpsError("invalid-argument", "Location URL must be a valid URL.");
    }
  }

  const gymRef = db.collection("gyms").doc(slug);
  const existing = await gymRef.get();
  if (existing.exists) {
    throw new HttpsError("already-exists", "A gym with this slug already exists.");
  }

  const now = new Date().toISOString();
  const gym = {
    id: slug,
    name,
    slug,
    ownerName: "",
    ownerUserId: "",
    expiryWarningDays: 7,
    status: normalizeGymStatus(request.data?.status),
    location: optionalString(request.data?.location),
    locationUrl,
    phone: optionalString(request.data?.phone),
    email: optionalString(request.data?.email).toLowerCase(),
    instagram: "",
    linkedin: "",
    youtube: "",
    createdAt: now,
    updatedAt: now
  };

  if (gym.email) assertEmail(gym.email, "Contact email");
  await gymRef.set(gym);
  return {
    status: "success",
    message: `${name} was added.`,
    data: { gymId: slug }
  } satisfies FunctionResult<{ gymId: string }>;
});

export const updateGymDetails = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  if (user.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can update gyms.");
  }

  const gymId = asString(request.data?.gymId, "Gym ID");
  const name = asString(request.data?.name, "Gym name");
  const email = optionalString(request.data?.email).toLowerCase();
  const locationUrl = optionalString(request.data?.locationUrl);
  if (email) assertEmail(email, "Contact email");
  if (locationUrl) {
    try {
      new URL(locationUrl);
    } catch {
      throw new HttpsError("invalid-argument", "Location URL must be a valid URL.");
    }
  }

  await db.collection("gyms").doc(gymId).set(
    {
      name,
      location: optionalString(request.data?.location),
      locationUrl,
      phone: optionalString(request.data?.phone),
      email,
      instagram: optionalString(request.data?.instagram),
      linkedin: optionalString(request.data?.linkedin),
      youtube: optionalString(request.data?.youtube),
      ...(request.data?.expiryWarningDays !== undefined && { expiryWarningDays: Number(request.data.expiryWarningDays) }),
      ...(request.data?.radiusMeters !== undefined && { radiusMeters: Number(request.data.radiusMeters) }),
      ...(request.data?.latitude !== undefined && { latitude: Number(request.data.latitude) }),
      ...(request.data?.longitude !== undefined && { longitude: Number(request.data.longitude) }),
      ...(request.data?.trainerMemberVisibility !== undefined && { trainerMemberVisibility: request.data.trainerMemberVisibility }),
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );

  return { status: "success", message: "Gym details updated successfully." } satisfies FunctionResult;
});

export const updateGymLogo = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  if (user.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can update gym logos.");
  }

  const gymId = asString(request.data?.gymId, "Gym ID");
  const logoDataUrl = asString(request.data?.logoDataUrl, "Logo preview");
  const buffer = parsePngDataUrl(logoDataUrl);
  const now = new Date().toISOString();
  const token = randomUUID();
  const logoPath = `gym-logos/${gymId}/logo-512.png`;
  const bucket = storage.bucket();

  await bucket.file(logoPath).save(buffer, {
    contentType: "image/png",
    metadata: {
      cacheControl: "public, max-age=31536000",
      metadata: {
        firebaseStorageDownloadTokens: token
      }
    }
  });

  const logoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(logoPath)}?alt=media&token=${token}`;
  await db.collection("gyms").doc(gymId).set({ logoPath, logoUrl, updatedAt: now }, { merge: true });

  return {
    status: "success",
    message: "Gym logo updated.",
    data: { logoPath, logoUrl }
  } satisfies FunctionResult<{ logoPath: string; logoUrl: string }>;
});

export const setGymAccessStatus = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  if (user.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can update gym access.");
  }

  const gymId = asString(request.data?.gymId, "Gym ID");
  const status = normalizeGymStatus(request.data?.status);
  const isActive = status === "active";
  const now = new Date().toISOString();

  await db.collection("gyms").doc(gymId).set({ status, updatedAt: now }, { merge: true });

  const profileSnapshot = await db
    .collection("authProfiles")
    .where("defaultGymId", "==", gymId)
    .where("role", "in", ["owner", "member"])
    .get();

  const [memberSnapshot, staffSnapshot] = await Promise.all([
    db.collection(`gyms/${gymId}/members`).get(),
    db.collection(`gyms/${gymId}/staff`).get()
  ]);

  const batch = db.batch();
  for (const profileDoc of profileSnapshot.docs) {
    batch.set(profileDoc.ref, { isActive, updatedAt: now }, { merge: true });
  }
  for (const scopedDoc of [...memberSnapshot.docs, ...staffSnapshot.docs]) {
    batch.set(scopedDoc.ref, { isActive, updatedAt: now }, { merge: true });
  }
  await batch.commit();

  await Promise.all(
    profileSnapshot.docs.map(async (profileDoc) => {
      try {
        await auth.updateUser(profileDoc.id, { disabled: !isActive });
      } catch (error: any) {
        if (error?.code !== "auth/user-not-found") throw error;
      }
    })
  );

  return {
    status: "success",
    message: `Gym ${isActive ? "activated" : "deactivated"}. Staff and member access ${isActive ? "enabled" : "disabled"}.`
  } satisfies FunctionResult;
});

export const archiveStaffAccount = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  if (user.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can delete staff.");
  }

  const userId = asString(request.data?.userId, "User ID");
  const gymId = asString(request.data?.gymId, "Gym ID");
  const rootProfile = await db.collection("authProfiles").doc(userId).get();
  const scopedProfile = await gymDoc(gymId, "staff", userId).get();

  await Promise.all([
    archiveSnapshot(rootProfile, { entityType: "staffProfile", deletedBy: user.uid, gymId, reason: "staff_deleted" }),
    archiveSnapshot(scopedProfile, { entityType: "staffProfile", deletedBy: user.uid, gymId, reason: "staff_deleted" })
  ]);

  await Promise.all([
    db.collection("authProfiles").doc(userId).delete(),
    db.collection("profiles").doc(userId).delete().catch(() => undefined),
    gymDoc(gymId, "staff", userId).delete()
  ]);

  try {
    await auth.deleteUser(userId);
  } catch (error: any) {
    if (error?.code !== "auth/user-not-found") throw error;
  }

  return { status: "success", message: "Gym staff access was deleted." } satisfies FunctionResult;
});

export const toggleMemberAccess = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const memberId = asString(request.data?.memberId, "Member ID");
  const isActive = Boolean(request.data?.isActive);
  const gymId = user.gymId || primaryGymId;
  assertCanManageGym(user, gymId);

  const { data } = await assertMemberBelongsToGym(memberId, gymId);
  const now = new Date().toISOString();
  await db.collection("authProfiles").doc(memberId).set({ isActive, updatedAt: now }, { merge: true });
  await mirrorProfileToGym(memberId, {
    ...data,
    id: memberId,
    role: "member",
    defaultGymId: gymId,
    isActive,
    updatedAt: now
  });
  await auth.updateUser(memberId, { disabled: !isActive });

  return { status: "success", message: `Member access ${isActive ? "enabled" : "disabled"}.` };
});

export const resetMemberPin = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const memberId = asString(request.data?.memberId, "Member ID");
  const pin = optionalString(request.data?.pin) || "1234";
  assertPin(pin);
  const gymId = user.gymId || primaryGymId;
  assertCanManageGym(user, gymId);
  await assertMemberBelongsToGym(memberId, gymId);
  await auth.updateUser(memberId, { password: `pin-${pin}` });
  return { status: "success", message: "Member PIN was reset." };
});

export const resetStaffPassword = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  if (user.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can reset staff passwords.");
  }
  const userId = asString(request.data?.userId, "User ID");
  const password = optionalString(request.data?.password) || "password";
  if (password.length < 6) {
    throw new HttpsError("invalid-argument", "Password must be at least 6 characters.");
  }
  await auth.updateUser(userId, { password });
  await db.collection("authProfiles").doc(userId).set({ mustChangePassword: true, updatedAt: new Date().toISOString() }, { merge: true });
  return { status: "success", message: "Staff password was reset." };
});

export const assignProgramToMember = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const memberId = asString(request.data?.memberId, "Member ID");
  const programId = asString(request.data?.programId, "Program ID");
  const programTitle = optionalString(request.data?.programTitle) || "Workout program";
  const memberName = optionalString(request.data?.memberName) || "Member";
  const gymId = user.gymId || primaryGymId;
  assertCanManageGym(user, gymId);
  await assertMemberBelongsToGym(memberId, gymId);

  const now = new Date().toISOString();
  const existingRoot = await db
    .collection("programAssignments")
    .where("gymId", "==", gymId)
    .where("memberId", "==", memberId)
    .where("status", "==", "active")
    .get();
  const existingScoped = await db
    .collection(`gyms/${gymId}/programAssignments`)
    .where("memberId", "==", memberId)
    .where("status", "==", "active")
    .get();

  await Promise.all(
    [...existingRoot.docs, ...existingScoped.docs].map((doc) =>
      doc.ref.set({ status: "cancelled", updatedAt: now }, { merge: true })
    )
  );

  const assignmentId = randomUUID();
  const assignment = {
    id: assignmentId,
    gymId,
    memberId,
    programId,
    programTitle,
    memberName,
    assignedAt: now,
    status: "active",
    createdBy: user.uid,
    sideEffectsMode: "trigger",
    createdAt: now,
    updatedAt: now
  };
  await db.collection("programAssignments").doc(assignmentId).set(assignment);
  await mirrorGymRecord(gymId, "programAssignments", assignmentId, assignment);

  return {
    status: "success",
    assignmentId,
    message: `${programTitle} was assigned to ${memberName}.`,
    data: { assignmentId }
  } satisfies FunctionResult<{ assignmentId: string }> & { assignmentId: string };
});

export const bulkToggleMemberAccess = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const gymId = optionalString(request.data?.gymId) || user.gymId || primaryGymId;
  assertCanManageGym(user, gymId);

  const memberIds = asStringArray(request.data?.memberIds, "Member IDs");
  const isActive = asBoolean(request.data?.isActive, "Access state");
  const now = new Date().toISOString();
  const failed: Array<{ memberId: string; message: string }> = [];
  let updated = 0;

  for (const memberId of memberIds) {
    try {
      const { data } = await assertMemberBelongsToGym(memberId, gymId);
      await db.collection("authProfiles").doc(memberId).set({ isActive, updatedAt: now }, { merge: true });
      await mirrorProfileToGym(memberId, {
        ...data,
        id: memberId,
        role: "member",
        defaultGymId: gymId,
        isActive,
        updatedAt: now
      });
      await auth.updateUser(memberId, { disabled: !isActive });
      updated += 1;
    } catch (error) {
      failed.push({
        memberId,
        message: error instanceof Error ? error.message : "Could not update member."
      });
    }
  }

  return {
    status: "success",
    message: failed.length
      ? `Updated ${updated} member(s); ${failed.length} failed.`
      : `Updated ${updated} member(s).`,
    data: { updated, failed }
  } satisfies FunctionResult<{ updated: number; failed: Array<{ memberId: string; message: string }> }>;
});

export const bulkAssignProgram = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const gymId = optionalString(request.data?.gymId) || user.gymId || primaryGymId;
  assertCanManageGym(user, gymId);

  const memberIds = asStringArray(request.data?.memberIds, "Member IDs");
  const programId = asString(request.data?.programId, "Program ID");
  const programTitle = optionalString(request.data?.programTitle) || "Workout program";
  const now = new Date().toISOString();
  const failed: Array<{ memberId: string; message: string }> = [];
  let updated = 0;

  for (const memberId of memberIds) {
    try {
      await assertMemberBelongsToGym(memberId, gymId);

      const [existingRoot, existingScoped] = await Promise.all([
        db
          .collection("programAssignments")
          .where("gymId", "==", gymId)
          .where("memberId", "==", memberId)
          .where("status", "==", "active")
          .get(),
        db
          .collection(`gyms/${gymId}/programAssignments`)
          .where("memberId", "==", memberId)
          .where("status", "==", "active")
          .get()
      ]);

      await Promise.all(
        [...existingRoot.docs, ...existingScoped.docs].map((doc) =>
          doc.ref.set({ status: "cancelled", updatedAt: now }, { merge: true })
        )
      );

      const assignmentId = randomUUID();
      const assignment = {
        id: assignmentId,
        gymId,
        memberId,
        programId,
        programTitle,
        memberName: "Member",
        assignedAt: now,
        status: "active",
        createdBy: user.uid,
        sideEffectsMode: "trigger",
        createdAt: now,
        updatedAt: now
      };
      await db.collection("programAssignments").doc(assignmentId).set(assignment);
      await mirrorGymRecord(gymId, "programAssignments", assignmentId, assignment);
      updated += 1;
    } catch (error) {
      failed.push({
        memberId,
        message: error instanceof Error ? error.message : "Could not assign program."
      });
    }
  }

  return {
    status: "success",
    message: failed.length
      ? `Assigned ${programTitle} to ${updated} member(s); ${failed.length} failed.`
      : `Assigned ${programTitle} to ${updated} member(s).`,
    data: { updated, failed }
  } satisfies FunctionResult<{ updated: number; failed: Array<{ memberId: string; message: string }> }>;
});

export const assignPTPlan = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const gymId = optionalString(request.data?.gymId) || user.gymId || primaryGymId;
  assertCanManageGym(user, gymId);

  const memberId = asString(request.data?.memberId, "Member ID");
  const trainerId = asString(request.data?.trainerId, "Trainer ID");
  const memberName = optionalString(request.data?.memberName) || undefined;
  const trainerName = optionalString(request.data?.trainerName) || undefined;
  const planStartDate = asString(request.data?.planStartDate, "PT start date");
  const planDurationDays = Number(request.data?.planDurationDays ?? 30);
  const plannedExercises = parsePlannedExercises(request.data?.plannedExercises);
  const notes = optionalString(request.data?.notes) || undefined;

  if (isNaN(new Date(`${planStartDate}T00:00:00`).getTime())) {
    throw new HttpsError("invalid-argument", "PT start date is invalid.");
  }
  if (!Number.isFinite(planDurationDays) || planDurationDays < 1 || planDurationDays > 365) {
    throw new HttpsError("invalid-argument", "PT plan duration must be between 1 and 365 days.");
  }
  if (!plannedExercises.length) {
    throw new HttpsError("invalid-argument", "Add at least one exercise to the PT plan.");
  }

  await assertMemberBelongsToGym(memberId, gymId);
  const trainerProfile = await db.collection("authProfiles").doc(trainerId).get();
  if (!trainerProfile.exists || String(trainerProfile.get("defaultGymId") ?? trainerProfile.get("gymId") ?? "") !== gymId) {
    throw new HttpsError("permission-denied", "Trainer is not part of this gym.");
  }

  const now = new Date().toISOString();
  const planEnd = new Date(`${planStartDate}T00:00:00`);
  planEnd.setDate(planEnd.getDate() + planDurationDays - 1);
  const planEndDate = planEnd.toISOString().slice(0, 10);
  const sessionId = randomUUID();
  const record = {
    id: sessionId,
    gymId,
    memberId,
    memberName,
    trainerId,
    trainerName,
    scheduledAt: `${planStartDate}T06:00:00`,
    durationMinutes: planDurationDays * 24 * 60,
    planStartDate,
    planEndDate,
    planDurationDays,
    status: "scheduled",
    plannedExercises,
    notes,
    sideEffectsMode: "trigger",
    createdAt: now,
    updatedAt: now
  };

  await db.collection("ptSessions").doc(sessionId).set(record);
  await mirrorGymRecord(gymId, "ptSessions", sessionId, record);

  return {
    status: "success",
    message: `PT plan assigned. Plan ID: ${sessionId}`,
    data: { ptPlanId: sessionId, planEndDate }
  } satisfies FunctionResult<{ ptPlanId: string; planEndDate: string }>;
});

export const onProgramAssignmentCreated = onDocumentCreated(
  { region, document: "programAssignments/{assignmentId}" },
  async (event) => {
    const assignment = event.data?.data();
    if (!assignment || assignment.sideEffectsMode !== "trigger") return;

    const now = new Date().toISOString();
    const gymId = String(assignment.gymId ?? primaryGymId);
    const memberId = String(assignment.memberId ?? "");
    const programTitle = String(assignment.programTitle ?? "Workout program");
    const memberName = String(assignment.memberName ?? "Member");

    if (!memberId) return;

    const assignmentId = event.params.assignmentId;
    const notificationId = `program_assignment_${assignmentId}`;
    const existingNotification = await db.collection("notifications").doc(notificationId).get();
    if (existingNotification.exists) return;
    const notification = {
      id: notificationId,
      recipientRole: "member",
      recipientId: memberId,
      gymId,
      type: "program_assigned",
      title: "Workout program assigned",
      body: `${programTitle} is now available in your weekly schedule.`,
      createdAt: now,
      updatedAt: now
    };

    const activityId = `program_assignment_${assignmentId}`;
    const activity = {
      id: activityId,
      gymId,
      audience: "owner",
      title: `Program assigned - ${programTitle}`,
      detail: `${memberName} now has ${programTitle} as the active weekly schedule.`,
      icon: "dumbbell",
      createdAt: now,
      updatedAt: now
    };

    await Promise.all([
      db.collection("notifications").doc(notificationId).set(notification, { merge: true }),
      mirrorGymRecord(gymId, "notifications", notificationId, notification),
      db.collection("activityEvents").doc(activityId).set(activity, { merge: true }),
      mirrorGymRecord(gymId, "activityEvents", activityId, activity),
      sendPushToMember(
        memberId,
        "Workout program assigned",
        `${programTitle} is now available in your weekly schedule.`,
        "/member"
      )
    ]);
  }
);

export const onPTPlanCreated = onDocumentCreated(
  { region, document: "ptSessions/{ptSessionId}" },
  async (event) => {
    const plan = event.data?.data();
    if (!plan || plan.sideEffectsMode !== "trigger") return;

    const now = new Date().toISOString();
    const gymId = String(plan.gymId ?? primaryGymId);
    const memberId = String(plan.memberId ?? "");
    const memberName = String(plan.memberName ?? "Member");
    const trainerName = String(plan.trainerName ?? "trainer");
    const planStartDate = String(plan.planStartDate ?? "");
    const planEndDate = String(plan.planEndDate ?? "");

    if (!memberId) return;

    const ptSessionId = event.params.ptSessionId;
    const notificationId = `pt_plan_${ptSessionId}`;
    const existingNotification = await db.collection("notifications").doc(notificationId).get();
    if (existingNotification.exists) return;
    const notification = {
      id: notificationId,
      gymId,
      recipientId: memberId,
      recipientRole: "member",
      type: "pt_session_booked",
      title: "PT Plan Assigned",
      body: `Your personal training plan with ${trainerName} runs from ${planStartDate} to ${planEndDate}.`,
      createdAt: now,
      updatedAt: now
    };

    const activityId = `pt_plan_${ptSessionId}`;
    const activity = {
      id: activityId,
      gymId,
      audience: "owner",
      title: "PT plan assigned",
      detail: `${memberName} has a PT plan with ${trainerName} from ${planStartDate} to ${planEndDate}.`,
      icon: "activity",
      createdAt: now,
      updatedAt: now
    };

    await Promise.all([
      db.collection("notifications").doc(notificationId).set(notification, { merge: true }),
      mirrorGymRecord(gymId, "notifications", notificationId, notification),
      db.collection("activityEvents").doc(activityId).set(activity, { merge: true }),
      mirrorGymRecord(gymId, "activityEvents", activityId, activity),
      sendPushToMember(
        memberId,
        "PT Plan Assigned",
        `Your personal training plan runs from ${planStartDate} to ${planEndDate}.`,
        "/member/pt-history"
      )
    ]);
  }
);

export const archiveMemberAccount = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const memberId = asString(request.data?.memberId, "Member ID");
  const gymId = user.gymId || primaryGymId;
  assertCanManageGym(user, gymId);
  const { data } = await assertMemberBelongsToGym(memberId, gymId);

  const rootProfile = await db.collection("authProfiles").doc(memberId).get();
  const scopedProfile = await gymDoc(gymId, "members", memberId).get();
  const [assignments, liftLogs, notifications, sessions, attendance] = await Promise.all([
    db.collection("programAssignments").where("memberId", "==", memberId).get(),
    db.collection("liftLogs").where("memberId", "==", memberId).get(),
    db.collection("notifications").where("recipientId", "==", memberId).get(),
    db.collection("workoutSessions").where("memberId", "==", memberId).get(),
    db.collection("attendanceRecords").where("memberId", "==", memberId).get()
  ]);

  await Promise.all([
    archiveSnapshot(rootProfile, { entityType: "member", deletedBy: user.uid, gymId, reason: "member_deleted" }),
    archiveSnapshot(scopedProfile, { entityType: "member", deletedBy: user.uid, gymId, reason: "member_deleted" }),
    archiveQuery(assignments, { entityType: "programAssignment", deletedBy: user.uid, gymId, reason: "member_deleted" }),
    archiveQuery(liftLogs, { entityType: "liftLog", deletedBy: user.uid, gymId, reason: "member_deleted" }),
    archiveQuery(notifications, { entityType: "notification", deletedBy: user.uid, gymId, reason: "member_deleted" }),
    archiveQuery(sessions, { entityType: "workoutSession", deletedBy: user.uid, gymId, reason: "member_deleted" }),
    archiveQuery(attendance, { entityType: "attendanceRecord", deletedBy: user.uid, gymId, reason: "member_deleted" })
  ]);

  await deleteDocs([...assignments.docs, ...liftLogs.docs, ...notifications.docs, ...sessions.docs, ...attendance.docs]);
  await rootProfile.ref.delete();
  if (scopedProfile.exists) await scopedProfile.ref.delete();
  await db.collection("gyms").doc(gymId).set({ memberCount: FieldValue.increment(-1), updatedAt: new Date().toISOString() }, { merge: true });
  try {
    await auth.deleteUser(memberId);
  } catch {
    // Auth user may already be gone.
  }

  return { status: "success", message: `${String(data.fullName ?? "Member")} was archived and deleted.` };
});

export const archiveCustomProgram = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const gymId = user.gymId || primaryGymId;
  assertCanManageGym(user, gymId);
  const programId = asString(request.data?.programId, "Program ID");

  const rootProgram = await db.collection("workoutPrograms").doc(programId).get();
  const scopedProgram = await gymDoc(gymId, "workoutPrograms", programId).get();
  await Promise.all([
    archiveSnapshot(rootProgram, { entityType: "workoutProgram", deletedBy: user.uid, gymId, reason: "program_deleted" }),
    archiveSnapshot(scopedProgram, { entityType: "workoutProgram", deletedBy: user.uid, gymId, reason: "program_deleted" })
  ]);

  if (rootProgram.exists) await rootProgram.ref.delete();
  if (scopedProgram.exists) await scopedProgram.ref.delete();
  return { status: "success", message: "Workout program was archived and deleted." };
});

export const archiveGymWorkspace = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  if (user.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can archive gyms.");
  }
  const gymId = asString(request.data?.gymId, "Gym ID");
  if (gymId === primaryGymId) {
    throw new HttpsError("failed-precondition", "The primary gym is protected.");
  }

  const gym = await db.collection("gyms").doc(gymId).get();
  if (!gym.exists) {
    throw new HttpsError("not-found", "Gym was not found.");
  }

  const profiles = await db.collection("authProfiles").where("defaultGymId", "==", gymId).get();
  const activity = await db.collection("activityEvents").where("gymId", "==", gymId).get();
  const subcollections = await gym.ref.listCollections();

  await Promise.all([
    archiveSnapshot(gym, { entityType: "gym", deletedBy: user.uid, gymId, reason: "gym_deleted" }),
    archiveQuery(profiles, { entityType: "profile", deletedBy: user.uid, gymId, reason: "gym_deleted" }),
    archiveQuery(activity, { entityType: "activityEvent", deletedBy: user.uid, gymId, reason: "gym_deleted" })
  ]);

  for (const subcollection of subcollections) {
    const snapshot = await subcollection.get();
    await archiveQuery(snapshot, { entityType: `gymScoped:${subcollection.id}`, deletedBy: user.uid, gymId, reason: "gym_deleted" });
    await deleteDocs(snapshot.docs);
  }

  await deleteDocs([...profiles.docs, ...activity.docs]);
  await gym.ref.delete();
  await Promise.allSettled(profiles.docs.map((doc) => auth.deleteUser(doc.id)));

  return { status: "success", message: "Gym was archived and deleted." };
});

/**
 * Resolve a member username or email to the Firebase Auth email so the client
 * can call signInWithEmailAndPassword.  Members authenticate with a synthetic
 * email (<memberId>@members.fitsplit.app) — this function returns it given the
 * human-readable username or personal email they entered on the login screen.
 * Staff sign in with their real email, so this returns it unchanged after
 * verifying the role is "owner".
 */
export const lookupLoginEmail = onCall({ region }, async (request) => {
  const identifier = optionalString(request.data?.identifier).toLowerCase();
  const mode = optionalString(request.data?.mode) || "member"; // "member" | "staff"

  if (!identifier) {
    throw new HttpsError("invalid-argument", "An identifier (username or email) is required.");
  }

  if (mode === "staff") {
    const snap = await db
      .collection("authProfiles")
      .where("phone", "==", normalizePhone(identifier))
      .where("role", "in", ["admin", "owner"])
      .limit(1)
      .get();
    if (snap.empty) {
      // Fallback for legacy staff who only have emails.
      const legacySnap = await db
        .collection("authProfiles")
        .where("email", "==", identifier.toLowerCase())
        .where("role", "in", ["admin", "owner"])
        .limit(1)
        .get();
      if (legacySnap.empty) {
        throw new HttpsError("not-found", "No staff account found for that phone number.");
      }
      return { email: String(legacySnap.docs[0].data().authEmail ?? legacySnap.docs[0].data().email) };
    }
    const data = snap.docs[0].data();
    if (data.isActive === false) {
      throw new HttpsError("permission-denied", "Your account has been suspended.");
    }
    return { email: String(data.authEmail ?? data.email) };
  }

  // Member mode: look up by username first, then phone.
  const byUsername = await db
    .collection("authProfiles")
    .where("username", "==", normalizeUsername(identifier))
    .where("role", "==", "member")
    .limit(1)
    .get();

  if (!byUsername.empty) {
    const data = byUsername.docs[0].data();
    if (data.isActive === false) {
      throw new HttpsError("permission-denied", "Your account has been suspended.");
    }
    return { email: String(data.authEmail ?? memberAuthEmail(byUsername.docs[0].id)) };
  }

  const byPhone = await db
    .collection("authProfiles")
    .where("phone", "==", normalizePhone(identifier))
    .where("role", "==", "member")
    .limit(1)
    .get();

  if (!byPhone.empty) {
    const data = byPhone.docs[0].data();
    if (data.isActive === false) {
      throw new HttpsError("permission-denied", "Your account has been suspended.");
    }
    return { email: String(data.authEmail ?? memberAuthEmail(byPhone.docs[0].id)) };
  }

  throw new HttpsError("not-found", "No account found for that username or phone number.");
});

// ─── Phase 2: Trainer / Package / Payment / Billing Functions ────────────────

/**
 * createTrainer — convenience wrapper around createStaffAccount with staffType="trainer".
 * Accepts the same payload; always sets role="trainer" and staffType="trainer".
 */
export const createTrainer = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  assertCanManageGym(user, String(request.data?.gymId ?? ""));

  // Delegate to the shared logic but force staffType="trainer".
  const data = { ...request.data, staffType: "trainer" };
  request.data = data;

  const gymId = asString(request.data?.gymId, "Gym ID");
  const fullName = asString(request.data?.fullName, "Full name");
  const phone = asString(request.data?.phone, "Phone number");
  const email = optionalString(request.data?.email).toLowerCase();
  if (email) assertEmail(email);
  await assertPhoneAvailable(phone);

  const staffId = randomUUID();
  const now = new Date().toISOString();
  const authEmail = `${staffId}@staff.fitsplit.app`;

  await createAuthUser({ uid: staffId, email: authEmail, fullName, password: "password", role: "trainer", gymId, isActive: true });

  const staffProfile = {
    id: staffId, fullName, email, phone, authEmail, username: phone,
    role: "trainer", staffType: "trainer", defaultGymId: gymId,
    avatarInitials: profileInitials(fullName), isActive: true,
    mustChangePassword: true, createdAt: now, updatedAt: now,
    assignedMemberIds: []
  };
  await db.collection("authProfiles").doc(staffId).set(authProfilePayload(staffId, staffProfile));
  await mirrorProfileToGym(staffId, staffProfile);

  return { status: "success", staffId, message: `${fullName} was added as a trainer.` };
});

/**
 * assignTrainerToPTMember
 * Sets `assignedTrainerId` on a member and syncs `assignedMemberIds` on the trainer's staff doc.
 * Also marks the member as isPT=true.
 */
export const assignTrainerToPTMember = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const gymId = asString(request.data?.gymId, "Gym ID");
  assertCanManageGym(user, gymId);

  const memberId = asString(request.data?.memberId, "Member ID");
  const trainerId = asString(request.data?.trainerId, "Trainer ID");

  // Verify trainer exists and belongs to this gym.
  const trainerDoc = await db.doc(`gyms/${gymId}/staff/${trainerId}`).get();
  if (!trainerDoc.exists) throw new HttpsError("not-found", "Trainer not found in this gym.");
  const trainerData = trainerDoc.data() ?? {};
  if (trainerData.role !== "trainer" && trainerData.staffType !== "trainer") {
    throw new HttpsError("invalid-argument", "The specified staff member is not a trainer.");
  }

  // Verify member belongs to this gym.
  await assertMemberBelongsToGym(memberId, gymId);

  const now = new Date().toISOString();
  const batch = db.batch();

  // Update member doc.
  batch.set(db.doc(`gyms/${gymId}/members/${memberId}`), {
    assignedTrainerId: trainerId, isPT: true, updatedAt: now
  }, { merge: true });
  batch.set(db.doc(`authProfiles/${memberId}`), {
    assignedTrainerId: trainerId, isPT: true, updatedAt: now
  }, { merge: true });

  // Update trainer's assignedMemberIds array.
  const existingIds: string[] = Array.isArray(trainerData.assignedMemberIds) ? trainerData.assignedMemberIds : [];
  if (!existingIds.includes(memberId)) {
    const updatedIds = [...existingIds, memberId];
    batch.set(db.doc(`gyms/${gymId}/staff/${trainerId}`), { assignedMemberIds: updatedIds, updatedAt: now }, { merge: true });
    batch.set(db.doc(`authProfiles/${trainerId}`), { assignedMemberIds: updatedIds, updatedAt: now }, { merge: true });
  }

  await batch.commit();
  return { status: "success", message: "Trainer assigned to member successfully." };
});

/**
 * updateTrainerVisibility
 * Sets `trainerMemberVisibility` on the gym doc. Owner-only.
 */
export const updateTrainerVisibility = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const gymId = asString(request.data?.gymId, "Gym ID");
  assertCanManageGym(user, gymId);

  const visibility = asString(request.data?.visibility, "Visibility");
  const validValues: TrainerMemberVisibility[] = ["assigned_only", "all_pt_members", "all_members"];
  if (!validValues.includes(visibility as TrainerMemberVisibility)) {
    throw new HttpsError("invalid-argument", `Visibility must be one of: ${validValues.join(", ")}`);
  }

  await db.doc(`gyms/${gymId}`).set({ trainerMemberVisibility: visibility, updatedAt: new Date().toISOString() }, { merge: true });
  return { status: "success", message: `Trainer visibility set to "${visibility}".` };
});

/**
 * createOrUpdatePackage
 * Creates or updates a membership package definition. Owner-only.
 */
export const createOrUpdatePackage = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const gymId = asString(request.data?.gymId, "Gym ID");
  assertCanManageGym(user, gymId);

  const name = asString(request.data?.name, "Package name");
  const durationMonths = Number(request.data?.durationMonths ?? 1);
  const price = Number(request.data?.price ?? 0);
  const currency = optionalString(request.data?.currency) || "INR";
  const description = optionalString(request.data?.description);
  const includesPT = request.data?.includesPT === true;
  const ptSessionsIncluded = includesPT ? Number(request.data?.ptSessionsIncluded ?? 0) : 0;
  const isActive = request.data?.isActive !== false;

  if (durationMonths < 1 || durationMonths > 24) throw new HttpsError("invalid-argument", "Duration must be 1–24 months.");
  if (price < 0) throw new HttpsError("invalid-argument", "Price cannot be negative.");

  const now = new Date().toISOString();
  const packageId = request.data?.packageId ? String(request.data.packageId) : randomUUID();
  const isNew = !request.data?.packageId;

  await db.doc(`gyms/${gymId}/packages/${packageId}`).set({
    id: packageId, gymId, name, description: description || null,
    durationMonths, price, currency, includesPT, ptSessionsIncluded,
    isActive, updatedAt: now,
    ...(isNew ? { createdAt: now } : {})
  }, { merge: true });

  return { status: "success", packageId, message: `Package "${name}" ${isNew ? "created" : "updated"}.` };
});

/**
 * submitPaymentRequest
 * Member raises a payment request for a package. Owner must approve to activate membership.
 */
export const submitPaymentRequest = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const gymId = asString(request.data?.gymId, "Gym ID");

  // Members can submit for themselves; owners/admins can submit on behalf of a member.
  const targetMemberId = user.role === "member"
    ? (user.memberId ?? user.uid)
    : asString(request.data?.memberId, "Member ID");

  if (user.role === "member") {
    if (user.gymId !== gymId) throw new HttpsError("permission-denied", "Not a member of this gym.");
  } else {
    assertCanManageGym(user, gymId);
  }

  const packageId = asString(request.data?.packageId, "Package ID");
  const method = optionalString(request.data?.method) || "cash";
  if (!["cash", "card", "upi", "other"].includes(method)) throw new HttpsError("invalid-argument", "Invalid payment method.");

  // Load package details.
  const pkgDoc = await db.doc(`gyms/${gymId}/packages/${packageId}`).get();
  if (!pkgDoc.exists) throw new HttpsError("not-found", "Package not found.");
  const pkg = pkgDoc.data() ?? {};

  // Fetch member name for denormalisation.
  const memberDoc = await db.doc(`authProfiles/${targetMemberId}`).get();
  const memberName = memberDoc.exists ? String(memberDoc.data()?.fullName ?? "") : "";

  const now = new Date().toISOString();
  const requestId = randomUUID();

  await db.doc(`gyms/${gymId}/paymentRequests/${requestId}`).set({
    id: requestId, gymId, memberId: targetMemberId, memberName,
    packageId, packageName: String(pkg.name ?? ""), amount: Number(pkg.price ?? 0),
    currency: String(pkg.currency ?? "INR"), method, status: "pending",
    requestedAt: now
  });

  // Notify gym owner.
  const ownerSnap = await db.collection(`gyms/${gymId}/staff`).where("role", "==", "owner").limit(1).get();
  if (!ownerSnap.empty) {
    const ownerId = ownerSnap.docs[0].id;
    await db.collection(`gyms/${gymId}/notifications`).add({
      recipientId: ownerId, recipientRole: "owner",
      type: "payment_request_pending",
      title: "Payment request received",
      body: `${memberName} submitted a ${method} payment request for ${pkg.name}.`,
      actionHref: "/owner/billing", memberId: targetMemberId,
      createdAt: now
    });
  }

  return { status: "success", requestId, message: "Payment request submitted." };
});

/**
 * approvePaymentRequest
 * Owner approves a cash payment → creates a Membership, updates member snapshot fields.
 * Card/UPI approval follows the same path but is flagged as mock-only.
 */
export const approvePaymentRequest = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const gymId = asString(request.data?.gymId, "Gym ID");
  assertCanManageGym(user, gymId);

  const requestId = asString(request.data?.requestId, "Request ID");
  const reqDoc = await db.doc(`gyms/${gymId}/paymentRequests/${requestId}`).get();
  if (!reqDoc.exists) throw new HttpsError("not-found", "Payment request not found.");
  const reqData = reqDoc.data() ?? {};
  if (reqData.status !== "pending") throw new HttpsError("failed-precondition", "Request is not pending.");

  // Load the package to get durationMonths.
  const pkgDoc = await db.doc(`gyms/${gymId}/packages/${reqData.packageId}`).get();
  if (!pkgDoc.exists) throw new HttpsError("not-found", "Package no longer exists.");
  const pkg = pkgDoc.data() ?? {};

  const now = new Date().toISOString();
  const startDate = now.slice(0, 10);
  const endDate = addMonths(startDate, Number(pkg.durationMonths ?? 1));
  const membershipId = randomUUID();
  const memberId = String(reqData.memberId);
  const packageName = String(pkg.name ?? "");

  const batch = db.batch();

  // Create membership record.
  batch.set(db.doc(`gyms/${gymId}/memberships/${membershipId}`), {
    id: membershipId, gymId, memberId, packageId: String(reqData.packageId), planName: packageName,
    startDate, endDate, durationMonths: Number(pkg.durationMonths ?? 1),
    status: "active", paymentRequestId: requestId,
    activatedAt: now, createdAt: now
  });

  // Update payment request status.
  batch.update(reqDoc.ref, { status: "approved", resolvedAt: now, membershipId });

  // Denormalise onto member doc for fast list-view filtering.
  const memberUpdate = { membershipStatus: "active", membershipEndDate: endDate, currentPackageName: packageName, updatedAt: now };
  batch.set(db.doc(`gyms/${gymId}/members/${memberId}`), memberUpdate, { merge: true });
  batch.set(db.doc(`authProfiles/${memberId}`), memberUpdate, { merge: true });

  await batch.commit();

  // Notify member.
  await db.collection(`gyms/${gymId}/notifications`).add({
    recipientId: memberId, recipientRole: "member",
    type: "membership_renewed",
    title: "Membership activated",
    body: `Your ${packageName} membership is active until ${endDate}.`,
    actionHref: "/member/membership", memberId,
    createdAt: now
  });

  return { status: "success", membershipId, message: "Payment approved. Membership activated." };
});

/**
 * rejectPaymentRequest — Owner rejects a pending payment request.
 */
export const rejectPaymentRequest = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const gymId = asString(request.data?.gymId, "Gym ID");
  assertCanManageGym(user, gymId);

  const requestId = asString(request.data?.requestId, "Request ID");
  const reason = optionalString(request.data?.reason) || "Rejected by owner.";

  const reqDoc = await db.doc(`gyms/${gymId}/paymentRequests/${requestId}`).get();
  if (!reqDoc.exists) throw new HttpsError("not-found", "Payment request not found.");
  if ((reqDoc.data() ?? {}).status !== "pending") throw new HttpsError("failed-precondition", "Request is not pending.");

  const now = new Date().toISOString();
  await reqDoc.ref.update({ status: "rejected", resolvedAt: now, notes: reason });

  // Notify member.
  const memberId = String((reqDoc.data() ?? {}).memberId ?? "");
  if (memberId) {
    await db.collection(`gyms/${gymId}/notifications`).add({
      recipientId: memberId, recipientRole: "member",
      type: "payment_request_rejected",
      title: "Payment request declined",
      body: reason, actionHref: "/member/membership", memberId, createdAt: now
    });
  }

  return { status: "success", message: "Payment request rejected." };
});

/**
 * activateOrRenewMembership — Owner directly activates/renews without a payment request.
 */
export const activateOrRenewMembership = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const gymId = asString(request.data?.gymId, "Gym ID");
  assertCanManageGym(user, gymId);

  const memberId = asString(request.data?.memberId, "Member ID");
  const packageId = asString(request.data?.packageId, "Package ID");

  const pkgDoc = await db.doc(`gyms/${gymId}/packages/${packageId}`).get();
  if (!pkgDoc.exists) throw new HttpsError("not-found", "Package not found.");
  const pkg = pkgDoc.data() ?? {};

  const now = new Date().toISOString();
  const startDate = now.slice(0, 10);
  const endDate = addMonths(startDate, Number(pkg.durationMonths ?? 1));
  const membershipId = randomUUID();
  const packageName = String(pkg.name ?? "");

  const batch = db.batch();
  batch.set(db.doc(`gyms/${gymId}/memberships/${membershipId}`), {
    id: membershipId, gymId, memberId, packageId, planName: packageName,
    startDate, endDate, durationMonths: Number(pkg.durationMonths ?? 1),
    status: "active", activatedAt: now, createdAt: now
  });
  const memberUpdate = { membershipStatus: "active", membershipEndDate: endDate, currentPackageName: packageName, updatedAt: now };
  batch.set(db.doc(`gyms/${gymId}/members/${memberId}`), memberUpdate, { merge: true });
  batch.set(db.doc(`authProfiles/${memberId}`), memberUpdate, { merge: true });
  await batch.commit();

  return { status: "success", membershipId, message: `Membership activated until ${endDate}.` };
});

/**
 * generateGymDashboardStats — pre-compute and write gyms/{gymId}/summaries/dashboard.
 * Call after bulk operations or on a schedule to keep the dashboard cheap to load.
 */
export const generateGymDashboardStats = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const gymId = asString(request.data?.gymId, "Gym ID");
  assertCanManageGym(user, gymId);
  await computeGymDashboard(gymId);
  return { status: "success", message: "Dashboard stats updated." };
});

async function computeGymDashboard(gymId: string) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const [gymDoc, membersSnap, pendingSnap, trainersSnap] = await Promise.all([
    db.doc(`gyms/${gymId}`).get(),
    db.collection(`gyms/${gymId}/members`).get(),
    db.collection(`gyms/${gymId}/paymentRequests`).where("status", "==", "pending").get(),
    db.collection(`gyms/${gymId}/staff`).where("role", "in", ["owner", "trainer"]).get()
  ]);

  const expiryWarningDays = Number(gymDoc.data()?.expiryWarningDays ?? 7);

  let totalMembers = 0, activeMembers = 0, ptMembers = 0, expiringThisWeek = 0, expiredCount = 0, revenueMTD = 0;
  for (const doc of membersSnap.docs) {
    const d = doc.data();
    if (d.role !== "member") continue;
    totalMembers++;
    if (d.isActive !== false) activeMembers++;
    if (d.isPT === true) ptMembers++;
    const status = computeMembershipStatus(d.membershipEndDate, todayStr, expiryWarningDays);
    if (status === "expired") expiredCount++;
    else if (status === "expiring_soon") expiringThisWeek++;
  }

  // Rough MTD revenue from approved payment requests this month.
  const monthStart = todayStr.slice(0, 7) + "-01";
  const approvedSnap = await db.collection(`gyms/${gymId}/paymentRequests`)
    .where("status", "==", "approved")
    .where("resolvedAt", ">=", monthStart)
    .get();
  for (const doc of approvedSnap.docs) revenueMTD += Number(doc.data().amount ?? 0);

  const summary = {
    gymId, totalMembers, activeMembers, ptMembers, expiringThisWeek, expiredCount,
    pendingPaymentRequests: pendingSnap.size,
    activeTrainers: trainersSnap.docs.filter((d) => d.data().role === "trainer" && d.data().isActive !== false).length,
    totalRevenueMTD: revenueMTD, currency: "INR",
    lastComputedAt: new Date().toISOString()
  };

  await db.doc(`gyms/${gymId}/summaries/dashboard`).set(summary);
  return summary;
}

/**
 * generateAdminDashboardStats — cross-gym aggregate for the admin console.
 * Writes to platformSummaries/main.
 */
export const generateAdminDashboardStats = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  if (user.role !== "admin") throw new HttpsError("permission-denied", "Admin only.");

  const gymsSnap = await db.collection("gyms").where("status", "==", "active").get();
  let totalGyms = 0, totalMembers = 0, totalTrainers = 0;

  for (const gymDoc of gymsSnap.docs) {
    totalGyms++;
    const [mSnap, tSnap] = await Promise.all([
      db.collection(`gyms/${gymDoc.id}/members`).count().get(),
      db.collection(`gyms/${gymDoc.id}/staff`).where("role", "==", "trainer").count().get()
    ]);
    totalMembers += mSnap.data().count;
    totalTrainers += tSnap.data().count;
  }

  await db.doc("platformSummaries/main").set({
    totalGyms, totalMembers, totalTrainers,
    lastComputedAt: new Date().toISOString()
  });

  return { status: "success", message: "Admin platform stats updated." };
});

export const processMembershipExpiries = onSchedule({ region, schedule: "every 24 hours", retryCount: 0 }, async () => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const gymsSnap = await db.collection("gyms").where("status", "==", "active").get();

  for (const gymDoc of gymsSnap.docs) {
    const gymId = gymDoc.id;
    const expiryWarningDays = Number(gymDoc.data().expiryWarningDays ?? 7);
    const inNDays = warningWindowEnd(todayStr, expiryWarningDays);
    const membersSnap = await db.collection(`gyms/${gymId}/members`)
      .where("membershipEndDate", "<=", inNDays).get();

    const batch = db.batch();
    let batchCount = 0;

    for (const memberDoc of membersSnap.docs) {
      const d = memberDoc.data();
      const endDate = String(d.membershipEndDate ?? "");

      const transition = planExpiryTransition({
        endDate, currentStatus: d.membershipStatus, todayStr, expiryWarningDays
      });
      if (!transition) continue; // missing endDate, still active, or already up-to-date

      const update = { membershipStatus: transition.newStatus, updatedAt: new Date().toISOString() };
      batch.set(memberDoc.ref, update, { merge: true });
      batch.set(db.doc(`authProfiles/${memberDoc.id}`), update, { merge: true });
      batchCount += 2;

      // Send notification once per status transition.
      if (transition.notificationType === "membership_expired") {
        await db.collection(`gyms/${gymId}/notifications`).add({
          recipientId: memberDoc.id, recipientRole: "member",
          type: "membership_expired",
          title: "Membership expired",
          body: "Your gym membership has expired. Renew to keep access.",
          actionHref: "/member/membership", memberId: memberDoc.id,
          createdAt: new Date().toISOString()
        });
      } else {
        const days = daysUntilExpiry(endDate, Date.now());
        await db.collection(`gyms/${gymId}/notifications`).add({
          recipientId: memberDoc.id, recipientRole: "member",
          type: "membership_expiring_soon",
          title: "Membership expiring soon",
          body: `Your membership expires in ${days} day${days === 1 ? "" : "s"}.`,
          actionHref: "/member/membership", memberId: memberDoc.id,
          createdAt: new Date().toISOString()
        });
      }

      if (batchCount >= 490) {
        await batch.commit();
        batchCount = 0;
      }
    }

    if (batchCount > 0) await batch.commit();
  }
});

// ─── Scheduled Functions ─────────────────────────────────────────────────────

export const purgeExpiredArchives = onSchedule({ region, schedule: "every 24 hours", retryCount: 0 }, async () => {
  const expired = await db.collection("archives").where("retentionExpiresAt", "<=", new Date()).limit(450).get();
  await deleteDocs(expired.docs);
});

// ─── Personal Training scheduled functions ───────────────────────────────────

/**
 * Notify members and trainers of upcoming PT sessions.
 * Runs every 60 minutes and sends notifications for sessions starting in
 * ~24 hours (±10 min window) or ~60 minutes (±10 min window).
 * Marks each session with notified24h / notified1h flags to avoid duplicates.
 */
export const notifyUpcomingPTSessions = onSchedule(
  { region, schedule: "every 60 minutes", retryCount: 0 },
  async () => {
    const now = new Date();

    const windowTargets = [
      { label: "24h", offsetMs: 24 * 60 * 60 * 1000, flag: "notified24h" },
      { label: "1h",  offsetMs: 60 * 60 * 1000,      flag: "notified1h"  }
    ] as const;

    for (const { label, offsetMs, flag } of windowTargets) {
      const windowStart = new Date(now.getTime() + offsetMs - 10 * 60 * 1000);
      const windowEnd   = new Date(now.getTime() + offsetMs + 10 * 60 * 1000);

      const snap = await db
        .collection("ptSessions")
        .where("status", "==", "scheduled")
        .where("scheduledAt", ">=", windowStart.toISOString())
        .where("scheduledAt", "<=", windowEnd.toISOString())
        .where(flag, "==", false)
        .limit(50)
        .get();

      if (snap.empty) continue;

      const batch = db.batch();

      for (const doc of snap.docs) {
        const s = doc.data();
        const gymId: string = s.gymId ?? primaryGymId;
        const scheduledLocal = new Intl.DateTimeFormat("en-IN", {
          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
        }).format(new Date(s.scheduledAt));

        // Notify member
        const memberNotifId = randomUUID();
        const memberNotif = {
          id: memberNotifId,
          gymId,
          recipientId: s.memberId,
          recipientRole: "member",
          type: "pt_session_booked",
          title: `PT session in ${label}`,
          body: `Reminder: your PT session with ${s.trainerName ?? "your trainer"} is on ${scheduledLocal}.`,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        };
        batch.set(db.collection("notifications").doc(memberNotifId), memberNotif);
        batch.set(
          db.collection(`gyms/${gymId}/notifications`).doc(memberNotifId),
          { ...memberNotif, mirroredFromRootCollection: true }
        );

        // Notify trainer
        const trainerNotifId = randomUUID();
        const trainerNotif = {
          id: trainerNotifId,
          gymId,
          recipientId: s.trainerId,
          recipientRole: "owner",
          type: "pt_session_booked",
          title: `PT session in ${label}`,
          body: `Reminder: PT session with ${s.memberName ?? "member"} is on ${scheduledLocal}.`,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        };
        batch.set(db.collection("notifications").doc(trainerNotifId), trainerNotif);
        batch.set(
          db.collection(`gyms/${gymId}/notifications`).doc(trainerNotifId),
          { ...trainerNotif, mirroredFromRootCollection: true }
        );

        // Mark notified
        batch.update(doc.ref, { [flag]: true, updatedAt: now.toISOString() });
        batch.update(
          db.collection(`gyms/${gymId}/ptSessions`).doc(doc.id),
          { [flag]: true, updatedAt: now.toISOString() }
        );
      }

      await batch.commit();
      console.log(`[notifyUpcomingPTSessions] ${label} window: notified ${snap.size} session(s)`);
    }
  }
);

/**
 * Auto-expire PT sessions that are stuck in "active" for more than 6 hours.
 * A session lingering active past midnight is almost certainly abandoned —
 * the trainer forgot to tap "End session". We cancel it with a system reason
 * so it doesn't pollute the schedule.
 *
 * Runs daily at 2 AM IST (UTC+5:30 = 20:30 UTC previous day).
 */
export const autoExpireAbandonedPTSessions = onSchedule(
  { region, schedule: "30 20 * * *", retryCount: 0 },   // 02:00 IST = 20:30 UTC
  async () => {
    const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6 hours ago
    const now = new Date().toISOString();

    const snap = await db
      .collection("ptSessions")
      .where("status", "==", "active")
      .where("startedAt", "<=", cutoff.toISOString())
      .limit(100)
      .get();

    if (snap.empty) {
      console.log("[autoExpireAbandonedPTSessions] No abandoned sessions found.");
      return;
    }

    const batch = db.batch();

    for (const doc of snap.docs) {
      const s = doc.data();
      const gymId: string = s.gymId ?? primaryGymId;
      const patch = {
        status: "cancelled",
        cancelReason: "Auto-cancelled: session was active for more than 6 hours without ending.",
        updatedAt: now
      };

      batch.update(doc.ref, patch);
      batch.update(
        db.collection(`gyms/${gymId}/ptSessions`).doc(doc.id),
        patch
      );
    }

    await batch.commit();
    console.log(`[autoExpireAbandonedPTSessions] Expired ${snap.size} abandoned session(s).`);
  }
);

// ─── D1: Blocking trigger — enforce login lockout at the Firebase Auth layer ──
// This runs BEFORE Firebase issues an ID token, so even direct SDK calls
// (mobile apps, Postman, etc.) are gated by the same lockout logic used in
// loginWithCredentials.  No lock doc → allow.  Lock expired → allow.  Active
// lock → throw unauthenticated to block the sign-in.
export const beforeSignInHandler = beforeUserSignedIn(
  { region },
  async (event) => {
    const email = event.data?.email?.toLowerCase().trim();
    if (email) {
      try {
        const lockDoc = await db.collection("loginAttempts").doc(email).get();
        const data = lockDoc.data();
        if (data?.lockedUntil) {
          const lockExpiry = new Date(data.lockedUntil).getTime();
          if (Date.now() < lockExpiry) {
            const minutesRemaining = Math.ceil((lockExpiry - Date.now()) / 60_000);
            throw new HttpsError(
              "resource-exhausted",
              `Too many failed attempts. Try again in about ${minutesRemaining} minute${minutesRemaining === 1 ? "" : "s"}.`
            );
          }
        }
      } catch (err) {
        if ((err as { code?: string })?.code === "resource-exhausted") throw err;
        console.error("[beforeSignInHandler] Unexpected error during lockout check:", err);
      }
    }

    // SSR Profile Optimization: Inject profile data into token claims
    const uid = event.data?.uid;
    if (uid) {
      try {
        const profile = await db.collection("authProfiles").doc(uid).get();
        if (profile.exists) {
          const data = profile.data();
          if (data) {
            const role = String(data.role ?? "member");
            const gymId = String(data.defaultGymId ?? data.gymId ?? primaryGymId);
            return {
              customClaims: {
                role,
                gymId,
                memberId: role === "member" ? String(data.id ?? uid) : undefined,
                isActive: data.isActive !== false,
                fullName: data.fullName ? String(data.fullName) : "FitSplit user",
                phone: data.phone ? String(data.phone) : "",
                staffType: data.staffType ? String(data.staffType) : undefined,
                mustChangePassword: data.mustChangePassword === true,
                termsAcceptedAt: data.termsAcceptedAt ? String(data.termsAcceptedAt) : undefined,
                avatarUrl: data.avatarUrl ? String(data.avatarUrl) : data.imageUrl ? String(data.imageUrl) : undefined
              }
            };
          }
        }
      } catch (err) {
        console.error("[beforeSignInHandler] Unexpected error fetching profile for claims:", err);
      }
    }

    return;
  }
);

// ─── Mobile member-write callables ─────────────────────────────────────────
// Added for the Expo/React Native app (docs/20_EXPO_MIGRATION_PLAN.md §3).
// Most member-owned reads/writes go straight through the Firestore client SDK
// from the mobile app, enforced by firestore.rules — no callable needed. These
// five are the exception: each does more than a single rules-compliant write
// (extra collection writes, aggregation, or an increment side effect a raw
// client write would silently skip), mirroring the exact write shape of the
// audited Server Actions in src/lib/firebase/actions/progress.ts.

async function assertCanWriteForMember(user: CallableUser, memberId: string) {
  if (user.role === "member") {
    if (user.memberId !== memberId) {
      throw new HttpsError("permission-denied", "You can only log data for your own account.");
    }
    return;
  }
  if (user.role === "admin") return;
  if (!user.gymId) {
    throw new HttpsError("permission-denied", "Your account is not assigned to a gym.");
  }
  await assertMemberBelongsToGym(memberId, user.gymId);
}

function dailyWorkoutSessionId(memberId: string, isoDate: string) {
  return `${memberId}_${isoDate.slice(0, 10)}`.replace(/[/#?[\]]/g, "_");
}

async function upsertImplicitWorkoutAttendance(gymId: string, memberId: string, now: string) {
  const sessionId = dailyWorkoutSessionId(memberId, now);
  const sessionRef = gymDoc(gymId, "workoutSessions", sessionId);
  const attendanceRef = gymDoc(gymId, "attendanceRecords", sessionId);
  const [sessionDoc, attendanceDoc] = await Promise.all([sessionRef.get(), attendanceRef.get()]);
  const existingSession = sessionDoc.data() ?? {};
  const existingAttendance = attendanceDoc.data() ?? {};
  const startedAt = String(existingSession.startedAt ?? existingAttendance.checkInAt ?? now);
  const checkInAt = String(existingAttendance.checkInAt ?? startedAt);

  await Promise.all([
    sessionRef.set(
      {
        id: sessionId,
        gymId,
        memberId,
        startedAt,
        endedAt: now,
        status: "completed",
        updatedAt: now,
        attendanceSource: "lift_log"
      },
      { merge: true }
    ),
    attendanceRef.set(
      {
        id: sessionId,
        memberId,
        gymId,
        sessionId,
        checkInAt,
        checkOutAt: now,
        latitude: null,
        longitude: null,
        distanceMeters: null,
        geofenceStatus: "location_not_provided",
        createdAt: String(existingAttendance.createdAt ?? checkInAt),
        updatedAt: now,
        source: "lift_log"
      },
      { merge: true }
    )
  ]);
}

export const logLiftSetMobile = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const memberId = asString(request.data?.memberId, "Member");
  const exerciseId = asString(request.data?.exerciseId, "Exercise");
  const reps = asString(request.data?.reps, "Reps");
  const weight = Number(request.data?.weightKg ?? 0);
  const sets = Math.max(1, Number(request.data?.sets ?? 1));
  const sessionId = optionalString(request.data?.sessionId) || randomUUID();

  await assertCanWriteForMember(user, memberId);

  const gymId = user.role === "admin"
    ? (optionalString(request.data?.targetGymId) || user.gymId || primaryGymId)
    : (user.gymId || primaryGymId);

  const liftLogId = randomUUID();
  const now = new Date().toISOString();
  const liftLogRecord = {
    id: liftLogId, gymId, memberId, exerciseId, weight, sets, reps, sessionId,
    loggedAt: now, createdAt: now, updatedAt: now
  };

  await Promise.all([
    gymDoc(gymId, "liftLogs", liftLogId).set(liftLogRecord, { merge: true }),
    upsertImplicitWorkoutAttendance(gymId, memberId, now)
  ]);

  return { status: "success", message: "Lift entry was logged.", data: { liftLogId, gymId, sessionId } };
});

export const syncOfflineLiftsMobile = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const logs = Array.isArray(request.data?.logs) ? request.data.logs : [];
  if (logs.length === 0) {
    throw new HttpsError("invalid-argument", "No offline lifts to sync.");
  }
  if (user.role === "member") {
    for (const log of logs) {
      await assertCanWriteForMember(user, String(log?.memberId ?? ""));
    }
  }

  const batch = db.batch();
  const now = new Date().toISOString();
  const sessionSummaries = new Map<string, {
    gymId: string; memberId: string; sessionId: string; startedAt: string; endedAt: string;
  }>();

  logs.forEach((log: Record<string, unknown>, index: number) => {
    const gymId = String(log.gymId ?? user.gymId ?? primaryGymId);
    const source = String(
      log.id ?? log.offlineId ??
      `${log.sessionId ?? "offline"}_${log.memberId ?? "member"}_${log.exerciseId ?? "exercise"}_${log.loggedAt ?? now}_${index}`
    );
    const liftLogId = source.replace(/[/#?[\]]/g, "_");
    const sessionId = String(log.sessionId || liftLogId);
    const loggedAt = String(log.loggedAt || now);
    const memberId = String(log.memberId ?? "");

    batch.set(
      gymDoc(gymId, "liftLogs", liftLogId),
      {
        id: liftLogId, gymId, memberId, exerciseId: log.exerciseId,
        weight: Number(log.weight), sets: Number(log.sets), reps: log.reps,
        sessionId, loggedAt, createdAt: now, updatedAt: now
      },
      { merge: true }
    );

    const dailySessionId = dailyWorkoutSessionId(memberId, loggedAt);
    const sessionKey = `${gymId}:${dailySessionId}`;
    const existingSummary = sessionSummaries.get(sessionKey);
    sessionSummaries.set(sessionKey, {
      gymId, memberId, sessionId: dailySessionId,
      startedAt: existingSummary && existingSummary.startedAt < loggedAt ? existingSummary.startedAt : loggedAt,
      endedAt: existingSummary && existingSummary.endedAt > loggedAt ? existingSummary.endedAt : loggedAt
    });
  });

  for (const summary of sessionSummaries.values()) {
    batch.set(
      gymDoc(summary.gymId, "workoutSessions", summary.sessionId),
      {
        id: summary.sessionId, gymId: summary.gymId, memberId: summary.memberId,
        startedAt: summary.startedAt, endedAt: summary.endedAt, status: "completed",
        updatedAt: now, attendanceSource: "offline_lift_sync"
      },
      { merge: true }
    );
    batch.set(
      gymDoc(summary.gymId, "attendanceRecords", summary.sessionId),
      {
        id: summary.sessionId, memberId: summary.memberId, gymId: summary.gymId,
        sessionId: summary.sessionId, checkInAt: summary.startedAt, checkOutAt: summary.endedAt,
        latitude: null, longitude: null, distanceMeters: null,
        geofenceStatus: "location_not_provided", updatedAt: now, source: "offline_lift_sync"
      },
      { merge: true }
    );
  }

  await batch.commit();

  return { status: "success", message: `${logs.length} offline lift(s) synced.` };
});

export const logBodyWeightMobile = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const weightKg = Number(request.data?.weightKg);
  if (!Number.isFinite(weightKg) || weightKg < 10 || weightKg > 500) {
    throw new HttpsError("invalid-argument", "Weight must be between 10 kg and 500 kg.");
  }
  const bodyFatPctRaw = request.data?.bodyFatPct;
  const bodyFatPct = bodyFatPctRaw === undefined || bodyFatPctRaw === null || bodyFatPctRaw === ""
    ? undefined
    : Number(bodyFatPctRaw);
  if (bodyFatPct !== undefined && (!Number.isFinite(bodyFatPct) || bodyFatPct < 1 || bodyFatPct > 70)) {
    throw new HttpsError("invalid-argument", "Body fat % must be between 1 and 70.");
  }
  const notes = optionalString(request.data?.notes);
  const memberId = optionalString(request.data?.memberId) || user.memberId || user.uid;

  await assertCanWriteForMember(user, memberId);

  const gymId = user.gymId || primaryGymId;
  const now = new Date().toISOString();
  const id = randomUUID();

  await gymDoc(gymId, "bodyMetricLogs", id).set(
    {
      id, memberId, gymId, weightKg,
      ...(bodyFatPct !== undefined ? { bodyFatPct } : {}),
      ...(notes ? { notes } : {}),
      loggedAt: now, createdAt: now
    },
    { merge: true }
  );

  // Best-effort mirror onto the profile doc so dashboards see the current
  // weight without a join — chart still works from bodyMetricLogs if this fails.
  try {
    await gymDoc(gymId, "members", memberId).set(
      { id: memberId, weightKg, updatedAt: now },
      { merge: true }
    );
  } catch (err) {
    console.error("[logBodyWeightMobile] profile mirror failed (non-fatal):", err);
  }

  return { status: "success", message: `Weight ${weightKg} kg logged.`, data: { gymId } };
});

export const clearDayLogMobile = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const dayId = asString(request.data?.dayId, "Day");
  const weekStart = asString(request.data?.weekStart, "Week start");
  const memberId = optionalString(request.data?.memberId) || user.memberId || user.uid;

  await assertCanWriteForMember(user, memberId);

  const gymId = user.gymId || primaryGymId;
  const docId = `${memberId}_${dayId}_${weekStart}`;

  await Promise.all([
    db.collection("dayLogs").doc(docId).delete(),
    gymDoc(gymId, "dayLogs", docId).delete()
  ]);

  return { status: "success", message: "Day log cleared." };
});

export const registerPushTokenMobile = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const expoPushToken = asString(request.data?.expoPushToken, "Push token");

  await db.collection("authProfiles").doc(user.uid).set(
    { expoPushToken, expoPushTokenUpdatedAt: new Date().toISOString() },
    { merge: true }
  );

  return { status: "success", message: "Push token registered." };
});

export const logMealMobile = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const memberId = asString(request.data?.memberId, "Member");
  const date = asString(request.data?.date, "Date");
  const name = asString(request.data?.name, "Meal name");
  const items = optionalString(request.data?.items);
  const kcal = Number(request.data?.kcal ?? 0);
  const protein = Number(request.data?.protein ?? 0);
  const carbs = Number(request.data?.carbs ?? 0);
  const fat = Number(request.data?.fat ?? 0);
  for (const [label, value] of [["Calories", kcal], ["Protein", protein], ["Carbs", carbs], ["Fat", fat]] as const) {
    if (!Number.isFinite(value) || value < 0) {
      throw new HttpsError("invalid-argument", `${label} must be a non-negative number.`);
    }
  }

  await assertCanWriteForMember(user, memberId);

  const gymId = user.gymId || primaryGymId;
  const now = new Date().toISOString();
  const mealId = randomUUID();

  await gymDoc(gymId, "mealLogs", mealId).set(
    { id: mealId, memberId, gymId, date, name, items, kcal, protein, carbs, fat, loggedAt: now },
    { merge: true }
  );

  const macroDocId = `${memberId}_${date}`;
  await gymDoc(gymId, "macroLogs", macroDocId).set(
    {
      id: macroDocId, memberId, gymId, date,
      protein: FieldValue.increment(protein),
      carbs: FieldValue.increment(carbs),
      fat: FieldValue.increment(fat),
      water: FieldValue.increment(0),
      updatedAt: now
    },
    { merge: true }
  );

  return { status: "success", message: "Meal logged.", data: { gymId, mealId } };
});
