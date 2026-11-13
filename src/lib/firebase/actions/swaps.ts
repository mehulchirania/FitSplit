"use server";

import { requireAuth } from "@/lib/auth";
import { hasFirebaseAdminConfig } from "../admin";
import { requireFirebase, userDoc } from "./shared";
import { getExerciseSwapsForMember } from "../read-models/swaps";
import { z } from "zod";

const SaveExerciseSwapsSchema = z.object({
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

/** Persists the signed-in user's exercise substitutions for one program day. */
export async function saveExerciseSwaps(input: {
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
    const { programId, dayId, swaps } = parsed.data;

    if (!hasFirebaseAdminConfig()) {
      return { status: "success" };
    }

    const db = requireFirebase();
    await userDoc(db, currentUser.uid, "exerciseSwaps", dayId).set({
      memberId: currentUser.uid,
      programId,
      dayId,
      swaps,
      updatedAt: new Date().toISOString()
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
 * Server-action wrapper around the getExerciseSwapsForMember read-model so the
 * workout screen can hydrate the swaps for the day being viewed.
 *
 * `found` distinguishes "no doc exists yet for this day" from "a doc exists,
 * possibly with an empty swaps map" (the server is then authoritative).
 */
export async function getExerciseSwapsForMemberDay(
  dayId: string
): Promise<{ found: boolean; swaps: Record<string, string> }> {
  const currentUser = await requireAuth();
  const { swapsByDay } = await getExerciseSwapsForMember(currentUser.uid);
  const record = swapsByDay[dayId];
  return { found: record != null, swaps: record?.swaps ?? {} };
}
