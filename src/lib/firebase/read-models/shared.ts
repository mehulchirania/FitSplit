import * as Sentry from "@sentry/nextjs";

import type {
  GymWorkspace,
  GymNotice,
  GymNoticeType,
  Member,
  TrainerMemberVisibility
} from "@/types/domain";

import { collectionPaths, gymCollectionPath, gymScopedCollectionPaths, PRIMARY_GYM_ID } from "../collections";
import { getFirebaseAdminServices } from "../admin";

export type FirestoreDb = ReturnType<typeof getFirebaseAdminServices>["db"];

export function gymCollection(db: FirestoreDb, gymId: string, collection: Parameters<typeof gymCollectionPath>[1]) {
  return db.collection(gymCollectionPath(gymId, collection));
}

export function mapProfileToMember(docId: string, data: Record<string, unknown>): Member {
  const name = String(data.fullName ?? "");
  const username =
    String(data.username ?? "").trim() ||
    String(data.phone ?? "").trim() ||
    String(data.email ?? "").trim() ||
    undefined;

  return {
    id: docId,
    fullName: name,
    email: String(data.email ?? ""),
    phone: String(data.phone ?? ""),
    joinedAt: String(data.joinedAt ?? data.createdAt ?? new Date().toISOString().slice(0, 10)),
    avatarInitials: String(data.avatarInitials ?? (name.split(" ").map((p) => p[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "MB")),
    avatarUrl: data.avatarUrl ? String(data.avatarUrl) : undefined,
    goal: String(data.goal ?? "General fitness"),
    staffType: data.staffType ? String(data.staffType) as Member["staffType"] : undefined,
    isActive: data.isActive !== false,
    username,
    // Phase 1 — trainer-aware fields
    isPT: data.isPT === true,
    assignedTrainerId: data.assignedTrainerId ? String(data.assignedTrainerId) : undefined,
    membershipStatus: data.membershipStatus ? String(data.membershipStatus) as Member["membershipStatus"] : undefined,
    membershipEndDate: data.membershipEndDate ? String(data.membershipEndDate) : undefined,
    currentPackageName: data.currentPackageName ? String(data.currentPackageName) : undefined
  };
}

export async function getMemberProfileDocument(db: FirestoreDb, memberId: string) {
  const authDoc = await db.collection(collectionPaths.authProfiles).doc(memberId).get();
  const authData = authDoc.data() ?? {};
  const gymId = String(authData.defaultGymId ?? authData.gymId ?? "").trim();

  if (gymId) {
    const scopedDoc = await db.collection(gymCollectionPath(gymId, "members")).doc(memberId).get();
    if (scopedDoc.exists) return scopedDoc;
  }

  if (authDoc.exists) return authDoc;

  const legacyDoc = await db.collection(collectionPaths.profiles).doc(memberId).get();
  if (legacyDoc.exists) return legacyDoc;

  try {
    const scopedSnapshot = await db
      .collectionGroup(gymScopedCollectionPaths.members)
      .where("id", "==", memberId)
      .limit(1)
      .get();

    if (!scopedSnapshot.empty) {
      return scopedSnapshot.docs[0];
    }
  } catch {
    // Collection-group indexes can lag in local/dev projects. Direct profile
    // lookups above are the canonical path; this is only a compatibility scan.
  }

  return authDoc;
}

function normalizeGymStatus(status: unknown): GymWorkspace["status"] {
  const value = String(status ?? "active");
  if (value === "paused" || value === "inactive") {
    return value;
  }
  return "active";
}

export function mapWorkspace(docId: string, data: Record<string, unknown>): GymWorkspace {
  const rawNotices = Array.isArray(data.notices) ? data.notices : [];
  const notices: GymNotice[] = rawNotices
    .filter((n): n is Record<string, unknown> => n != null && typeof n === "object")
    .map((n, i): GymNotice => ({
      id: String(n.id ?? `notice-${i}`),
      type: (["rule", "tip", "reminder", "announcement"] as const).includes(n.type as GymNoticeType)
        ? (n.type as GymNoticeType)
        : "tip",
      title: String(n.title ?? ""),
      body: n.body ? String(n.body) : undefined,
      isActive: n.isActive !== false,
      order: Number(n.order ?? i),
      createdAt: String(n.createdAt ?? ""),
    }))
    .filter((n) => n.title && n.isActive)
    .sort((a, b) => a.order - b.order);

  return {
    id: docId,
    name: String(data.name ?? "Stored gym"),
    slug: String(data.slug ?? docId),
    ownerName: String(data.ownerName ?? "Gym owner"),
    ownerUserId: String(data.ownerUserId ?? ""),
    status: normalizeGymStatus(data.status),
    expiryWarningDays: Number(data.expiryWarningDays ?? 7),
    memberCount: Number(data.memberCount ?? 0),
    logoUrl: data.logoUrl ? String(data.logoUrl) : docId === PRIMARY_GYM_ID ? "/shg-gym-logo.jpeg" : undefined,
    logoPath: data.logoPath ? String(data.logoPath) : undefined,
    location: data.location ? String(data.location) : undefined,
    locationUrl: data.locationUrl
      ? String(data.locationUrl)
      : docId === PRIMARY_GYM_ID
        ? "https://maps.app.goo.gl/Vo99C5szeTzyQKPo9"
        : undefined,
    phone: data.phone ? String(data.phone) : undefined,
    email: data.email ? String(data.email) : undefined,
    instagram: data.instagram ? String(data.instagram) : undefined,
    linkedin: data.linkedin ? String(data.linkedin) : undefined,
    youtube: data.youtube ? String(data.youtube) : undefined,
    latitude: data.latitude != null ? Number(data.latitude) : undefined,
    longitude: data.longitude != null ? Number(data.longitude) : undefined,
    radiusMeters: data.radiusMeters != null ? Number(data.radiusMeters) : undefined,
    notices: notices.length > 0 ? notices : undefined,
    // Phase 1 — trainer-aware gym fields
    ownerId: data.ownerId ? String(data.ownerId) : undefined,
    trainerMemberVisibility: (["assigned_only", "all_pt_members", "all_members"] as TrainerMemberVisibility[]).includes(
      data.trainerMemberVisibility as TrainerMemberVisibility
    )
      ? (data.trainerMemberVisibility as TrainerMemberVisibility)
      : undefined,
    subscription: data.subscription && typeof data.subscription === "object"
      ? {
          tier: String((data.subscription as Record<string, unknown>).tier ?? "free"),
          billedUntil: (data.subscription as Record<string, unknown>).billedUntil
            ? String((data.subscription as Record<string, unknown>).billedUntil)
            : undefined,
          stripeCustomerId: (data.subscription as Record<string, unknown>).stripeCustomerId
            ? String((data.subscription as Record<string, unknown>).stripeCustomerId)
            : undefined,
        }
      : undefined,
    limits: data.limits && typeof data.limits === "object"
      ? {
          maxMembers: (data.limits as Record<string, unknown>).maxMembers != null
            ? Number((data.limits as Record<string, unknown>).maxMembers)
            : undefined,
          maxStorage: (data.limits as Record<string, unknown>).maxStorage != null
            ? Number((data.limits as Record<string, unknown>).maxStorage)
            : undefined,
        }
      : undefined,
    isPubliclyListed: data.isPubliclyListed === true,
    publicListing: data.publicListing && typeof data.publicListing === "object"
      ? {
          description: String((data.publicListing as Record<string, unknown>).description ?? ""),
          city: String((data.publicListing as Record<string, unknown>).city ?? ""),
          coverImageUrl: (data.publicListing as Record<string, unknown>).coverImageUrl
            ? String((data.publicListing as Record<string, unknown>).coverImageUrl)
            : undefined,
        }
      : undefined,
  };
}

/** No-op pass-through kept for backward compat — title override was removed. */
export function gymTag(gymId?: string, collection?: string) {
  const base = gymId ? `gym:${gymId}` : "gym:default";
  return collection ? `${base}:${collection}` : base;
}

/**
 * Reports a caught read-model query failure to Sentry and the server console.
 *
 * Read-models intentionally fail soft (catch → return an empty/default result)
 * so pages keep rendering on a bad query instead of crashing. That resilience
 * previously made hard failures (e.g. `FAILED_PRECONDITION: requires an index`)
 * indistinguishable from "no data" — nothing ever alerted. Call this from every
 * catch block that swallows a Firestore error so the failure is still visible,
 * without changing what the function returns to its caller.
 */
export function reportReadModelError(
  readModel: string,
  error: unknown,
  context?: { gymId?: string; memberId?: string; [key: string]: string | undefined }
) {
  console.error(`[read-model:${readModel}] query failed`, error);

  const tags: Record<string, string> = { readModel };
  if (context) {
    for (const [key, value] of Object.entries(context)) {
      if (value) tags[key] = value;
    }
  }

  Sentry.captureException(error instanceof Error ? error : new Error(String(error)), { tags });
}
