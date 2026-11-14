export * from "@fitsplit/core/workout-utils";

/* ── in-session helpers (pure) ───────────────────────────────────────────── */

type Timed = { sets?: number; restSeconds?: number };

/** Same model as estimateSessionMinutes, without rounding to 5, so trims can be compared precisely. */
function rawMinutes(items: Timed[]): number {
  return items.reduce((s, e) => s + (e.sets ?? 3) * ((e.restSeconds ?? 90) + 45), 0) / 60;
}

const SHORT_SESSION_MINUTES = 20;

/**
 * A shorter version of a day: sets are capped at 3, then accessories are dropped from the end
 * (first lifts, which plans order as the compounds, are kept) until it fits `targetMinutes`.
 * At least `minKeep` exercises always stay; if still over, later lifts are cut to 2 sets.
 */
export function trimSession<T extends Timed>(items: T[], targetMinutes = SHORT_SESSION_MINUTES, minKeep = 3): T[] {
  let out = items.map((e) => ({ ...e, sets: Math.min(e.sets ?? 3, 3) }));
  while (out.length > minKeep && rawMinutes(out) > targetMinutes) out = out.slice(0, -1);
  if (rawMinutes(out) > targetMinutes) {
    out = out.map((e, i) => (i >= 2 ? { ...e, sets: Math.min(e.sets, 2) } : e));
  }
  return out;
}

export function sessionMinutes(items: Timed[]): number {
  return Math.max(0, Math.round(rawMinutes(items) / 5) * 5);
}

const LOWER_BODY = /leg|quad|hamstring|glute|calf|calves|thigh/i;

/** The smallest sensible jump: 5 kg for lower body, 2.5 kg for upper. */
function overloadStep(muscleGroup: string): number {
  return LOWER_BODY.test(muscleGroup) ? 5 : 2.5;
}

/** Top of a rep prescription: "8-12" -> 12, "10" -> 10, "AMRAP" -> null. */
function topOfRepRange(reps?: string): number | null {
  const nums = reps?.match(/\d+/g)?.map(Number);
  return nums?.length ? Math.max(...nums) : null;
}

export type OverloadNudge = { fromKg: number; toKg: number; reps: number };

/**
 * `sessions` is newest first, each a list of sets. When the last two sessions both hit the top of
 * the prescribed rep range on every set (at a real weight), suggest a small bump on the latest weight.
 */
export function overloadNudge(
  sessions: Array<Array<{ weight: number; reps: number }>>,
  reps: string | undefined,
  muscleGroup: string
): OverloadNudge | null {
  const top = topOfRepRange(reps);
  if (!top || sessions.length < 2) return null;
  const [latest, previous] = sessions;
  const hit = (s: typeof latest) => s.length > 0 && s.every((x) => x.weight > 0 && x.reps >= top);
  if (!hit(latest) || !hit(previous)) return null;
  const fromKg = Math.max(...latest.map((x) => x.weight));
  return { fromKg, toKg: Math.round((fromKg + overloadStep(muscleGroup)) * 10) / 10, reps: top };
}

/** Other exercises for the same muscle group, same equipment first. Pure over a candidate list. */
export function swapAlternatives<T extends { id: string; name: string; muscleGroup: string; equipment: string }>(
  current: { id: string; muscleGroup: string; equipment: string },
  candidates: T[],
  limit = 12
): T[] {
  const pool = candidates.filter((c) => c.id !== current.id && c.muscleGroup === current.muscleGroup);
  const same = pool.filter((c) => c.equipment === current.equipment);
  const other = pool.filter((c) => c.equipment !== current.equipment);
  return [...same, ...other].slice(0, limit);
}
