import { randomUUID } from "crypto";
import { revalidateTag } from "next/cache";
import { requireAuth, requireRole } from "@/lib/auth";
import { collectionPaths, gymCollectionPath, gymProfileCollectionKey, PRIMARY_GYM_ID } from "../collections";
import { getAdminMessaging, getFirebaseAdminServices, hasFirebaseAdminConfig } from "../admin";
import type { FormActionState } from "@/types/action-state";
import type { GymWorkspace, Role } from "@/types/domain";

export function requireFirebase() {
  if (!hasFirebaseAdminConfig()) {
    throw new Error(
      "Firebase Admin is not configured. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY in .env.local."
    );
  }

  return getFirebaseAdminServices().db;
}

export function requireFirebaseServices() {
  if (!hasFirebaseAdminConfig()) {
    throw new Error(
      "Firebase Admin is not configured. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY in .env.local."
    );
  }

  return getFirebaseAdminServices();
}

export function requireText(formData: FormData, key: string, label = key) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${label} is required.`);
  }

  return value;
}

export function assertValidEmail(email: string, label = "Email") {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`${label} is invalid.`);
  }
}

export function assertValidPhone(phone: string, label = "Mobile number") {
  const compact = phone.replace(/[\s-]/g, "");
  if (!/^(\+91)?[6-9]\d{9}$/.test(compact)) {
    throw new Error(`${label} is invalid.`);
  }
}

export function assertValidPin(pin: string) {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error("PIN must be exactly 4 numeric digits.");
  }
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function assertValidUsername(username: string) {
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw new Error("Username must be 3-32 characters using letters, numbers, dots, underscores, or hyphens.");
  }
}

export async function assertUsernameAvailable(
  db: ReturnType<typeof getFirebaseAdminServices>["db"],
  username: string,
  exceptProfileId?: string
) {
  const normalized = normalizeUsername(username);
  const snapshot = await db.collection(collectionPaths.authProfiles).where("username", "==", normalized).limit(2).get();
  const conflict = snapshot.docs.find((doc) => doc.id !== exceptProfileId);
  if (conflict) {
    throw new Error("That username is already in use.");
  }
}

export function normalizeGymStatusInput(value: FormDataEntryValue | null) {
  const status = String(value ?? "active");
  if (status === "paused" || status === "inactive") {
    return status;
  }
  return "active";
}

export function parsePngDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!match?.[1]) {
    throw new Error("Logo must be saved as a PNG preview before uploading.");
  }

  const buffer = Buffer.from(match[1], "base64");
  if (buffer.byteLength > 900_000) {
    throw new Error("Logo is too large. Use the cropper preview before saving.");
  }

  return buffer;
}

export function memberAuthEmail(memberId: string) {
  return `${memberId}@members.fitsplit.app`;
}

export async function upsertAuthUser(
  auth: ReturnType<typeof getFirebaseAdminServices>["auth"],
  user: { email: string; fullName: string; uid: string; role: Role; gymId: string; isActive: boolean },
  defaultPassword = "password",
  forceResetPassword = false
) {
  try {
    const updateData: {
      email: string;
      displayName: string;
      disabled: boolean;
      password?: string;
    } = {
      email: user.email,
      displayName: user.fullName,
      disabled: !user.isActive
    };

    if (forceResetPassword) {
      updateData.password = defaultPassword;
    }

    await auth.updateUser(user.uid, updateData);
  } catch (error: unknown) {
    const errorCode =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";
    if (errorCode === "auth/user-not-found") {
      await auth.createUser({
        uid: user.uid,
        email: user.email,
        emailVerified: true,
        displayName: user.fullName,
        password: defaultPassword,
        disabled: !user.isActive
      });
    } else {
      throw error;
    }
  }

  await auth.setCustomUserClaims(user.uid, {
    gymId: user.gymId,
    role: user.role,
    ...(user.role === "member" ? { memberId: user.uid } : {})
  });
}

export function getActionFormData(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
) {
  return maybeFormData ?? (previousStateOrFormData as FormData);
}

export type GymCacheCollection =
  | "activity"
  | "body-metrics"
  | "contact"
  | "day-logs"
  | "exercises"
  | "gyms"
  | "lift-logs"
  | "members"
  | "notifications"
  | "programs"
  | "pt-lift-logs"
  | "pt-sessions"
  | "sessions"
  | "staff";

const DEFAULT_GYM_CACHE_COLLECTIONS: GymCacheCollection[] = [
  "activity",
  "exercises",
  "gyms",
  "members",
  "notifications",
  "programs",
  "pt-sessions",
  "sessions",
  "staff"
];

export function revalidateGymTags(gymId?: string, collections: GymCacheCollection[] = DEFAULT_GYM_CACHE_COLLECTIONS) {
  try {
    if (gymId) {
      collections.forEach((collection) => revalidateTag(`gym:${gymId}:${collection}`));
    } else {
      collections.forEach((collection) => revalidateTag(collection));
    }
  } catch {
    // revalidateTag is a noop outside a request context.
  }
}

export function success(
  message: string,
  gymId?: string,
  collections?: GymCacheCollection[]
): FormActionState {
  // Bust only the collection caches touched by this action. This avoids
  // invalidating every cached read for every gym after a small write.
  revalidateGymTags(gymId, collections);
  return { status: "success", message };
}

export function failure(error: unknown, fallback: string): FormActionState {
  // redirect() throws Error("NEXT_REDIRECT") — let it propagate so Next.js can actually redirect.
  if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
  return {
    status: "error",
    message: error instanceof Error ? error.message : fallback
  };
}

export function scopedGymDoc(db: ReturnType<typeof getFirebaseAdminServices>["db"], gymId: string, collection: Parameters<typeof gymCollectionPath>[1], docId: string) {
  return db.collection(gymCollectionPath(gymId, collection)).doc(docId);
}

export function archiveRetentionDate() {
  return new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
}

export async function archiveDocumentSnapshot(
  db: ReturnType<typeof getFirebaseAdminServices>["db"],
  snapshot: FirebaseFirestore.DocumentSnapshot,
  options: {
    entityType: string;
    deletedBy: string;
    gymId?: string;
    reason?: string;
  }
) {
  if (!snapshot.exists) return;
  const now = new Date().toISOString();
  const archiveId = `${options.entityType}_${snapshot.id}_${Date.now()}_${randomUUID().slice(0, 8)}`;
  await db.collection(collectionPaths.archives).doc(archiveId).set({
    id: archiveId,
    entityType: options.entityType,
    originalId: snapshot.id,
    originalPath: snapshot.ref.path,
    gymId: options.gymId ?? snapshot.get("gymId") ?? snapshot.get("defaultGymId") ?? null,
    reason: options.reason ?? "deleted",
    deletedBy: options.deletedBy,
    archivedAt: now,
    retentionDays: 60,
    retentionExpiresAt: archiveRetentionDate(),
    data: snapshot.data()
  });
}

export async function archiveQuerySnapshot(
  db: ReturnType<typeof getFirebaseAdminServices>["db"],
  snapshot: FirebaseFirestore.QuerySnapshot,
  options: {
    entityType: string;
    deletedBy: string;
    gymId?: string;
    reason?: string;
  }
) {
  await Promise.all(
    snapshot.docs.map((doc) =>
      archiveDocumentSnapshot(db, doc, {
        ...options,
        entityType: options.entityType
      })
    )
  );
}

export async function deleteSnapshotsInBatches(
  db: ReturnType<typeof getFirebaseAdminServices>["db"],
  snapshots: FirebaseFirestore.QueryDocumentSnapshot[]
) {
  for (let i = 0; i < snapshots.length; i += 450) {
    const batch = db.batch();
    snapshots.slice(i, i + 450).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

export async function archiveAndDeleteGymSubcollections(
  db: ReturnType<typeof getFirebaseAdminServices>["db"],
  gymId: string,
  deletedBy: string,
  reason: string
) {
  const gymRef = db.collection(collectionPaths.gyms).doc(gymId);
  const subcollections = await gymRef.listCollections();

  for (const subcollection of subcollections) {
    const snapshot = await subcollection.get();
    await archiveQuerySnapshot(db, snapshot, {
      entityType: `gymScoped:${subcollection.id}`,
      deletedBy,
      gymId,
      reason
    });
    await deleteSnapshotsInBatches(db, snapshot.docs);
  }
}

export async function mirrorProfileToGym(
  db: ReturnType<typeof getFirebaseAdminServices>["db"],
  profileId: string,
  profile: Record<string, unknown>
) {
  const gymId = String(profile.defaultGymId ?? profile.gymId ?? PRIMARY_GYM_ID);
  const collectionKey = gymProfileCollectionKey(String(profile.role ?? ""));
  await scopedGymDoc(db, gymId, collectionKey, profileId).set(
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

export function authProfilePayload(profileId: string, profile: Record<string, unknown>) {
  const gymId = String(profile.defaultGymId ?? profile.gymId ?? PRIMARY_GYM_ID);
  const role = String(profile.role ?? "member");
  return {
    id: String(profile.id ?? profileId),
    authUid: String(profile.authUid ?? profile.uid ?? profileId),
    email: String(profile.email ?? ""),
    authEmail: String(profile.authEmail ?? profile.email ?? ""),
    username: profile.username ? String(profile.username) : "",
    phone: profile.phone ? String(profile.phone) : "",
    fullName: String(profile.fullName ?? "FitSplit user"),
    role,
    staffType: profile.staffType ? String(profile.staffType) : "",
    defaultGymId: gymId,
    gymId,
    isActive: profile.isActive !== false,
    mustChangePassword: profile.mustChangePassword === true,
    authIndexOnly: true,
    updatedAt: String(profile.updatedAt ?? new Date().toISOString())
  };
}

export async function writeAuthProfileIndex(
  db: ReturnType<typeof getFirebaseAdminServices>["db"],
  profileId: string,
  profile: Record<string, unknown>
) {
  await db.collection(collectionPaths.authProfiles).doc(profileId).set(authProfilePayload(profileId, profile), { merge: true });
}

export async function getAuthProfileDoc(db: ReturnType<typeof getFirebaseAdminServices>["db"], profileId: string) {
  const authDoc = await db.collection(collectionPaths.authProfiles).doc(profileId).get();
  if (authDoc.exists) return authDoc;
  return db.collection(collectionPaths.profiles).doc(profileId).get();
}

export async function getGymScopedProfileDoc(
  db: ReturnType<typeof getFirebaseAdminServices>["db"],
  profileId: string,
  role?: string,
  gymId?: string
) {
  if (gymId && role) {
    const directDoc = await scopedGymDoc(db, gymId, gymProfileCollectionKey(role), profileId).get();
    if (directDoc.exists) return directDoc;
  }

  const memberSnapshot = await db.collectionGroup("members").where("id", "==", profileId).limit(1).get();
  if (!memberSnapshot.empty) return memberSnapshot.docs[0];

  const staffSnapshot = await db.collectionGroup("staff").where("id", "==", profileId).limit(1).get();
  if (!staffSnapshot.empty) return staffSnapshot.docs[0];

  return getAuthProfileDoc(db, profileId);
}

export async function mirrorGymScopedRecord(
  db: ReturnType<typeof getFirebaseAdminServices>["db"],
  gymId: string,
  collection: Exclude<Parameters<typeof gymCollectionPath>[1], "members" | "staff">,
  docId: string,
  data: Record<string, unknown>
) {
  await scopedGymDoc(db, gymId, collection, docId).set(
    {
      ...data,
      id: String(data.id ?? docId),
      gymId,
      mirroredFromRootCollection: true
    },
    { merge: true }
  );
}

export type GymGeofenceConfig = Pick<GymWorkspace, "latitude" | "longitude" | "radiusMeters">;

export function distanceInMeters(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const radius = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function validateGymGeofence(
  latitude: number,
  longitude: number,
  gymConfig?: GymGeofenceConfig
) {
  const gymLatitude = Number(
    gymConfig?.latitude ??
      process.env.SHG_GYM_LATITUDE ??
      process.env.NEXT_PUBLIC_SHG_GYM_LATITUDE
  );
  const gymLongitude = Number(
    gymConfig?.longitude ??
      process.env.SHG_GYM_LONGITUDE ??
      process.env.NEXT_PUBLIC_SHG_GYM_LONGITUDE
  );
  const radiusMeters = Number(
    gymConfig?.radiusMeters ??
      process.env.SHG_GYM_RADIUS_METERS ??
      process.env.NEXT_PUBLIC_SHG_GYM_RADIUS_METERS ??
      150
  );

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Location permission is required to start workout attendance.");
  }

  if (!Number.isFinite(gymLatitude) || !Number.isFinite(gymLongitude)) {
    return {
      distanceMeters: null,
      geofenceStatus: "not_configured" as const,
      radiusMeters
    };
  }

  const distanceMeters = distanceInMeters(gymLatitude, gymLongitude, latitude, longitude);

  if (distanceMeters > radiusMeters) {
    throw new Error(`You must be inside the gym radius to check in. Current distance is ${Math.round(distanceMeters)}m.`);
  }

  return {
    distanceMeters: Math.round(distanceMeters),
    geofenceStatus: "inside" as const,
    radiusMeters
  };
}

export async function getGymGeofenceConfig(gymId: string): Promise<GymGeofenceConfig> {
  try {
    const db = requireFirebase();
    const gymDoc = await db.collection(collectionPaths.gyms).doc(gymId).get();
    const data = gymDoc.data() ?? {};

    return {
      latitude: data.latitude != null ? Number(data.latitude) : undefined,
      longitude: data.longitude != null ? Number(data.longitude) : undefined,
      radiusMeters: data.radiusMeters != null ? Number(data.radiusMeters) : undefined
    };
  } catch {
    return {};
  }
}

export function assertCanManageMember(
  user: Awaited<ReturnType<typeof requireAuth>>,
  memberId: string
) {
  if (user.role === "member" && user.memberId !== memberId) {
    throw new Error("You can only update your own member account.");
  }
}

/**
 * Stronger guard for owner/trainer/staff actions that target a memberId.
 * Verifies the member actually belongs to the calling user's gym.
 * Admin bypasses the check. Members can only act on themselves (same as the
 * sync helper above).
 *
 * Use this in any owner-side action where memberId comes from FormData,
 * since a malicious client can put any UUID in there.
 */
export async function assertMemberBelongsToCallerGym(
  user: Awaited<ReturnType<typeof requireAuth>>,
  memberId: string
) {
  assertCanManageMember(user, memberId);
  if (user.role === "admin") return;
  if (user.role === "member") return; // already covered by sync check above
  if (!user.gymId) {
    throw new Error("Your account is not assigned to a gym.");
  }
  if (!hasFirebaseAdminConfig()) return; // mock mode — no Firestore to check
  const db = requireFirebase();
  const profile = await getAuthProfileDoc(db, memberId);
  if (!profile.exists) {
    throw new Error("Member not found.");
  }
  const profileData = profile.data() ?? {};
  const profileGymId = profileData.defaultGymId ?? profileData.gymId;
  if (profileGymId !== user.gymId) {
    throw new Error("This member is not part of your gym.");
  }
}

export function assertCanManageGym(user: Awaited<ReturnType<typeof requireAuth>>, gymId: string) {
  if (user.role === "admin") {
    return;
  }

  if (user.role === "owner" && user.gymId === gymId) {
    return;
  }

  throw new Error("You can only manage records for your assigned gym.");
}

export function slugifyGymName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/**
 * Guards PT-mutation actions.
 * Accepts admin or any gym staff regardless of staffType so that any trainer
 * (or the owner) can cover a session when the assigned trainer is unavailable.
 */
export async function requireGymStaff() {
  // requireRole(["admin", "owner"]) already allows every role=="owner" user —
  // which includes staffType owner/trainer/staff — without the extra staffType
  // check that requireOwner() adds.
  return requireRole(["admin", "owner"]);
}

export function parsePTPlannedExercises(raw: string) {
  if (!raw.trim()) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Planned exercises are invalid.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Planned exercises are invalid.");
  }

  return parsed.map((item, index) => {
    const entry = item as Record<string, unknown>;
    const exerciseId = String(entry.exerciseId ?? "").trim();
    if (!exerciseId) {
      throw new Error(`Exercise ${index + 1} is missing an exercise.`);
    }

    const sets = Number(entry.sets ?? 3);
    const reps = String(entry.reps ?? "8-12").trim();
    const notes = String(entry.notes ?? "").trim();
    if (!Number.isFinite(sets) || sets < 1 || sets > 20) {
      throw new Error(`Sets for exercise ${index + 1} must be between 1 and 20.`);
    }
    if (!reps) {
      throw new Error(`Reps for exercise ${index + 1} are required.`);
    }

    return {
      exerciseId,
      sets,
      reps,
      ...(notes ? { notes } : {})
    };
  });
}

/**
 * Sends a push notification to a single member via FCM.
 * Silently no-ops if the member has no FCM token or if Admin Messaging is unavailable.
 * Never throws — notification failure must not break the parent flow.
 */
export async function sendPushToMember(
  db: FirebaseFirestore.Firestore,
  memberId: string,
  title: string,
  body: string,
  url?: string
): Promise<void> {
  try {
    const profileSnap = await db.collection(collectionPaths.authProfiles).doc(memberId).get();
    const token = String(profileSnap.data()?.fcmToken ?? "").trim();
    if (!token) return;

    const messaging = getAdminMessaging();
    await messaging.send({
      token,
      notification: { title, body },
      webpush: {
        notification: {
          title,
          body,
          icon: "/apple-touch-icon.png",
          badge: "/favicon-32x32.png",
          data: { url: url ?? "/member" }
        },
        fcmOptions: { link: url ?? "/member" }
      }
    });
  } catch (err: unknown) {
    // D14: Use console.error (not warn) so production error monitoring picks it up.
    // If the token is stale/unregistered, delete it to avoid wasting future FCM calls.
    const errorCode = (err as { errorInfo?: { code?: string } })?.errorInfo?.code ?? "";
    const isStaleToken =
      errorCode === "messaging/registration-token-not-registered" ||
      errorCode === "messaging/invalid-registration-token";

    if (isStaleToken) {
      console.error(`[FCM] Stale token for member ${memberId} — removing from profile. Code: ${errorCode}`);
      try {
        await db.collection(collectionPaths.authProfiles).doc(memberId).update({ fcmToken: "" });
      } catch (cleanupErr) {
        console.error(`[FCM] Failed to clear stale token for member ${memberId}:`, cleanupErr);
      }
    } else {
      // Unexpected error — log with full context for production monitoring.
      console.error(`[FCM] Push failed for member ${memberId}. Code: ${errorCode}`, err);
    }
  }
}
