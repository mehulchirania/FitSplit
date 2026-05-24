"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { collectionPaths } from "../collections";
import type { FormActionState } from "@/types/action-state";
import {
  requireFirebase,
  success,
  failure
} from "./shared";
import { z } from "zod";
import { parseActionData, ZodHelpers } from "./validation";

export async function clearUserNotifications(notificationIds: string[]): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    const db = requireFirebase();
    const scopedIds = notificationIds
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 20);

    if (scopedIds.length === 0) {
      return success("No notifications to clear.");
    }

    const now = new Date().toISOString();
    const batch = db.batch();

    for (const notificationId of scopedIds) {
      const notificationRef = db.collection(collectionPaths.notifications).doc(notificationId);
      const notificationDoc = await notificationRef.get();
      const notification = notificationDoc.data();

      if (!notificationDoc.exists || !notification) {
        continue;
      }

      const isMemberNotification =
        currentUser.role === "member" &&
        String(notification.recipientId ?? "") === (currentUser.memberId ?? currentUser.uid);
      const isOwnerNotification =
        (currentUser.role === "owner" || currentUser.role === "admin") &&
        String(notification.recipientRole ?? "") === "owner";

      if (currentUser.role === "admin" || isMemberNotification || isOwnerNotification) {
        batch.set(notificationRef, { readAt: now }, { merge: true });
      }
    }

    await batch.commit();
    revalidatePath("/member");
    revalidatePath("/owner");
    revalidatePath("/admin");

    return success("Notifications cleared.");
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
    return success("Push notifications enabled.");
  } catch (error) {
    console.error("Unable to save FCM token", error);
    return failure(error, "Could not enable push notifications.");
  }
}
