import { cache } from "react";
import type { ProgramAssignment, WorkoutProgram, WorkoutSession } from "@/types/domain";

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

const CUSTOM_PREFIX = "custom_";

export const isCustomProgramId = (id: string) => id.startsWith(CUSTOM_PREFIX);
export const newCustomProgramId = (uuid: string) => `${CUSTOM_PREFIX}${uuid}`;

/** Plans the user built themselves (`users/{uid}/customPrograms`), newest first. */
const getCustomProgramsForMember = cache(async function getCustomProgramsForMember(uid: string): Promise<WorkoutProgram[]> {
  if (!hasFirebaseAdminConfig()) return [];
  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await userCollection(db, uid, "customPrograms").get();
    return snapshot.docs
      .map((doc) => {
        const data = doc.data();
        const days = (Array.isArray(data.days) ? data.days : []) as WorkoutProgram["days"];
        const program: WorkoutProgram = {
          id: doc.id,
          title: String(data.title ?? "My plan"),
          description: "Built by you.",
          goal: "Custom",
          difficulty: "beginner",
          daysPerWeek: days.length,
          source: "custom",
          splitType: "custom",
          days
        };
        return { program, createdAt: String(data.createdAt ?? "") };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((entry) => entry.program);
  } catch (error) {
    reportReadModelError("getCustomProgramsForMember", error, { memberId: uid });
    return [];
  }
});

/** Every plan this user can pick: the built-in library plus their own. */
export async function getAllProgramsForMember(uid: string): Promise<WorkoutProgram[]> {
  const custom = await getCustomProgramsForMember(uid);
  return [...custom, ...getWorkoutPrograms().programs];
}

/** Finished workouts, newest first. */
export const getWorkoutSessionsForMember = cache(async function getWorkoutSessionsForMember(uid: string, limit = 120): Promise<WorkoutSession[]> {
  if (!hasFirebaseAdminConfig()) return [];
  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await userCollection(db, uid, "workoutSessions").where("status", "==", "completed").get();
    return snapshot.docs
      .map((doc): WorkoutSession => {
        const d = doc.data();
        return {
          id: doc.id,
          memberId: uid,
          startedAt: String(d.startedAt ?? ""),
          endedAt: d.endedAt ? String(d.endedAt) : undefined,
          status: "completed",
          programId: d.programId ? String(d.programId) : undefined,
          programDayId: d.programDayId ? String(d.programDayId) : undefined,
          dayTitle: d.dayTitle ? String(d.dayTitle) : undefined,
          durationSec: d.durationSec != null ? Number(d.durationSec) : undefined,
          setsCompleted: d.setsCompleted != null ? Number(d.setsCompleted) : undefined,
          exercisesCompleted: d.exercisesCompleted != null ? Number(d.exercisesCompleted) : undefined,
          volumeKg: d.volumeKg != null ? Number(d.volumeKg) : undefined
        };
      })
      .sort((a, b) => (b.endedAt ?? b.startedAt).localeCompare(a.endedAt ?? a.startedAt))
      .slice(0, limit);
  } catch (error) {
    reportReadModelError("getWorkoutSessionsForMember", error, { memberId: uid });
    return [];
  }
});
