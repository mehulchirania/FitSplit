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

initializeApp();

const db = getFirestore();
const auth = getAuth();
const messaging = getMessaging();
const storage = getStorage();
const region = "asia-south1";
const primaryGymId = "shg";

type Role = "admin" | "owner" | "member";
type StaffType = "owner" | "trainer" | "staff";

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
  if (!["admin", "owner", "member"].includes(role)) {
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
    const token = String(profile.get("fcmToken") ?? "");
    if (!token) return;

    await messaging.send({
      token,
      notification: { title, body },
      webpush: {
        fcmOptions: { link: url }
      }
    });
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
    ...(params.memberId ? { memberId: params.memberId } : {})
  });
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

  await createAuthUser({
    uid: staffId,
    email: authEmail,
    fullName,
    password: "password",
    role: "owner",
    gymId,
    isActive: true
  });

  const staffProfile = {
    id: staffId,
    fullName,
    email,
    phone,
    authEmail,
    username: phone,
    role: "owner",
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
  if (!slug) {
    throw new HttpsError("invalid-argument", "Gym slug is invalid.");
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
  if (email) assertEmail(email, "Contact email");

  await db.collection("gyms").doc(gymId).set(
    {
      name,
      location: optionalString(request.data?.location),
      phone: optionalString(request.data?.phone),
      email,
      instagram: optionalString(request.data?.instagram),
      linkedin: optionalString(request.data?.linkedin),
      youtube: optionalString(request.data?.youtube),
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
export const blockLockedAccounts = beforeUserSignedIn(
  { region },
  async (event) => {
    const email = event.data?.email?.toLowerCase().trim();
    if (!email) return; // no email → nothing to check

    try {
      const lockDoc = await db.collection("loginAttempts").doc(email).get();
      const data = lockDoc.data();
      if (!data) return; // no attempts recorded → allow

      const { lockedUntil } = data as { lockedUntil?: string };
      if (!lockedUntil) return; // not locked → allow

      const lockExpiry = new Date(lockedUntil).getTime();
      if (Date.now() >= lockExpiry) return; // lock expired → allow

      const minutesRemaining = Math.ceil((lockExpiry - Date.now()) / 60_000);
      throw new HttpsError(
        "resource-exhausted",
        `Too many failed attempts. Try again in about ${minutesRemaining} minute${minutesRemaining === 1 ? "" : "s"}.`
      );
    } catch (err) {
      // Re-throw HttpsError (our intentional block) or unknown errors.
      // Never silently swallow the block.
      if ((err as { code?: string })?.code === "resource-exhausted") throw err;
      console.error("[blockLockedAccounts] Unexpected error during lockout check:", err);
      // Fail open on unexpected errors — don't block legitimate logins due to
      // a transient Firestore read failure.
    }
  }
);
