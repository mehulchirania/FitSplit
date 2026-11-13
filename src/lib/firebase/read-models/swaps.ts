import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "../admin";
import { reportReadModelError, userCollection } from "./shared";

/** A user's exercise substitutions for one program day, keyed by exercise index (as a string). */
export type ExerciseSwapRecord = {
  dayId: string;
  programId: string;
  swaps: Record<string, string>;
  updatedAt: string;
};

/**
 * Fetch every day's exercise swaps for a user, keyed by dayId.
 *
 * Intentionally keeps days whose swaps map is now empty (fully reverted) so the
 * workout screen can tell "reverted on another device" from "never touched".
 */
export async function getExerciseSwapsForMember(
  uid: string
): Promise<{ swapsByDay: Record<string, ExerciseSwapRecord> }> {
  if (!hasFirebaseAdminConfig()) return { swapsByDay: {} };
  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await userCollection(db, uid, "exerciseSwaps").get();

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
    reportReadModelError("getExerciseSwapsForMember", error, { memberId: uid });
    return { swapsByDay: {} };
  }
}
