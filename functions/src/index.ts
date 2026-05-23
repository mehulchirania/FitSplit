import { randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

initializeApp();

const db = getFirestore();
const auth = getAuth();
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
  const profile = await db.collection("profiles").doc(memberId).get();
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
  const snapshot = await db.collection("profiles").where("username", "==", normalized).limit(2).get();
  const conflict = snapshot.docs.find((doc) => doc.id !== exceptProfileId);
  if (conflict) {
    throw new HttpsError("already-exists", "That username is already in use.");
  }
}

function gymDoc(gymId: string, collection: string, docId: string) {
  return db.collection(`gyms/${gymId}/${collection}`).doc(docId);
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
  const email = asString(request.data?.email, "Email").toLowerCase();
  const phone = optionalString(request.data?.phone);
  const username = normalizeUsername(asString(request.data?.username, "Username"));
  const goal = optionalString(request.data?.goal) || "General fitness";
  assertEmail(email);
  assertUsername(username);
  await assertUsernameAvailable(username);

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

    await db.collection("profiles").doc(memberId).set(memberProfile);
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
  const email = asString(request.data?.email, "Email").toLowerCase();
  const staffType = optionalString(request.data?.staffType) as StaffType || "owner";
  const normalizedStaffType: StaffType = ["owner", "trainer", "staff"].includes(staffType) ? staffType : "owner";
  assertEmail(email);

  const staffId = randomUUID();
  const now = new Date().toISOString();

  await createAuthUser({
    uid: staffId,
    email,
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
    authEmail: email,
    username: email,
    role: "owner",
    staffType: normalizedStaffType,
    defaultGymId: gymId,
    avatarInitials: profileInitials(fullName),
    isActive: true,
    mustChangePassword: true,
    createdAt: now,
    updatedAt: now
  };
  await db.collection("profiles").doc(staffId).set(staffProfile);
  await mirrorProfileToGym(staffId, staffProfile);

  return { status: "success", staffId, message: `${fullName} was added as gym ${normalizedStaffType}.` };
});

export const toggleMemberAccess = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const memberId = asString(request.data?.memberId, "Member ID");
  const isActive = Boolean(request.data?.isActive);
  const gymId = user.gymId || primaryGymId;
  assertCanManageGym(user, gymId);

  const { data } = await assertMemberBelongsToGym(memberId, gymId);
  const now = new Date().toISOString();
  await db.collection("profiles").doc(memberId).set({ isActive, updatedAt: now }, { merge: true });
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
  await db.collection("profiles").doc(userId).set({ mustChangePassword: true, updatedAt: new Date().toISOString() }, { merge: true });
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
    assignedAt: now,
    status: "active",
    createdBy: user.uid,
    createdAt: now,
    updatedAt: now
  };
  await db.collection("programAssignments").doc(assignmentId).set(assignment);
  await mirrorGymRecord(gymId, "programAssignments", assignmentId, assignment);

  const notificationId = randomUUID();
  const notification = {
    id: notificationId,
    recipientRole: "member",
    recipientId: memberId,
    gymId,
    type: "program_assigned",
    title: "Workout program assigned",
    body: `${programTitle} is now available in your weekly schedule.`,
    createdAt: now
  };
  await db.collection("notifications").doc(notificationId).set(notification);
  await mirrorGymRecord(gymId, "notifications", notificationId, notification);

  const activityId = randomUUID();
  const activity = {
    id: activityId,
    gymId,
    audience: "owner",
    title: `Program assigned - ${programTitle}`,
    detail: `${memberName} now has ${programTitle} as the active weekly schedule.`,
    icon: "dumbbell",
    createdAt: now
  };
  await db.collection("activityEvents").doc(activityId).set(activity);
  await mirrorGymRecord(gymId, "activityEvents", activityId, activity);

  return { status: "success", assignmentId, message: `${programTitle} was assigned to ${memberName}.` };
});

export const archiveMemberAccount = onCall({ region }, async (request) => {
  const user = getCallableUser(request);
  const memberId = asString(request.data?.memberId, "Member ID");
  const gymId = user.gymId || primaryGymId;
  assertCanManageGym(user, gymId);
  const { data } = await assertMemberBelongsToGym(memberId, gymId);

  const rootProfile = await db.collection("profiles").doc(memberId).get();
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

  const profiles = await db.collection("profiles").where("defaultGymId", "==", gymId).get();
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
    // Staff log in with their real email — just verify the profile exists and
    // has an owner/admin role.
    assertEmail(identifier, "Email");
    const snap = await db
      .collection("profiles")
      .where("email", "==", identifier)
      .where("role", "in", ["admin", "owner"])
      .limit(1)
      .get();
    if (snap.empty) {
      throw new HttpsError("not-found", "No staff account found for that email.");
    }
    return { email: identifier };
  }

  // Member mode: look up by username first, then by personal email.
  const byUsername = await db
    .collection("profiles")
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

  // Fall back to personal email lookup (some older accounts may have used email
  // as username).
  const byEmail = await db
    .collection("profiles")
    .where("email", "==", identifier)
    .where("role", "==", "member")
    .limit(1)
    .get();

  if (!byEmail.empty) {
    const data = byEmail.docs[0].data();
    if (data.isActive === false) {
      throw new HttpsError("permission-denied", "Your account has been suspended.");
    }
    return { email: String(data.authEmail ?? memberAuthEmail(byEmail.docs[0].id)) };
  }

  throw new HttpsError("not-found", "No account found for that username.");
});

export const purgeExpiredArchives = onSchedule({ region, schedule: "every 24 hours" }, async () => {
  const expired = await db.collection("archives").where("retentionExpiresAt", "<=", new Date()).limit(450).get();
  await deleteDocs(expired.docs);
});
