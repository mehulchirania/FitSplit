import type { ActivityEvent } from "@/types/domain";

import { PRIMARY_GYM_ID } from "../collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "../admin";
import { gymCollection, reportReadModelError } from "./shared";

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
    // Root-collection fallback removed 2026-08-02: the R4/backfill migration
    // (docs/17_ROOT_BACKFILL_RUNBOOK.md) confirmed activityEvents is fully
    // mirrored to gyms/{gymId}/activityEvents in production, so the gym-scoped
    // read alone is authoritative.
    const snapshot = await gymCollection(db, targetGymId, "activityEvents")
      .where("audience", "==", audience)
      .get();
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
  } catch (error) {
    reportReadModelError("getActivityEvents", error, { gymId, memberId });
    return { events: fallback, isPersisted: false };
  }
}
