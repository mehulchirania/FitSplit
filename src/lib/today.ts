/**
 * Pure helpers behind the Today screen and the workout logger: which day of the
 * active plan is next, which days of the week were trained, and small formatters.
 * No I/O here, so everything is unit-tested.
 *
 * The app keeps every calendar day in Asia/Kolkata (see nowInIST in workout-utils),
 * so date keys below are built the same way.
 */
import type { WorkoutDay } from "@/types/domain";

const IST = "Asia/Kolkata";

/** YYYY-MM-DD in IST for an instant (or ISO string). */
export function istDateKey(value: Date | string = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(date);
}

function keyToUtcNoon(key: string) {
  return new Date(`${key}T12:00:00Z`);
}

/** Monday (YYYY-MM-DD) of the week that contains the given date key. */
export function weekStartOf(dateKey: string): string {
  const date = keyToUtcNoon(dateKey);
  const sinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - sinceMonday);
  return date.toISOString().slice(0, 10);
}

/** The seven date keys, Monday first, of the week starting `weekStart`. */
export function weekDateKeys(weekStart: string): string[] {
  const start = keyToUtcNoon(weekStart);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export type CompletedWorkout = {
  /** Plan-day id the workout was done for, when known. */
  dayId?: string;
  dayTitle?: string;
  /** ISO timestamp the workout was finished. */
  completedAt: string;
};

/** Index of the plan day a history entry refers to: by id, then title, then "day-N" suffix. */
export function matchDayIndex(days: WorkoutDay[], ref: { dayId?: string; dayTitle?: string }): number {
  if (ref.dayId) {
    const byId = days.findIndex((d) => d.id === ref.dayId);
    if (byId >= 0) return byId;
  }
  if (ref.dayTitle) {
    const byTitle = days.findIndex((d) => d.title === ref.dayTitle);
    if (byTitle >= 0) return byTitle;
  }
  const suffix = ref.dayId?.match(/day-(\d+)$/)?.[1];
  if (suffix) {
    const n = Number(suffix) - 1;
    if (n >= 0 && n < days.length) return n;
  }
  return -1;
}

/**
 * The day to do next: the one after the most recent completed workout of this plan,
 * wrapping around. A brand-new plan (nothing completed since it was picked) starts at day 1.
 */
export function resolveNextDayIndex(days: WorkoutDay[], history: CompletedWorkout[], assignedAt?: string): number {
  if (days.length === 0) return 0;
  const since = assignedAt ? new Date(assignedAt).getTime() : 0;
  const recent = history
    .filter((h) => new Date(h.completedAt).getTime() >= since)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  for (const entry of recent) {
    const index = matchDayIndex(days, entry);
    if (index >= 0) return (index + 1) % days.length;
  }
  return 0;
}

/** First whole number in a rep prescription ("8-12" -> 8, "10 / side" -> 10, "AMRAP" -> null). */
export function parseReps(reps?: string): number | null {
  const match = reps?.match(/\d+/);
  return match ? Number(match[0]) : null;
}

/** "42 min" / "1 h 05 min" style duration from seconds. */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.max(0, Math.round(totalSeconds / 60));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

/** m:ss clock for timers. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Weight with no trailing zeros: 60 -> "60", 62.5 -> "62.5". */
export function formatKg(kg: number): string {
  return Number.isInteger(kg) ? String(kg) : kg.toFixed(1).replace(/\.0$/, "");
}

/**
 * Consecutive weeks (Monday-first) with at least one trained day, counting back from this
 * week. A week still in progress without training does not break a streak that is alive.
 */
export function weeklyStreak(trainedKeys: Iterable<string>, todayKey: string): number {
  const weeks = new Set<string>();
  for (const key of trainedKeys) if (key) weeks.add(weekStartOf(key));
  let cursor = weekStartOf(todayKey);
  if (!weeks.has(cursor)) cursor = shiftWeek(cursor, -1);
  let streak = 0;
  while (weeks.has(cursor)) {
    streak += 1;
    cursor = shiftWeek(cursor, -1);
  }
  return streak;
}

function shiftWeek(weekStart: string, delta: number) {
  const d = keyToUtcNoon(weekStart);
  d.setUTCDate(d.getUTCDate() + delta * 7);
  return d.toISOString().slice(0, 10);
}

/** "1 exercise" / "6 exercises". */
export function countLabel(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/**
 * IST date keys on which a workout was actually logged: a finished session or a day marked
 * completed. Stray individual sets (an abandoned workout) and rehab runs do not count, so
 * the week strip, "days trained" and the streak only reflect real workouts.
 */
export function trainedDateKeys(
  sessions: { startedAt: string; endedAt?: string }[],
  dayLogs: { status: string; loggedAt: string }[]
): Set<string> {
  const keys = new Set<string>();
  for (const s of sessions) keys.add(istDateKey(s.endedAt ?? s.startedAt));
  for (const l of dayLogs) if (l.status === "completed") keys.add(istDateKey(l.loggedAt));
  keys.delete("");
  return keys;
}
