import type {
  GymWorkspace,
  GymNotice,
  GymNoticeType,
  Member,
  Notification
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
    goal: String(data.goal ?? "General fitness"),
    staffType: data.staffType ? String(data.staffType) as Member["staffType"] : undefined,
    isActive: data.isActive !== false,
    username
  };
}

export async function getMemberProfileDocument(db: FirestoreDb, memberId: string) {
  const scopedSnapshot = await db
    .collectionGroup(gymScopedCollectionPaths.members)
    .where("id", "==", memberId)
    .limit(1)
    .get();

  if (!scopedSnapshot.empty) {
    return scopedSnapshot.docs[0];
  }

  const legacyDoc = await db.collection(collectionPaths.profiles).doc(memberId).get();
  if (legacyDoc.exists) return legacyDoc;
  return db.collection(collectionPaths.authProfiles).doc(memberId).get();
}

export function normalizeGymStatus(status: unknown): GymWorkspace["status"] {
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
  };
}

/** No-op pass-through kept for backward compat — title override was removed. */
export function sanitizeNotification(notification: Notification): Notification {
  return notification;
}

export function gymTag(gymId?: string, collection?: string) {
  const base = gymId ? `gym:${gymId}` : "gym:default";
  return collection ? `${base}:${collection}` : base;
}
