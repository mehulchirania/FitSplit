import type { ContactMessage, Notification } from "@/types/domain";

import { notifications as mockNotifications } from "@/lib/mock-data";
import { collectionPaths, gymScopedCollectionPaths, PRIMARY_GYM_ID } from "../collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "../admin";
import { gymCollection, sanitizeNotification, trainingNotificationCopy } from "./shared";

export async function getOwnerNotifications(gymId?: string): Promise<{
  notifications: Notification[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return {
      notifications: mockNotifications.filter(
        (notification) => notification.recipientRole === "owner"
      ).map(sanitizeNotification),
      isPersisted: false
    };
  }

  let snapshot;

  try {
    const { db } = getFirebaseAdminServices();
    const targetGymId = gymId ?? PRIMARY_GYM_ID;
    const scopedSnapshot = await gymCollection(db, targetGymId, "notifications")
      .where("recipientRole", "==", "owner")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    if (!scopedSnapshot.empty) {
      snapshot = scopedSnapshot;
    } else {
      let query = db
        .collection(collectionPaths.notifications)
        .where("recipientRole", "==", "owner") as FirebaseFirestore.Query;
      if (gymId) {
        query = query.where("gymId", "==", gymId);
      }
      snapshot = await query.orderBy("createdAt", "desc").limit(50).get();
    }
  } catch {
    return {
      notifications: mockNotifications.filter(
        (notification) => notification.recipientRole === "owner"
      ).map(sanitizeNotification),
      isPersisted: false
    };
  }

  if (snapshot.empty) {
    return { notifications: [], isPersisted: true };
  }

  const notifications: Notification[] = snapshot.docs
    .map((doc) => {
      const data = doc.data();
        const copy = trainingNotificationCopy(
          String(data.title ?? "Notification"),
          String(data.body ?? "")
        );

        return {
          id: doc.id,
          recipientRole: String(data.recipientRole ?? "owner") as Notification["recipientRole"],
          recipientId: String(data.recipientId ?? ""),
          type: String(data.type ?? "membership_expiring_soon") as Notification["type"],
          title: copy.title,
          body: copy.body,
        createdAt: String(data.createdAt ?? new Date().toISOString()),
        readAt: data.readAt ? String(data.readAt) : undefined
      };
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return { notifications, isPersisted: true };
}

export async function getAdminNotifications(): Promise<{
  notifications: Notification[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return { notifications: [], isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const scopedSnapshot = await db
      .collectionGroup(gymScopedCollectionPaths.notifications)
      .where("recipientRole", "==", "admin")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.notifications)
          .where("recipientRole", "==", "admin")
          .orderBy("createdAt", "desc")
          .limit(50)
          .get()
      : scopedSnapshot;

    const notifications: Notification[] = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          recipientRole: "admin" as Notification["recipientRole"],
          recipientId: String(data.recipientId ?? ""),
          type: String(data.type ?? "password_reset_request") as Notification["type"],
          title: String(data.title ?? "Notification"),
          body: String(data.body ?? ""),
          createdAt: String(data.createdAt ?? new Date().toISOString()),
          readAt: data.readAt ? String(data.readAt) : undefined
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { notifications, isPersisted: true };
  } catch {
    return { notifications: [], isPersisted: false };
  }
}

export async function getMemberNotifications(memberId: string): Promise<{
  notifications: Notification[];
  isPersisted: boolean;
}> {
  const fallback = mockNotifications.filter(
    (notification) => notification.recipientId === memberId
  ).map(sanitizeNotification);

  if (!hasFirebaseAdminConfig()) {
    return { notifications: fallback, isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const scopedSnapshot = await db
      .collectionGroup(gymScopedCollectionPaths.notifications)
      .where("recipientId", "==", memberId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.notifications)
          .where("recipientId", "==", memberId)
          .orderBy("createdAt", "desc")
          .limit(50)
          .get()
      : scopedSnapshot;
    const notifications: Notification[] = snapshot.docs
      .map((doc) => {
        const data = doc.data();
          const copy = trainingNotificationCopy(
            String(data.title ?? "Notification"),
            String(data.body ?? "")
          );

          return {
            id: doc.id,
            recipientRole: String(data.recipientRole ?? "member") as Notification["recipientRole"],
            recipientId: String(data.recipientId ?? memberId),
            type: String(data.type ?? "program_assigned") as Notification["type"],
            title: copy.title,
            body: copy.body,
          createdAt: String(data.createdAt ?? new Date().toISOString()),
          readAt: data.readAt ? String(data.readAt) : undefined
        };
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    return { notifications, isPersisted: true };
  } catch {
    return { notifications: fallback, isPersisted: false };
  }
}

export async function getUnreadContactMessageCount(): Promise<number> {
  if (!hasFirebaseAdminConfig()) {
    return 0;
  }

  try {
    const { db } = getFirebaseAdminServices();
    // Use count() aggregation — reads zero documents, just returns a number.
    const scopedCount = await db
      .collectionGroup(gymScopedCollectionPaths.contactMessages)
      .where("status", "==", "unread")
      .count()
      .get();
    if (scopedCount.data().count > 0) {
      return scopedCount.data().count;
    }
    const rootCount = await db
      .collection(collectionPaths.contactMessages)
      .where("status", "==", "unread")
      .count()
      .get();
    return rootCount.data().count;
  } catch {
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
    const scopedSnapshot = await db
      .collectionGroup(gymScopedCollectionPaths.contactMessages)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.contactMessages)
          .orderBy("createdAt", "desc")
          .limit(100)
          .get()
      : scopedSnapshot;

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
  } catch {
    return { messages: [], isPersisted: false };
  }
}
