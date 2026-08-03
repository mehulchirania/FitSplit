"use server";

import { requireAuth } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "../collections";
import { hasFirebaseAdminConfig } from "../admin";
import { requireFirebase, mirrorGymScopedRecord, assertCanManageMember } from "./shared";
import { getExerciseSwapsForMember } from "../read-models/swaps";
import { z } from "zod";

const SaveExerciseSwapsSchema = z.object({
  memberId: z.string().trim().min(1, "Member is required."),
  programId: z.string().trim().min(1, "Program is required."),
  dayId: z.string().trim().min(1, "Day is required."),
  // Keyed by exercise index within the day (as a string — Firestore map keys
  // are always strings), value is the substituted exercise's id. An empty
  // object clears every swap for the day.
  swaps: z.record(z.string(), z.string())
});

export type SaveExerciseSwapsResult =
  | { status: "success" }
  | { status: "error"; message: string };

/**
 * Persists a member's exercise substitutions for one program day. Swaps used
 * to be localStorage-only (device-local, invisible to trainers) — this is
 * what makes them survive a device switch and actually show up on the
 * trainer's view of the member (see ExerciseSwapNotes on the owner member
 * detail page). Called directly from WorkoutScreen on every swap change, not
 * gated behind a form — same plain-object pattern as sendCoachMessage.
 */
export async function saveExerciseSwaps(input: {
  memberId: string;
  programId: string;
  dayId: string;
  swaps: Record<string, string>;
}): Promise<SaveExerciseSwapsResult> {
  try {
    const currentUser = await requireAuth();
    const parsed = SaveExerciseSwapsSchema.safeParse(input);
    if (!parsed.success) {
      return { status: "error", message: parsed.error.issues[0]?.message ?? "Could not save swap." };
    }
    const { memberId, programId, dayId, swaps } = parsed.data;
    assertCanManageMember(currentUser, memberId);

    if (!hasFirebaseAdminConfig()) {
      return { status: "success" };
    }

    const db = requireFirebase();
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
    const docId = `${memberId}_${dayId}`;
    const now = new Date().toISOString();

    await mirrorGymScopedRecord(db, gymId, "exerciseSwaps", docId, {
      memberId,
      programId,
      dayId,
      swaps,
      updatedAt: now
    });

    return { status: "success" };
  } catch (error) {
    console.error("Unable to save exercise swaps", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not save swap. Please try again."
    };
  }
}

/**
 * Thin server-action wrapper around the getExerciseSwapsForMember read-model
 * (which uses the Admin SDK and can't be called directly from a client
 * component) so WorkoutScreen can hydrate a member's swaps for the day
 * they're viewing — same pattern as getMealQuickAddSuggestions.
 *
 * `found` distinguishes "no doc exists yet for this day" (client should
 * leave its local/pre-migration state alone — nothing to reconcile against)
 * from "a doc exists, possibly with an empty swaps map" (client should
 * treat the server as authoritative and replace local state even with
 * empty, so a swap cleared on another device actually clears here too).
 */
export async function getExerciseSwapsForMemberDay(
  memberId: string,
  gymId: string,
  dayId: string
): Promise<{ found: boolean; swaps: Record<string, string> }> {
  const currentUser = await requireAuth();
  assertCanManageMember(currentUser, memberId);
  const { swapsByDay } = await getExerciseSwapsForMember(memberId, gymId);
  const record = swapsByDay[dayId];
  return { found: record != null, swaps: record?.swaps ?? {} };
}
