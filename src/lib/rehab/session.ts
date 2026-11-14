/**
 * Saved rehab runs: input validation (server action boundary), the stored-document mapping,
 * and merging them into the workout history. Pure, no I/O, so it is unit-tested.
 *
 * Rehab is history only. It never feeds the weekly streak or "days trained": those stay
 * workout-only, so the progress page builds them from workouts and lifts, not from here.
 */
import { sanitizeConditionIds } from "./routine";

/** Most exercises a combined routine can hold; a generous ceiling for validation. */
const MAX_EXERCISES = 60;
const MAX_DURATION_SEC = 60 * 60 * 6;
/** A run must have started within this window before it was saved. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** Tolerated client clock drift ahead of the server. */
const FUTURE_SLACK_MS = 5 * 60 * 1000;

/** How the member felt after a run. */
export const REHAB_FEELINGS = ["better", "same", "worse"] as const;
export type RehabFeeling = (typeof REHAB_FEELINGS)[number];

export function parseRehabFeeling(v: unknown): RehabFeeling | undefined {
  return typeof v === "string" && (REHAB_FEELINGS as readonly string[]).includes(v) ? (v as RehabFeeling) : undefined;
}

export type RehabRunInput = {
  runId: string;
  conditionIds: string[];
  startedAt: string;
  durationSec: number;
  exercisesCompleted: number;
  exercisesSkipped: number;
  feeling?: RehabFeeling;
};

/** The document stored at users/{uid}/rehabSessions/{runId}. */
export type RehabSessionDoc = {
  conditionIds: string[];
  startedAt: string;
  completedAt: string;
  durationSec: number;
  exercisesCompleted: number;
  exercisesSkipped: number;
  feeling?: RehabFeeling;
};

export type RehabSession = RehabSessionDoc & { id: string };

export type RehabRunResult =
  | { ok: true; id: string; doc: RehabSessionDoc }
  | { ok: false; reason: "invalid" | "empty" };

const RUN_ID = /^[A-Za-z0-9_-]{8,80}$/;

function wholeCount(v: unknown, max: number): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max ? v : null;
}

/**
 * Validate a finished run from the client. `completedAt` is stamped from the server clock
 * (`now`), never trusted from the client. A run with no completed exercises is "empty": the
 * caller treats it as a successful no-op and writes nothing.
 */
export function validateRehabRun(input: unknown, now: Date = new Date()): RehabRunResult {
  if (!input || typeof input !== "object") return { ok: false, reason: "invalid" };
  const r = input as Record<string, unknown>;

  const exercisesCompleted = wholeCount(r.exercisesCompleted, MAX_EXERCISES);
  const exercisesSkipped = wholeCount(r.exercisesSkipped, MAX_EXERCISES);
  if (exercisesCompleted === null || exercisesSkipped === null) return { ok: false, reason: "invalid" };
  if (exercisesCompleted + exercisesSkipped > MAX_EXERCISES) return { ok: false, reason: "invalid" };
  if (exercisesCompleted === 0) return { ok: false, reason: "empty" };

  if (typeof r.runId !== "string" || !RUN_ID.test(r.runId)) return { ok: false, reason: "invalid" };

  if (!Array.isArray(r.conditionIds)) return { ok: false, reason: "invalid" };
  const conditionIds = sanitizeConditionIds(r.conditionIds);
  if (conditionIds.length === 0) return { ok: false, reason: "invalid" };

  if (typeof r.startedAt !== "string") return { ok: false, reason: "invalid" };
  const started = new Date(r.startedAt);
  const startedMs = started.getTime();
  if (Number.isNaN(startedMs)) return { ok: false, reason: "invalid" };
  if (startedMs > now.getTime() + FUTURE_SLACK_MS || startedMs < now.getTime() - MAX_AGE_MS) {
    return { ok: false, reason: "invalid" };
  }

  if (typeof r.durationSec !== "number" || !Number.isFinite(r.durationSec)) return { ok: false, reason: "invalid" };
  if (r.durationSec < 0 || r.durationSec > MAX_DURATION_SEC) return { ok: false, reason: "invalid" };

  const feeling = parseRehabFeeling(r.feeling);

  return {
    ok: true,
    id: r.runId,
    doc: {
      conditionIds,
      startedAt: started.toISOString(),
      completedAt: now.toISOString(),
      durationSec: Math.round(r.durationSec),
      exercisesCompleted,
      exercisesSkipped,
      ...(feeling ? { feeling } : {})
    }
  };
}

/** Map a stored document to a RehabSession, or null when it is unusable. */
export function mapRehabSession(id: string, data: Record<string, unknown> | undefined): RehabSession | null {
  if (!data) return null;
  const completedAt = typeof data.completedAt === "string" ? data.completedAt : "";
  if (!completedAt || Number.isNaN(new Date(completedAt).getTime())) return null;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : 0);
  return {
    id,
    conditionIds: sanitizeConditionIds(data.conditionIds),
    startedAt: typeof data.startedAt === "string" ? data.startedAt : completedAt,
    completedAt,
    durationSec: num(data.durationSec),
    exercisesCompleted: num(data.exercisesCompleted),
    exercisesSkipped: num(data.exercisesSkipped),
    ...(parseRehabFeeling(data.feeling) ? { feeling: parseRehabFeeling(data.feeling) } : {})
  };
}

/** Feelings of the most recent sessions that recorded one, oldest first, for the trend strip. */
export function recentFeelings(sessions: RehabSession[], count = 7): RehabFeeling[] {
  return sessions
    .filter((s) => s.feeling)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, count)
    .reverse()
    .map((s) => s.feeling as RehabFeeling);
}

export type HistoryEntry<W extends { id: string }> =
  | { kind: "workout"; id: string; at: string; workout: W }
  | { kind: "rehab"; id: string; at: string; rehab: RehabSession };

/** Workouts and rehab runs as one list, newest first by when they finished. */
export function mergeHistory<W extends { id: string }>(
  workouts: W[],
  workoutAt: (w: W) => string,
  rehab: RehabSession[]
): HistoryEntry<W>[] {
  const entries: HistoryEntry<W>[] = [
    ...workouts.map((w): HistoryEntry<W> => ({ kind: "workout", id: `w:${w.id}`, at: workoutAt(w), workout: w })),
    ...rehab.map((r): HistoryEntry<W> => ({ kind: "rehab", id: `r:${r.id}`, at: r.completedAt, rehab: r }))
  ];
  return entries.sort((a, b) => b.at.localeCompare(a.at));
}
