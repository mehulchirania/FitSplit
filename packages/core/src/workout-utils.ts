import type { Exercise, LiftLog, MuscleGroup, SkipReason, WorkoutExercise } from "./domain";

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

// ─── 1RM Estimation (ported from opengym frontend/src/lib/onerm.js) ───────────

/**
 * Maximum reps for which 1RM extrapolation is considered reliable.
 * Anything above this is clamped before formula application.
 */
export const ONE_RM_REP_CAP = 12;

export type OneRmFormula = "epley" | "brzycki" | "lombardi";

const ONE_RM_FORMULAS: Record<OneRmFormula, (w: number, r: number) => number> = {
  epley:    (w, r) => w * (1 + r / 30),
  brzycki:  (w, r) => w * 36 / (37 - r),
  lombardi: (w, r) => w * Math.pow(r, 0.1),
};

/**
 * Estimate the one-rep max for a given weight and rep count using the specified
 * formula. Reps are capped at ONE_RM_REP_CAP to avoid wild extrapolations.
 * Returns 0 for bodyweight sets (weight === 0) or invalid input.
 */
export function estimate1RM(
  weightKg: number,
  reps: number,
  formula: OneRmFormula = "epley"
): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  const r = Math.min(reps, ONE_RM_REP_CAP);
  if (r === 1) return weightKg; // already a true 1RM
  return Math.round(ONE_RM_FORMULAS[formula](weightKg, r));
}

/**
 * Best (highest) 1RM estimate across all three formulas for a given set.
 * More conservative than any single formula alone.
 */
export function best1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  return Math.max(
    estimate1RM(weightKg, reps, "epley"),
    estimate1RM(weightKg, reps, "brzycki"),
    estimate1RM(weightKg, reps, "lombardi")
  );
}

// ─── Weekly Streak (opengym frontend/src/lib/history.js) ──────────────────────

/**
 * Compute how many consecutive ISO weeks (Mon–Sun) the member has trained in,
 * counting backwards from the *current* week.
 *
 * A week counts when at least one date key in `trainedDateKeys` falls within it.
 * Uses the "weekly" (not daily) definition from opengym — far more forgiving
 * and better for retention psychology.
 *
 * `currentWeekStart` defaults to the IST-anchored Monday returned by
 * `getWeekStart()` so callers don't have to pass it explicitly.
 */
