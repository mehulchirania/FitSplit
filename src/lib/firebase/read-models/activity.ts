import type { ActivityEvent } from "@/types/domain";

import { collectionPaths, PRIMARY_GYM_ID } from "../collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "../admin";
import { gymCollection } from "./shared";

export async function getActivityEvents(audience: "owner" | "member", memberId?: string, gymId?: string): Promise<{
  events: ActivityEvent[];
  isPersisted: boolean;
}> {
  const fallback: ActivityEvent[] =
    audience === "member"
      ? [
          {
            id: "fallback-member-training",
            audience: "member",
            memberId,
            title: "Training profile updated",
            detail: "Your member profile now reflects the latest owner update.",
            icon: "bell",
            createdAt: "2026-05-04T11:10:00+05:30"
          },
          {
            id: "fallback-member-program",
            audience: "member",
            memberId,
            title: "New workout plan assigned",
            detail: "PPL + Upper/Lower is available in your member portal.",
            icon: "dumbbell",
            createdAt: "2026-05-03T17:15:00+05:30"
          }
        ]
      : [
          {
            id: "fallback-owner-member",
            audience: "owner",
            title: 'New member added - "Aarav Sharma"',
            detail: "Training profile created for Sri Shakthi Hanuman Gym.",
            icon: "users",
            createdAt: "2026-05-04T10:30:00+05:30"
          },
          {
            id: "fallback-owner-plan",
            audience: "owner",
            title: "New workout plan created - Custom split v1",
            detail: "Owner-created custom plan is ready for assignment.",
            icon: "dumbbell",
            createdAt: "2026-05-04T09:45:00+05:30"
          }
        ];

  if (!hasFirebaseAdminConfig()) {
    return { events: fallback, isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const targetGymId = gymId ?? PRIMARY_GYM_ID;
    const scopedSnapshot = await gymCollection(db, targetGymId, "activityEvents")
      .where("audience", "==", audience)
      .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.activityEvents)
          .where("gymId", "==", targetGymId)
          .where("audience", "==", audience)
          .get()
      : scopedSnapshot;
    const events = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          audience: String(data.audience ?? audience) as ActivityEvent["audience"],
          memberId: data.memberId ? String(data.memberId) : undefined,
          title: String(data.title ?? "Activity"),
          detail: String(data.detail ?? ""),
          icon: String(data.icon ?? "activity") as ActivityEvent["icon"],
          createdAt: String(data.createdAt ?? new Date().toISOString())
        };
      })
      .filter((event) => audience === "owner" || !memberId || event.memberId === memberId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    return { events, isPersisted: true };
  } catch {
    return { events: fallback, isPersisted: false };
  }
}
