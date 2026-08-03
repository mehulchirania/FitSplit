import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import {
  applyCurrentWeeklyVariation,
  defaultExerciseCatalog,
  getWeekStart,
  resolveTodaysSession,
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

/**
 * Recent dayLogs/liftLogs for resolveTodaysSession, mirroring
 * getActiveAssignment's query shape: memberId equality + loggedAt desc +
 * limit, which reuses the existing (memberId ASC, loggedAt DESC) index
 * already declared for both collections — a weekStart or loggedAt-range
 * filter would need a new composite index Firestore doesn't have.
 * A recent-N fetch is enough since the resolver only needs this week's
 * entries and those are always the newest.
 */
async function getRecentDayLogs(gymId: string, memberId: string): Promise<Parameters<typeof resolveTodaysSession>[1]> {
  const snapshot = await getDocs(
    query(
      collection(db, "gyms", gymId, "dayLogs"),
      where("memberId", "==", memberId),
      orderBy("loggedAt", "desc"),
      limit(30)
    )
  );
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      dayId: String(data.dayId ?? ""),
      status: String(data.status ?? ""),
      weekStart: String(data.weekStart ?? ""),
      loggedAt: data.loggedAt ? String(data.loggedAt) : undefined
    };
  });
}

async function getRecentLiftLogs(gymId: string, memberId: string): Promise<Parameters<typeof resolveTodaysSession>[2]> {
  const snapshot = await getDocs(
    query(
      collection(db, "gyms", gymId, "liftLogs"),
      where("memberId", "==", memberId),
      orderBy("loggedAt", "desc"),
      limit(20)
    )
  );
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      exerciseId: String(data.exerciseId ?? ""),
      loggedAt: data.loggedAt ? String(data.loggedAt) : undefined
    };
  });
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
  const [dayLogs, liftLogs, exercisesById] = await Promise.all([
    getRecentDayLogs(gymId, memberId),
    getRecentLiftLogs(gymId, memberId),
    getExerciseCatalog(gymId)
  ]);
  // Agrees with the web app's Train tab and Overview card — see
  // resolveTodaysSession in @fitsplit/core for the in-progress/next-up/
  // rest-day resolution, replacing the old bare weekday-index guess that
  // could point mobile and web members at different days.
  const { dayIndex } = resolveTodaysSession(program, dayLogs, liftLogs, getWeekStart());
  const day = program.days[dayIndex] ?? null;

  return { program, day, exercisesById };
}
