/**
 * Pure helpers for the weekly recap and the finish-summary PR list. No I/O.
 * Weeks are Monday-first IST weeks, matching today.ts.
 */
import { istDateKey, weekStartOf } from "@/lib/today";

export type RecapSession = { startedAt: string; endedAt?: string; volumeKg?: number };
export type RecapLift = { exerciseId: string; weight: number; loggedAt: string };

export type WeeklyRecap = {
  sessions: number;
  lastSessions: number;
  volume: number;
  lastVolume: number;
  /** Whole-percent change in volume vs last week, or null when last week had none. */
  volumeChangePct: number | null;
  prs: number;
  summary: string;
};

function shiftWeek(weekStart: string, delta: number) {
  const d = new Date(`${weekStart}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta * 7);
  return d.toISOString().slice(0, 10);
}

/** Exercises whose heaviest lift in `weekStart`'s week beat everything logged before it. */
export function countWeekPrs(lifts: RecapLift[], weekStart: string): number {
  const priorBest = new Map<string, number>();
  const weekBest = new Map<string, number>();
  for (const l of lifts) {
    if (!(l.weight > 0)) continue;
    const key = istDateKey(l.loggedAt);
    if (!key) continue;
    const ws = weekStartOf(key);
    if (ws < weekStart) priorBest.set(l.exerciseId, Math.max(priorBest.get(l.exerciseId) ?? 0, l.weight));
    else if (ws === weekStart) weekBest.set(l.exerciseId, Math.max(weekBest.get(l.exerciseId) ?? 0, l.weight));
  }
  let n = 0;
  for (const [id, w] of weekBest) {
    const prior = priorBest.get(id) ?? 0;
    if (prior > 0 && w > prior) n += 1; // a first-ever lift sets a baseline, not a record
  }
  return n;
}

export function weeklyRecap(sessions: RecapSession[], lifts: RecapLift[], todayKey: string): WeeklyRecap {
  const thisWeek = weekStartOf(todayKey);
  const lastWeek = shiftWeek(thisWeek, -1);
  const tally: Record<string, { n: number; vol: number }> = {
    [thisWeek]: { n: 0, vol: 0 },
    [lastWeek]: { n: 0, vol: 0 }
  };
  for (const s of sessions) {
    const key = istDateKey(s.endedAt ?? s.startedAt);
    if (!key) continue;
    const bucket = tally[weekStartOf(key)];
    if (!bucket) continue;
    bucket.n += 1;
    bucket.vol += s.volumeKg ?? 0;
  }
  const cur = tally[thisWeek];
  const prev = tally[lastWeek];
  const volumeChangePct = prev.vol > 0 ? Math.round(((cur.vol - prev.vol) / prev.vol) * 100) : null;
  const base = {
    sessions: cur.n,
    lastSessions: prev.n,
    volume: Math.round(cur.vol),
    lastVolume: Math.round(prev.vol),
    volumeChangePct,
    prs: countWeekPrs(lifts, thisWeek)
  };
  return { ...base, summary: recapSentence(base) };
}

export function recapSentence(r: Omit<WeeklyRecap, "summary">): string {
  const sess = (n: number) => `${n} ${n === 1 ? "session" : "sessions"}`;
  if (r.sessions === 0) {
    return r.lastSessions > 0 ? `No workouts yet this week. Last week you did ${sess(r.lastSessions)}.` : "No workouts yet this week.";
  }
  let sentence = `${sess(r.sessions)} this week`;
  if (r.lastSessions > 0) {
    sentence += r.sessions > r.lastSessions ? `, up from ${r.lastSessions}` : r.sessions < r.lastSessions ? `, down from ${r.lastSessions}` : ", level with last week";
  }
  if (r.volumeChangePct !== null && r.volumeChangePct !== 0) {
    sentence += ` and ${Math.abs(r.volumeChangePct)}% ${r.volumeChangePct > 0 ? "more" : "less"} volume`;
  }
  if (r.prs > 0) sentence += `, with ${r.prs} new ${r.prs === 1 ? "record" : "records"}`;
  return `${sentence}.`;
}

export type SessionRecord = { name: string; weight: number; prior: number };

/** PRs from this session: heaviest done set per exercise beating a non-zero prior best. */
export function sessionRecords(sets: { key: string; name: string; weight: number; prior: number }[]): SessionRecord[] {
  const best = new Map<string, SessionRecord>();
  for (const s of sets) {
    const cur = best.get(s.key);
    if (!cur || s.weight > cur.weight) best.set(s.key, { name: s.name, weight: s.weight, prior: s.prior });
  }
  return [...best.values()].filter((b) => b.prior > 0 && b.weight > b.prior);
}
