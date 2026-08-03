import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "../admin";
import { gymCollectionPath } from "../collections";
import { reportReadModelError } from "./shared";

/** A member's exercise substitutions for one program day, keyed by exercise index (as a string). */
export type ExerciseSwapRecord = {
  dayId: string;
  programId: string;
  swaps: Record<string, string>;
  updatedAt: string;
};

/**
 * Fetch every day's exercise swaps for a member, keyed by dayId. Single
 * equality filter on memberId (no orderBy) — a program has at most a
 * handful of days, so this stays small and doesn't need a composite index.
 *
 * Used to hydrate WorkoutScreen's swap state from the server (so a swap made
 * on one device shows up on another) and to power ExerciseSwapNotes on the
 * owner member-detail page, so trainers can see what a member actually
 * trains instead of only the prescribed plan.
 *
 * Intentionally keeps days whose swaps map is now empty (fully reverted)
 * rather than dropping them — WorkoutScreen's hydration needs to be able to
 * tell "this day was reverted on another device" apart from "this day was
 * never touched" so a stale local swap doesn't survive a cross-device clear.
 * Callers that only want *active* swaps (e.g. the trainer display) should
 * filter empty entries themselves.
 */
export async function getExerciseSwapsForMember(
  memberId: string,
  gymId: string
): Promise<{ swapsByDay: Record<string, ExerciseSwapRecord> }> {
  if (!hasFirebaseAdminConfig()) return { swapsByDay: {} };
  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await db
      .collection(gymCollectionPath(gymId, "exerciseSwaps"))
      .where("memberId", "==", memberId)
      .get();

    const swapsByDay: Record<string, ExerciseSwapRecord> = {};
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const dayId = String(data.dayId ?? "");
      if (!dayId) continue;
      const rawSwaps = data.swaps && typeof data.swaps === "object" ? data.swaps : {};
      const swaps: Record<string, string> = {};
      for (const [key, value] of Object.entries(rawSwaps)) {
        if (typeof value === "string" && value) swaps[key] = value;
      }
      swapsByDay[dayId] = {
        dayId,
        programId: String(data.programId ?? ""),
        swaps,
        updatedAt: String(data.updatedAt ?? "")
      };
    }

    return { swapsByDay };
  } catch (error) {
    reportReadModelError("getExerciseSwapsForMember", error, { memberId, gymId });
    return { swapsByDay: {} };
  }
}
