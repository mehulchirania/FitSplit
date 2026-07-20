import type { Exercise, LiftLog, SkipReason, WorkoutExercise } from "./domain";

export const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const SKIP_REASONS: { value: SkipReason; label: string }[] = [
  { value: "rest",      label: "Rest day" },
  { value: "no_time",   label: "No time" },
  { value: "equipment", label: "No equipment" },
  { value: "sick",      label: "Feeling sick" },
  { value: "other",     label: "Other" },
];

/**
 * Returns the ISO date string (YYYY-MM-DD) for the Monday of the given date's
 * week, using **local** date arithmetic.
 *
 * `toISOString()` returns UTC midnight which can roll back to the previous
 * calendar day in timezones east of UTC (e.g. IST UTC+5:30).  Building the
 * string from local year/month/date avoids this.
 */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // shift so Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getDefaultDayIndex(dayCount: number) {
  const mondayFirstIndex = (new Date().getDay() + 6) % 7;
  return Math.min(Math.max(mondayFirstIndex, 0), Math.max(dayCount - 1, 0));
}

export function getInjuryRule(injury: string) {
  const value = injury.toLowerCase();

  if (value.includes("shoulder")) {
    return {
      avoidMuscles: ["Shoulders", "Chest"],
      avoidTerms: ["overhead", "press", "bench", "fly"],
      preferredMuscles: ["Legs", "Core", "Back"],
      summary:
        "Reduced shoulder-loaded pressing and replaced it with lower-body, core, and controlled pulling work.",
      stretches: ["stretch-band-pulls"]
    };
  }

  if (value.includes("knee")) {
    return {
      avoidMuscles: ["Legs"],
      avoidTerms: ["squat", "lunge", "leg press", "extension"],
      preferredMuscles: ["Chest", "Back", "Core"],
      summary:
        "Removed knee-dominant leg work and shifted the session toward upper-body and trunk-safe movements.",
      stretches: ["stretch-quad"]
    };
  }

  if (value.includes("back") || value.includes("spine") || value.includes("lower back")) {
    return {
      avoidMuscles: ["Back"] as string[],
      avoidTerms: ["deadlift", "row", "good morning"],
      preferredMuscles: ["Chest", "Shoulders", "Biceps"] as string[],
      summary:
        "Avoided spinal loading and rebuilt the day around supported upper-body push/pull work.",
      stretches: ["stretch-cat-cow"]
    };
  }

  return {
    avoidMuscles: [] as string[],
    avoidTerms: [] as string[],
    preferredMuscles: ["Core", "Cardio", "Chest"] as string[],
    summary:
      "Generated a conservative recovery routine while the owner reviews the limitation details.",
    stretches: [] as string[]
  };
}

export function isContraindicated(
  item: WorkoutExercise,
  injury: string,
  exercises: Exercise[]
) {
  const exercise = exercises.find((entry) => entry.id === item.exerciseId);
  const rule = getInjuryRule(injury);

  if (!exercise) {
    return false;
  }

  const text = `${exercise.name} ${exercise.instructions}`.toLowerCase();
  return (
    rule.avoidMuscles.includes(exercise.muscleGroup as string) ||
    rule.avoidTerms.some((term) => text.includes(term))
  );
}

export function findAlternative(
  usedIds: Set<string>,
  injury: string,
  exercises: Exercise[],
  originalMuscleGroup?: string
) {
  const rule = getInjuryRule(injury);
  // Determine mechanic type of the original exercise to prevent push/pull confusion
  const PUSH_MUSCLES = ["Chest", "Shoulders", "Triceps"];
  const PULL_MUSCLES = ["Back", "Biceps"];
  const originalIsPush = originalMuscleGroup && PUSH_MUSCLES.includes(originalMuscleGroup);
  const originalIsPull = originalMuscleGroup && PULL_MUSCLES.includes(originalMuscleGroup);

  return exercises.find((exercise) => {
    if (usedIds.has(exercise.id)) return false;
    if (!exercise.ownerOnly) return false;
    if (!rule.preferredMuscles.includes(exercise.muscleGroup as string)) return false;
    // If original was a pull exercise and preferred is a push exercise, skip (and vice versa)
    // unless the original's muscle group is contraindicated
    const thisIsPush = PUSH_MUSCLES.includes(exercise.muscleGroup as string);
    const thisIsPull = PULL_MUSCLES.includes(exercise.muscleGroup as string);
    if (originalMuscleGroup && !rule.avoidMuscles.includes(originalMuscleGroup)) {
      if (originalIsPush && thisIsPull) return false;
      if (originalIsPull && thisIsPush) return false;
    }
    return true;
  });
}

export function getExerciseName(exerciseId: string, exercises: Exercise[]) {
  return exercises.find((exercise) => exercise.id === exerciseId)?.name ?? "Exercise";
}

export function getDayMuscleTargets(items: WorkoutExercise[], exercises: Exercise[]) {
  const counts = new Map<string, number>();

  for (const item of items) {
    const exercise = exercises.find((entry) => entry.id === item.exerciseId);
    if (!exercise) {
      continue;
    }

    counts.set(exercise.muscleGroup, (counts.get(exercise.muscleGroup) ?? 0) + 1);
  }

  const sortedGroups = Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([muscleGroup]) => muscleGroup);

  return {
    primary: sortedGroups[0] ?? "Full body",
    secondary: sortedGroups.slice(1, 4)
  };
}

function normalizeMuscleToken(value?: string | null) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Same-muscle-group alternatives for a swap-exercise affordance. */
export function getAlternateExercises(original: Exercise | undefined, exercises: Exercise[]) {
  if (!original) return [];
  const originalGroup = normalizeMuscleToken(original.muscleGroup);
  return exercises
    .filter((candidate) => candidate.id !== original.id && normalizeMuscleToken(candidate.muscleGroup) === originalGroup)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Cycles through same-muscle alternatives (including back to the original) each time it's called. */
export function getNextExerciseSwap(original: Exercise | undefined, currentExerciseId: string, exercises: Exercise[]) {
  if (!original) return null;
  const cycle = [original, ...getAlternateExercises(original, exercises)];
  if (cycle.length < 2) return null;
  const currentIndex = cycle.findIndex((candidate) => candidate.id === currentExerciseId);
  return cycle[(currentIndex + 1) % cycle.length] ?? null;
}

export function getExerciseSwapKey(dayId: string | undefined, selectedDayIndex: number, exerciseId: string, index: number) {
  return `${dayId ?? `day-${selectedDayIndex}`}:${exerciseId}:${index}`;
}

/** Most recent logged set for an exercise, used to show "last: 60kg × 8" on a row. */
export function getLastLiftForExercise(exerciseId: string | undefined, liftLogs: LiftLog[]) {
  if (!exerciseId) return null;
  let best: LiftLog | null = null;
  for (const log of liftLogs) {
    if (log.exerciseId !== exerciseId || !log.loggedAt) continue;
    if (!best || new Date(log.loggedAt).getTime() > new Date(best.loggedAt).getTime()) {
      best = log;
    }
  }
  return best;
}

/** Whether a lift log carries a real load — bodyweight sets are logged with weight 0/null. */
export function hasLoggedWeight(log: LiftLog) {
  return typeof log.weight === "number" && log.weight > 0;
}
