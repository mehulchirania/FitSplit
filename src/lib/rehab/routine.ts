/**
 * Pure helpers over the rehab catalogue: which conditions are valid, the combined routine
 * for several conditions (deduped), how it breaks into sets and sides, and how long it takes.
 * No I/O, so all of it is unit-tested.
 */
import { REHAB_CONDITIONS, REHAB_EXERCISES, type RehabCondition, type RehabExercise } from "./catalog";
import { dosageUnits, unitWorkSeconds } from "./dosage";

export { dosageLabel, dosageUnits, unitWorkSeconds, type Side } from "./dosage";

/** Getting into position for a new exercise. */
const SETUP_SECONDS = 10;
/** Shaking out between sets and switching sides. */
const SWITCH_SECONDS = 5;

export function getCondition(id: string): RehabCondition | undefined {
  return REHAB_CONDITIONS.find((c) => c.id === id);
}

/** Keep only known condition ids, once each, in the order given. Anything else is dropped. */
export function sanitizeConditionIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const v of value) {
    if (typeof v === "string" && getCondition(v)) seen.add(v);
  }
  return [...seen];
}

/** One condition's routine, as exercises. */
export function conditionExercises(id: string): RehabExercise[] {
  const condition = getCondition(id);
  if (!condition) return [];
  return condition.routine.flatMap((exerciseId) => REHAB_EXERCISES[exerciseId] ?? []);
}

/**
 * The combined routine for several conditions: each condition's exercises in order, with an
 * exercise that appears in more than one kept only at its first appearance.
 */
export function buildRoutine(conditionIds: string[]): RehabExercise[] {
  const seen = new Set<string>();
  const out: RehabExercise[] = [];
  for (const id of sanitizeConditionIds(conditionIds)) {
    for (const exercise of conditionExercises(id)) {
      if (seen.has(exercise.id)) continue;
      seen.add(exercise.id);
      out.push(exercise);
    }
  }
  return out;
}

export function exerciseSeconds(exercise: RehabExercise): number {
  const units = dosageUnits(exercise.dosage).length;
  return SETUP_SECONDS + units * unitWorkSeconds(exercise.dosage) + (units - 1) * SWITCH_SECONDS;
}

export function routineSeconds(exercises: RehabExercise[]): number {
  return exercises.reduce((sum, e) => sum + exerciseSeconds(e), 0);
}

/** Whole minutes for display ("~N min"); never less than 1 for a non-empty routine. */
export function routineMinutes(exercises: RehabExercise[]): number {
  if (exercises.length === 0) return 0;
  return Math.max(1, Math.round(routineSeconds(exercises) / 60));
}

