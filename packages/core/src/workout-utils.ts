import type { Exercise, LiftLog, SkipReason, WorkoutExercise } from "./domain";

export const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export interface TodaysSession {
  /** Index into program.days for the session the member should see now. */
  dayIndex: number;
  /** Why this day was chosen — for UI copy and debugging. */
  reason: "in_progress" | "next_up" | "rest_day" | "no_program";
  /** True when this day already has a completed dayLog for the current week. */
  isCompletedThisWeek: boolean;
}

/**
 * "Now", anchored to India Standard Time regardless of the runtime's own
 * default timezone. Use this — not a bare `new Date()` — anywhere week/day
 * boundary logic needs "today" for this app's actual audience: on a server
 * running in UTC (as this one does) and a client browser running in IST, a
 * bare `new Date()` fed into getWeekStart/toLocalDateKey's local-timezone
 * extraction disagrees between the two for roughly 5.5 hours of every day —
 * either a hydration mismatch (if it reaches rendered output) or silently
 * wrong week/streak/adherence math (if it doesn't). Anchored at noon so the
 * result survives being re-interpreted as local time by any downstream
 * getDate()/getDay() call without shifting calendar day in either direction.
 */
export function nowInIST(): Date {
  const isoDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  return new Date(`${isoDate}T12:00:00`);
}

/** Local (not UTC) YYYY-MM-DD key for a Date — avoids the UTC-rollback issue described on getWeekStart. */
function toLocalDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** True when `loggedAt` falls within the 7-day window starting at `weekStartIso` (inclusive-exclusive). */
function isWithinWeek(loggedAt: string | undefined, weekStartIso: string): boolean {
  if (!loggedAt) return false;
  const start = new Date(`${weekStartIso}T00:00:00`);
  if (Number.isNaN(start.getTime())) return false;
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const logged = new Date(loggedAt);
  if (Number.isNaN(logged.getTime())) return false;
  return logged >= start && logged < end;
}

/**
 * Single source of truth for "what workout day should the member see right now".
 *
 * Priority order:
 *   1. No program / no days             -> reason "no_program"
 *   2. Every day already completed      -> reason "rest_day" (last day, isCompletedThisWeek)
 *   3. First day without a completed dayLog this week, and there's lift activity
 *      logged within the current week   -> reason "in_progress"
 *   4. Otherwise, that same first incomplete day -> reason "next_up"
 *
 * Pure and deterministic: everything is derived from the passed-in `weekStartIso`,
 * never from `new Date()`.
 */
export function resolveTodaysSession(
  program: { days?: { id: string; dayNumber?: number }[] } | null,
  dayLogs: { dayId: string; status: string; weekStart: string; loggedAt?: string }[],
  liftLogs: { exerciseId: string; loggedAt?: string }[],
  weekStartIso: string
): TodaysSession {
  const days = program?.days ?? [];

  if (days.length === 0) {
    return { dayIndex: 0, reason: "no_program", isCompletedThisWeek: false };
  }

  const completedDayIds = new Set(
    dayLogs
      .filter((log) => log.status === "completed" && log.weekStart === weekStartIso)
      .map((log) => log.dayId)
  );

  const nextUpIndex = days.findIndex((day) => !completedDayIds.has(day.id));

  if (nextUpIndex === -1) {
    return {
      dayIndex: days.length - 1,
      reason: "rest_day",
      isCompletedThisWeek: true
    };
  }

  const hasActivityThisWeek = liftLogs.some((log) => isWithinWeek(log.loggedAt, weekStartIso));

  return {
    dayIndex: nextUpIndex,
    reason: hasActivityThisWeek ? "in_progress" : "next_up",
    isCompletedThisWeek: false
  };
}

/**
 * Set of local YYYY-MM-DD date keys the member trained on: any day with at least
 * one lift log, or a dayLog explicitly marked "completed". Shared by every screen
 * that needs to know "which days count as trained" so the definition can't drift.
 */
export function getTrainedDateKeys(
  liftLogs: { loggedAt?: string }[],
  dayLogs: { status: string; loggedAt?: string }[]
): Set<string> {
  const keys = new Set<string>();

  for (const log of liftLogs) {
    if (!log.loggedAt) continue;
    const d = new Date(log.loggedAt);
    if (Number.isNaN(d.getTime())) continue;
    keys.add(toLocalDateKey(d));
  }

  for (const log of dayLogs) {
    if (log.status !== "completed" || !log.loggedAt) continue;
    const d = new Date(log.loggedAt);
    if (Number.isNaN(d.getTime())) continue;
    keys.add(toLocalDateKey(d));
  }

  return keys;
}

/**
 * Estimated session length in minutes: per set, rest time (defaulting to 90s)
 * plus ~45s of working time, summed across exercises and rounded to the
 * nearest 5 minutes. Exercises missing a `sets` count default to 3.
 */
export function estimateSessionMinutes(dayExercises: WorkoutExercise[]): number {
  const WORK_SECONDS_PER_SET = 45;
  const DEFAULT_REST_SECONDS = 90;
  const DEFAULT_SETS = 3;

  const totalSeconds = dayExercises.reduce((sum, exercise) => {
    const sets = exercise.sets ?? DEFAULT_SETS;
    const restSeconds = exercise.restSeconds ?? DEFAULT_REST_SECONDS;
    return sum + sets * (restSeconds + WORK_SECONDS_PER_SET);
  }, 0);

  const totalMinutes = totalSeconds / 60;
  return Math.max(0, Math.round(totalMinutes / 5) * 5);
}

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
export function getWeekStart(date: Date = nowInIST()): string {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // shift so Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * @deprecated Weekday-index guess that ignores program progress (e.g. always
 * lands on Day 4 for a 4-day program on a Saturday). Use `resolveTodaysSession`
 * instead, which accounts for completed dayLogs and in-progress sessions.
 */
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

/** Same-muscle-group alternatives for a swap-exercise affordance, excluding skipped exercises. */
export function getAlternateExercises(
  original: Exercise | undefined,
  exercises: Exercise[],
  skippedExerciseIds: Set<string> | string[] = new Set()
) {
  if (!original) return [];
  const skippedSet = new Set(skippedExerciseIds);
  const originalGroup = normalizeMuscleToken(original.muscleGroup);
  return exercises
    .filter(
      (candidate) =>
        candidate.id !== original.id &&
        !skippedSet.has(candidate.id) &&
        normalizeMuscleToken(candidate.muscleGroup) === originalGroup
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Get top recommended alternative exercise for a given exercise */
export function getRecommendedAlternative(
  original: Exercise | undefined,
  exercises: Exercise[],
  skippedExerciseIds: Set<string> | string[] = new Set()
): Exercise | null {
  const alternatives = getAlternateExercises(original, exercises, skippedExerciseIds);
  return alternatives[0] ?? null;
}

/** Cycles through same-muscle alternatives (including back to the original) each time it's called. */
export function getNextExerciseSwap(
  original: Exercise | undefined,
  currentExerciseId: string,
  exercises: Exercise[],
  skippedExerciseIds: Set<string> | string[] = new Set()
) {
  if (!original) return null;
  const alternatives = getAlternateExercises(original, exercises, skippedExerciseIds);
  const cycle = [original, ...alternatives];
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
