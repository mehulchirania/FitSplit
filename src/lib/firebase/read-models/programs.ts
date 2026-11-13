import { cache } from "react";
import type { ProgramAssignment, WorkoutProgram } from "@/types/domain";

import { programs as libraryPrograms } from "@/lib/exercise-library";
import { applyCurrentWeeklyVariation } from "@/lib/split-library";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "../admin";
import { reportReadModelError, userCollection } from "./shared";

/**
 * Workout templates available to every user: the built-in split library (static,
 * see lib/exercise-library.ts). Weekly variations are resolved for the current week.
 */
export function getWorkoutPrograms(): { programs: WorkoutProgram[] } {
  const programs = libraryPrograms
    .filter((program) => program.days.some((day) => day.exercises.length > 0))
    .map((program) => ({ ...applyCurrentWeeklyVariation(program), source: "predefined" as const }));
  return { programs };
}

/** The plan the user is currently following (at most one active assignment). */
export const getProgramAssignmentForMember = cache(async function getProgramAssignmentForMember(uid: string): Promise<{
  assignment: ProgramAssignment | null;
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) return { assignment: null, isPersisted: false };

  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await userCollection(db, uid, "programAssignments").where("status", "==", "active").limit(1).get();
    if (snapshot.empty) return { assignment: null, isPersisted: true };

    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      assignment: {
        id: doc.id,
        memberId: uid,
        programId: String(data.programId ?? ""),
        assignedAt: String(data.assignedAt ?? new Date().toISOString()),
        status: String(data.status ?? "active") as ProgramAssignment["status"]
      },
      isPersisted: true
    };
  } catch (error) {
    reportReadModelError("getProgramAssignmentForMember", error, { memberId: uid });
    return { assignment: null, isPersisted: false };
  }
});
