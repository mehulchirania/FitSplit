import { findExercise } from "@/lib/exercise-library";
import { summarizePlan, type PlanSummary } from "@/lib/plan-catalog";
import { getAllProgramsForMember, getProgramAssignmentForMember } from "@/lib/firebase/read-models";
import type { ProgramAssignment, WorkoutProgram } from "@/types/domain";

export const exerciseName = (id: string) => findExercise(id)?.name ?? "Exercise";

/** The plan the user is following, or null when they have not picked one (or deleted it). */
export async function getActivePlan(uid: string): Promise<{ program: WorkoutProgram; assignment: ProgramAssignment } | null> {
  const [{ assignment }, programs] = await Promise.all([getProgramAssignmentForMember(uid), getAllProgramsForMember(uid)]);
  if (!assignment) return null;
  const program = programs.find((p) => p.id === assignment.programId);
  return program ? { program, assignment } : null;
}

/** Every pickable plan, summarised for the plan lists. */
export async function getPlanSummaries(uid: string): Promise<PlanSummary[]> {
  const programs = await getAllProgramsForMember(uid);
  return programs.filter((p) => p.days.some((d) => d.exercises.length > 0)).map((p) => summarizePlan(p, exerciseName));
}