export function computeWeeklyStreak(
  trainedDateKeys: Set<string>,
  currentWeekStart: string = getWeekStart()
): number {
  if (trainedDateKeys.size === 0) return 0;

  let streak = 0;
  let weekStart = new Date(`${currentWeekStart}T00:00:00`);

  // Walk backwards week by week until we hit a week with no training
  for (let i = 0; i < 104; i++) { // cap at 2 years to avoid infinite loops
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const yyyy = weekStart.getFullYear();
    const mm = String(weekStart.getMonth() + 1).padStart(2, "0");
    const dd = String(weekStart.getDate()).padStart(2, "0");
    const weekStartKey = `${yyyy}-${mm}-${dd}`;
    const weekEndKey = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, "0")}-${String(weekEnd.getDate()).padStart(2, "0")}`;

    const trainedThisWeek = Array.from(trainedDateKeys).some(
      (key) => key >= weekStartKey && key < weekEndKey
    );

    if (!trainedThisWeek) break;
    streak++;

    // Step back one week
    weekStart.setDate(weekStart.getDate() - 7);
  }

  return streak;
}

// ─── Workout Volume ────────────────────────────────────────────────────────────

/**
 * Total training volume (kg × reps) for a set of completed sets.
 * Bodyweight sets (weight === 0) contribute 0 to volume — same convention as
 * opengym's `workoutVolume` helper.
 */
export function computeWorkoutVolume(
  sets: { weight: number; reps: number | string; done: boolean }[]
): number {
  let total = 0;
  for (const s of sets) {
    if (!s.done) continue;
    const r = typeof s.reps === "string" ? Number(s.reps) : s.reps;
    total += (s.weight ?? 0) * (Number.isFinite(r) ? r : 0);
  }
  return total;
}

// ─── Progressive Overload Engine (opengym frontend/src/lib/progression.js) ────

export type OverloadPolicy = "linear" | "double";

export type OverloadSuggestion = {
  /** Suggested next weight in kg (0 for bodyweight). */
  suggestedWeightKg: number;
  /** Suggested rep target (e.g. "8–10" or "10"). */
  suggestedReps: string;
  /** Human-readable explanation of why this number was chosen. */
  why: string;
};

/** Default load increment in kg (smallest meaningful plate change). */
const DEFAULT_INCREMENT_KG = 2.5;
/** How many consecutive successful sessions before adding load. */
const LINEAR_ADVANCE_AFTER = 1;
/** How many misses before a 10 % deload. */
const DELOAD_AFTER = 3;

/**
 * Suggest the next working set weight and reps based on recent history.
 *
 * `history` should be the member's logged sets for this exercise, most-recent
 * first. At least 1 entry is required; returns a hold suggestion for empty
 * history.
 *
 * Policies:
 *   - `linear`  — add `DEFAULT_INCREMENT_KG` each session after hitting reps.
 *   - `double`  — progress reps first, then weight (double-progression).
 */
export function suggestNextSet(
  history: { weight: number; reps: number | string }[],
  policy: OverloadPolicy = "linear"
): OverloadSuggestion {
  if (history.length === 0) {
    return {
      suggestedWeightKg: 0,
      suggestedReps: "8",
      why: "No history yet — start with a comfortable weight.",
    };
  }

  const last = history[0];
  const lastWeight = last.weight ?? 0;
  const lastReps = typeof last.reps === "string" ? Number(last.reps) || 0 : last.reps;

  // Count recent consecutive misses (reps below target of 8)
  const TARGET_REPS = 8;
  const misses = history.slice(0, DELOAD_AFTER).filter(
    (h) => (typeof h.reps === "string" ? Number(h.reps) : h.reps) < TARGET_REPS
  ).length;

  if (misses >= DELOAD_AFTER && lastWeight > 0) {
    const deloaded = Math.max(Math.round((lastWeight * 0.9) / DEFAULT_INCREMENT_KG) * DEFAULT_INCREMENT_KG, DEFAULT_INCREMENT_KG);
    return {
      suggestedWeightKg: deloaded,
      suggestedReps: String(TARGET_REPS),
      why: `${DELOAD_AFTER} consecutive sessions below target — deloading 10 % to ${deloaded} kg to rebuild quality reps.`,
    };
  }

  if (policy === "double") {
    // Double progression: hit rep ceiling (12) before adding weight
    const REP_CEILING = 12;
    if (lastReps >= REP_CEILING) {
      const next = lastWeight > 0 ? lastWeight + DEFAULT_INCREMENT_KG : 0;
      return {
        suggestedWeightKg: next,
        suggestedReps: String(TARGET_REPS),
        why: `Hit ${REP_CEILING} reps at ${lastWeight} kg — adding ${DEFAULT_INCREMENT_KG} kg and resetting reps to ${TARGET_REPS}.`,
      };
    }
    return {
      suggestedWeightKg: lastWeight,
      suggestedReps: String(lastReps + 1),
      why: `Still building reps at ${lastWeight} kg (${lastReps} → ${lastReps + 1}) before adding load.`,
    };
  }

  // Linear: add weight after LINEAR_ADVANCE_AFTER successful sessions
  const successes = history.slice(0, LINEAR_ADVANCE_AFTER).filter(
    (h) => (typeof h.reps === "string" ? Number(h.reps) : h.reps) >= TARGET_REPS
  ).length;

  if (successes >= LINEAR_ADVANCE_AFTER && lastWeight > 0) {
    const next = lastWeight + DEFAULT_INCREMENT_KG;
    return {
      suggestedWeightKg: next,
      suggestedReps: String(TARGET_REPS),
      why: `Hit ${TARGET_REPS}+ reps at ${lastWeight} kg — adding ${DEFAULT_INCREMENT_KG} kg (linear progression).`,
    };
  }

  return {
    suggestedWeightKg: lastWeight,
    suggestedReps: String(TARGET_REPS),
    why: lastWeight === 0
      ? "Bodyweight exercise — focus on hitting your rep target before adding load."
      : `Same weight (${lastWeight} kg) — aim for ${TARGET_REPS} clean reps before progressing.`,
  };
}

// ─── Effort Scale (RIR / RPE) — opengym frontend/src/lib/effort.js ────────────

export type EffortScale = "rir" | "rpe";

/**
 * Normalise RIR (Reps In Reserve, 0–10) or RPE (1–10 session scale) to a
 * canonical 0–10 effort score where 10 = maximal effort.
 *
 * RIR:  0 = failure (canonical 10), 10 = very easy (canonical 0)
 * RPE:  1 = minimal (canonical 1),  10 = maximal (canonical 10)
 */
export function toCanonicalEffort(value: number, scale: EffortScale): number {
  if (scale === "rpe") return Math.max(0, Math.min(10, value));
  // RIR: invert — 0 RIR is max effort
  return Math.max(0, Math.min(10, 10 - value));
}

/**
 * Convert a canonical 0–10 effort score back to the preferred display scale.
 */
export function fromCanonicalEffort(canonical: number, scale: EffortScale): number {
  if (scale === "rpe") return Math.round(Math.max(0, Math.min(10, canonical)));
  return Math.round(Math.max(0, Math.min(10, 10 - canonical)));
}

/** Format an effort value for display, e.g. "RIR 2" or "RPE 8". */
export function formatEffort(value: number, scale: EffortScale): string {
  return scale === "rir" ? `RIR ${value}` : `RPE ${value}`;
}

// ─── Muscle Volume Heatmap ─────────────────────────────────────────────────────

/**
 * Build a normalised (0–1) per-MuscleGroup intensity map from a set of lift
 * logs. Used by the muscle-map heatmap component to shade the body diagram.
 *
 * Volume per muscle group = Σ (weight × reps) for all logs in that group.
 * The resulting map is normalised against the maximum group volume so the
 * most-trained group always renders at full intensity (1.0).
 */
export function getMuscleHeatmap(
  liftLogs: { exerciseId: string; weight: number; reps: string | number }[],
  exercises: Pick<Exercise, "id" | "muscleGroup">[]
): Map<MuscleGroup, number> {
  const volumeByGroup = new Map<MuscleGroup, number>();

  for (const log of liftLogs) {
    const ex = exercises.find((e) => e.id === log.exerciseId);
    if (!ex) continue;
    const reps = typeof log.reps === "string" ? Number(log.reps) : log.reps;
    const vol = (log.weight ?? 0) * (Number.isFinite(reps) ? reps : 0);
    volumeByGroup.set(ex.muscleGroup, (volumeByGroup.get(ex.muscleGroup) ?? 0) + vol);
  }

  const maxVol = Math.max(0, ...volumeByGroup.values());
  if (maxVol === 0) return volumeByGroup;

  for (const [group, vol] of volumeByGroup) {
    volumeByGroup.set(group, vol / maxVol);
  }

  return volumeByGroup;
}

// ─── Activity Heatmap Data ─────────────────────────────────────────────────────

/**
 * Build a date-keyed (YYYY-MM-DD) activity count map for the trailing N days
 * (default 84 = 12 weeks), used by the GitHub-style calendar heatmap.
 *
 * For FitSplit the "count" is binary (0 or 1) since we track whether a day
 * was trained, not session counts. The map includes every day in the window
 * so the rendering component can always draw the full grid without gaps.
 */
export function buildActivityHeatmapData(
  trainedDateKeys: Set<string>,
  trailingDays = 84
): Map<string, number> {
  const result = new Map<string, number>();
  const today = nowInIST();

  for (let i = trailingDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const key = `${yyyy}-${mm}-${dd}`;
    result.set(key, trainedDateKeys.has(key) ? 1 : 0);
  }

  return result;
}
