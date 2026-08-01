import type { ContactMessage, Notification } from "@/types/domain";

import { notifications as mockNotifications } from "@/lib/mock-data";
import { gymScopedCollectionPaths, PRIMARY_GYM_ID } from "../collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "../admin";
import { gymCollection, reportReadModelError } from "./shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapNotificationDoc(
  doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
): Notification {
  const data = doc.data();
  return {
    id: doc.id,
    recipientRole: String(data.recipientRole ?? "owner") as Notification["recipientRole"],
    recipientId: String(data.recipientId ?? ""),
    type: String(data.type ?? "membership_expiring_soon") as Notification["type"],
    title: String(data.title ?? "Notification"),
    body: String(data.body ?? ""),
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    readAt: data.readAt ? String(data.readAt) : undefined,
    exerciseRequestId: data.exerciseRequestId ? String(data.exerciseRequestId) : undefined,
    actionHref: data.actionHref ? String(data.actionHref) : undefined,
    memberId: data.memberId ? String(data.memberId) : undefined,
    ptSessionId: data.ptSessionId ? String(data.ptSessionId) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Owner notifications
// ---------------------------------------------------------------------------

export async function getOwnerNotifications(gymId?: string): Promise<{
  notifications: Notification[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return {
      notifications: mockNotifications.filter(
        (notification) => notification.recipientRole === "owner"
      ),
      isPersisted: false
    };
  }

  let snapshot;

  try {
    const { db } = getFirebaseAdminServices();
    const targetGymId = gymId ?? PRIMARY_GYM_ID;
    // Root-collection fallback removed 2026-08-02: the R4/backfill migration
    // (docs/17_ROOT_BACKFILL_RUNBOOK.md) confirmed notifications is fully
    // mirrored to gyms/{gymId}/notifications in production, so the gym-scoped
    // read alone is authoritative.
    snapshot = await gymCollection(db, targetGymId, "notifications")
      .where("recipientRole", "==", "owner")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
  } catch (error) {
    reportReadModelError("getOwnerNotifications", error, { gymId });
    return {
      notifications: mockNotifications.filter(
        (notification) => notification.recipientRole === "owner"
      ),
      isPersisted: false
    };
  }

  if (snapshot.empty) {
    return { notifications: [], isPersisted: true };
  }

  const notifications: Notification[] = snapshot.docs
    .map(mapNotificationDoc)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return { notifications, isPersisted: true };
}

// ---------------------------------------------------------------------------
// Admin notifications
// ---------------------------------------------------------------------------

export async function getAdminNotifications(): Promise<{
  notifications: Notification[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return { notifications: [], isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    // Admin notifications are written gym-scoped only (mirrorGymScopedRecord),
    // so query across every gym's `notifications` subcollection via a
    // collectionGroup. This also matches any legacy root `notifications` docs
    // (same collection ID), so old data remains visible without a separate read.
    const snapshot = await db
      .collectionGroup(gymScopedCollectionPaths.notifications)
      .where("recipientRole", "==", "admin")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const notifications: Notification[] = snapshot.docs
      .map(mapNotificationDoc)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { notifications, isPersisted: true };
  } catch (error) {
    reportReadModelError("getAdminNotifications", error);
    return { notifications: [], isPersisted: false };
  }
}

// ---------------------------------------------------------------------------
// Member notifications
// ---------------------------------------------------------------------------

export async function getMemberNotifications(memberId: string, gymId?: string): Promise<{
  notifications: Notification[];
  isPersisted: boolean;
}> {
  const fallback = mockNotifications.filter(
    (notification) => notification.recipientId === memberId
  );

  if (!hasFirebaseAdminConfig()) {
    return { notifications: fallback, isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    // Root-collection fallback removed 2026-08-02: the R4/backfill migration
    // (docs/17_ROOT_BACKFILL_RUNBOOK.md) confirmed notifications is fully
    // mirrored to gyms/{gymId}/notifications in production, so the gym-scoped
    // (or cross-gym collectionGroup, when gymId is omitted) read alone is
    // authoritative. Both current callers always pass gymId, but the
    // collectionGroup branch is kept in case a future caller omits it.
    const snapshot = gymId
      ? await gymCollection(db, gymId, "notifications")
          .where("recipientId", "==", memberId)
          .orderBy("createdAt", "desc")
          .limit(50)
          .get()
      : await db
          .collectionGroup(gymScopedCollectionPaths.notifications)
          .where("recipientId", "==", memberId)
          .orderBy("createdAt", "desc")
          .limit(50)
          .get();

    const notifications: Notification[] = snapshot.docs
      .map(mapNotificationDoc)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    return { notifications, isPersisted: true };
  } catch (error) {
    reportReadModelError("getMemberNotifications", error, { memberId, gymId });
    return { notifications: fallback, isPersisted: false };
  }
}

// ---------------------------------------------------------------------------
// Contact messages
// ---------------------------------------------------------------------------

export async function getUnreadContactMessageCount(): Promise<number> {
  if (!hasFirebaseAdminConfig()) {
    return 0;
  }

  try {
    const { db } = getFirebaseAdminServices();
    // Use count() aggregation — reads zero documents, just returns a number.
    // Root-collection fallback removed 2026-08-02: the R4/backfill migration
    // (docs/17_ROOT_BACKFILL_RUNBOOK.md) confirmed contactMessages is fully
    // mirrored to gyms/{gymId}/contactMessages in production, so the
    // cross-gym collectionGroup count alone is authoritative.
    const scopedCount = await db
      .collectionGroup(gymScopedCollectionPaths.contactMessages)
      .where("status", "==", "unread")
      .count()
      .get();
    return scopedCount.data().count;
  } catch (error) {
    reportReadModelError("getUnreadContactMessageCount", error);
    return 0;
  }
}

export async function getContactMessages(): Promise<{
  messages: ContactMessage[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return { messages: [], isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    // Root-collection fallback removed 2026-08-02: the R4/backfill migration
    // (docs/17_ROOT_BACKFILL_RUNBOOK.md) confirmed contactMessages is fully
    // mirrored to gyms/{gymId}/contactMessages in production, so the
    // cross-gym collectionGroup read alone is authoritative.
    const snapshot = await db
      .collectionGroup(gymScopedCollectionPaths.contactMessages)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const messages: ContactMessage[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: String(data.name),
        mobile: String(data.mobile),
        email: data.email ? String(data.email) : undefined,
        body: String(data.body),
        status: String(data.status ?? "unread") as ContactMessage["status"],
        createdAt: String(data.createdAt),
        updatedAt: String(data.updatedAt)
      };
    });

    return { messages, isPersisted: true };
  } catch (error) {
    reportReadModelError("getContactMessages", error);
    return { messages: [], isPersisted: false };
  }
}
