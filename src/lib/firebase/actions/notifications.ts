"use server";

import { requireAuth } from "@/lib/auth";
import { collectionPaths, gymScopedCollectionPaths } from "../collections";
import { getAdminMessaging, hasFirebaseAdminConfig } from "../admin";
import type { FormActionState } from "@/types/action-state";
import {
  requireFirebase,
  scopedGymDoc,
  success,
  failure
} from "./shared";
import { canMarkNotificationRead } from "./notification-auth";
import { z } from "zod";
import { parseActionData, ZodHelpers } from "./validation";

function uniqueTruthyIds(ids: string[]) {
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean))).slice(0, 20);
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function clearUserNotifications(notificationIds: string[]): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    const db = requireFirebase();
    const scopedIds = uniqueTruthyIds(notificationIds);

    if (scopedIds.length === 0) {
      return success("No notifications to clear.", undefined, ["notifications"]);
    }

    const now = new Date().toISOString();
    const batch = db.batch();
    const snapshotsByPath = new Map<string, FirebaseFirestore.DocumentSnapshot>();

    const directReads = scopedIds.flatMap((notificationId) => {
      const reads = [db.collection(collectionPaths.notifications).doc(notificationId).get()];
      if (currentUser.gymId) {
        reads.push(scopedGymDoc(db, currentUser.gymId, "notifications", notificationId).get());
      }
      return reads;
    });

    for (const snapshot of await Promise.all(directReads)) {
      if (snapshot.exists) {
        snapshotsByPath.set(snapshot.ref.path, snapshot);
      }
    }

    if (currentUser.role === "admin") {
      const collectionGroupReads = chunk(scopedIds, 10).map((ids) =>
        db
          .collectionGroup(gymScopedCollectionPaths.notifications)
          .where("id", "in", ids)
          .get()
      );
      for (const snapshot of await Promise.all(collectionGroupReads)) {
        snapshot.docs.forEach((doc) => snapshotsByPath.set(doc.ref.path, doc));
      }
    }

    let writes = 0;
    for (const notificationDoc of snapshotsByPath.values()) {
      const notification = notificationDoc.data();
      if (notification && canMarkNotificationRead(currentUser, notification)) {
        batch.set(notificationDoc.ref, { readAt: now }, { merge: true });
        writes += 1;
      }
    }

    if (writes > 0) {
      await batch.commit();
    }

    return success("Notifications cleared.", currentUser.gymId, ["notifications"]);
  } catch (error) {
    console.error("Unable to clear notifications", error);
    return failure(error, "Unable to clear notifications.");
  }
}

/**
 * Saves an FCM registration token for the currently authenticated user.
 * Called from the client-side FcmSetup component after the user grants notification permission.
 *
 * FormData keys: token
 */
const SaveFcmTokenSchema = z.object({
  token: ZodHelpers.textRequired("FCM token")
});

export async function saveFcmToken(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    const parsed = parseActionData(formData, SaveFcmTokenSchema);
    if (!parsed.success) return parsed.state;

    const token = parsed.data.token;
    const db = requireFirebase();
    await db.collection(collectionPaths.authProfiles).doc(currentUser.uid).set(
      { fcmToken: token, fcmTokenUpdatedAt: new Date().toISOString() },
      { merge: true }
    );

    // Subscribe device to gym-wide topic so owners can send broadcasts without
    // iterating all member profiles.
    if (hasFirebaseAdminConfig() && currentUser.gymId) {
      try {
        await getAdminMessaging().subscribeToTopic(token, `gym-${currentUser.gymId}`);
      } catch {
        // Non-fatal — push still works via per-device token.
      }
    }

    return success("Push notifications enabled.", undefined, ["notifications"]);
  } catch (error) {
    console.error("Unable to save FCM token", error);
    return failure(error, "Could not enable push notifications.");
  }
}
