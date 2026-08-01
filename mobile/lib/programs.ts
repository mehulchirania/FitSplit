import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import {
  applyCurrentWeeklyVariation,
  defaultExerciseCatalog,
  getDefaultDayIndex,
  splitLibraryPrograms,
  type Exercise,
  type ProgramAssignment,
  type WorkoutDay,
  type WorkoutProgram
} from "@fitsplit/core";
import { db } from "@/lib/firebase";

export type TodayFocus = {
  program: WorkoutProgram;
  day: WorkoutDay | null;
  exercisesById: Map<string, Exercise>;
};

/** Mirrors getProgramAssignmentForMember's query shape (src/lib/firebase/read-models/programs.ts) — gym-scoped only, no legacy root fallback needed for new mobile writes. */
async function getActiveAssignment(gymId: string, memberId: string): Promise<ProgramAssignment | null> {
  const snapshot = await getDocs(
    query(
      collection(db, "gyms", gymId, "programAssignments"),
      where("memberId", "==", memberId),
      where("status", "==", "active"),
      limit(1)
    )
  );
  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  const data = docSnap.data();
  return {
    id: docSnap.id,
    memberId: String(data.memberId ?? ""),
    programId: String(data.programId ?? ""),
    assignedAt: String(data.assignedAt ?? new Date().toISOString()),
    status: String(data.status ?? "active") as ProgramAssignment["status"]
  };
}

/** Predefined split-library programs are generated client-side from @fitsplit/core, never stored in Firestore — only custom gym programs are. */
async function resolveProgram(gymId: string, programId: string): Promise<WorkoutProgram | null> {
  const predefined = splitLibraryPrograms.find((program) => program.id === programId);
  if (predefined) return predefined;

  const snapshot = await getDoc(doc(db, "gyms", gymId, "workoutPrograms", programId));
  return snapshot.exists() ? (snapshot.data() as WorkoutProgram) : null;
}

async function getExerciseCatalog(gymId: string): Promise<Map<string, Exercise>> {
  const map = new Map<string, Exercise>();
  // Seed with the code-bundled default catalog first so predefined exercises
  // (referenced by split-library programs and most lift logs, and NOT stored in
  // Firestore) resolve to real names. Gym-custom entries overlay these on id
  // collision — mirrors the web read-model's merge behaviour.
  for (const exercise of defaultExerciseCatalog) {
    map.set(exercise.id, exercise);
  }
  const snapshot = await getDocs(collection(db, "gyms", gymId, "exerciseCatalog"));
  snapshot.forEach((docSnap) => map.set(docSnap.id, docSnap.data() as Exercise));
  return map;
}

export async function getTodayFocus(gymId: string, memberId: string): Promise<TodayFocus | null> {
  const assignment = await getActiveAssignment(gymId, memberId);
  if (!assignment) return null;

  const rawProgram = await resolveProgram(gymId, assignment.programId);
  if (!rawProgram) return null;

  const program = applyCurrentWeeklyVariation(rawProgram);
  const day = program.days[getDefaultDayIndex(program.days.length)] ?? null;
  const exercisesById = await getExerciseCatalog(gymId);

  return { program, day, exercisesById };
}
