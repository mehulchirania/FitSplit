"use client";

import type {
  ActivityLog,
  DayLog,
  Exercise,
  LiftLog,
  MacroLog,
  MemberProfile,
  WorkoutProgram,
} from "@/types/domain";
import { MemberProgressPanel } from "@/components/member-progress-panel";
import { WorkoutCalendar } from "@/components/workout-calendar";

interface ProgressScreenProps {
  exercises: Exercise[];
  liftLogs: LiftLog[];
  dayLogs: DayLog[];
  activityLogs: ActivityLog[];
  macroLogs: MacroLog[];
  macroTarget?: MemberProfile["macroNutritionTarget"];
  memberId: string;
  program: WorkoutProgram | null;
}

const MS_DAY = 24 * 60 * 60 * 1000;
const MS_WEEK = 7 * MS_DAY;
const MS_8WK = 8 * MS_WEEK;

/** A single logged set's rep count. Handles plain numbers and comma-separated multi-set entries. */
function parseRepsCount(reps: string): number {
  if (!reps) return 0;
  if (reps.includes(",")) {
    return reps
      .split(",")
      .map((r) => Number.parseFloat(r.trim()))
      .filter((n) => Number.isFinite(n))
      .reduce((sum, n) => sum + n, 0);
  }
  const n = Number.parseFloat(reps);
  return Number.isFinite(n) ? n : 0;
}

/** Epley estimated 1-rep-max. */
function epleyE1RM(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

/** Best (heaviest) e1RM among logs for an exercise at or before a cutoff date. Null if no logs qualify. */
function bestE1RMAtOrBefore(logs: LiftLog[], exerciseId: string, cutoff: Date): number | null {
  let best: number | null = null;
  for (const log of logs) {
    if (log.exerciseId !== exerciseId || !log.loggedAt || !(log.weight > 0)) continue;
    const d = new Date(log.loggedAt);
    if (d > cutoff) continue;
    const reps = parseRepsCount(log.reps) || 1;
    const e1rm = epleyE1RM(log.weight, reps);
    if (best === null || e1rm > best) best = e1rm;
  }
  return best;
}

function fmtDelta(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${Math.round(pct)}%`;
}

interface PersonalRecord {
  exerciseId: string;
  name: string;
  weight: number;
  reps: string;
  date: string;
}

/** All-time heaviest set per exercise, with the date it was first achieved. */
function getPersonalRecords(liftLogs: LiftLog[], exercises: Exercise[]): PersonalRecord[] {
  const bestByExercise = new Map<string, LiftLog>();
  for (const log of liftLogs) {
    if (!log.exerciseId || !(log.weight > 0) || !log.loggedAt) continue;
    const current = bestByExercise.get(log.exerciseId);
    if (!current || log.weight > current.weight) {
      bestByExercise.set(log.exerciseId, log);
    } else if (log.weight === current.weight && new Date(log.loggedAt) < new Date(current.loggedAt)) {
      // Prefer the earliest instance of a tied max — that's when the PR was actually set.
      bestByExercise.set(log.exerciseId, log);
    }
  }
  return [...bestByExercise.entries()]
    .map(([exerciseId, log]) => ({
      exerciseId,
      name: exercises.find((e) => e.id === exerciseId)?.name ?? "Lift",
      weight: log.weight,
      reps: log.reps,
      date: log.loggedAt,
    }))
    .sort((a, b) => b.weight - a.weight);
}

export function ProgressScreen({
  exercises,
  liftLogs,
  dayLogs,
  activityLogs,
  macroLogs,
  macroTarget,
  memberId,
  program,
}: ProgressScreenProps) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - MS_WEEK);
  const eightWeeksAgo = new Date(now.getTime() - MS_8WK);

  const benchExercise = exercises.find((e) => e.name.toLowerCase().includes("bench press"));
  const benchE1RM = benchExercise ? bestE1RMAtOrBefore(liftLogs, benchExercise.id, now) : null;
  const benchE1RMEarlier = benchExercise
    ? bestE1RMAtOrBefore(liftLogs, benchExercise.id, eightWeeksAgo)
    : null;
  const benchDeltaPct =
    benchE1RM !== null && benchE1RMEarlier !== null && benchE1RMEarlier > 0
      ? ((benchE1RM - benchE1RMEarlier) / benchE1RMEarlier) * 100
      : null;

  const volumeThisWeek = liftLogs.reduce((sum, log) => {
    if (!log.loggedAt || !(log.weight > 0)) return sum;
    const d = new Date(log.loggedAt);
    if (d < weekAgo || d > now) return sum;
    const reps = parseRepsCount(log.reps);
    const sets = log.sets && log.sets > 0 ? log.sets : 1;
    return sum + log.weight * reps * sets;
  }, 0);

  const setsThisWeek = liftLogs.reduce((sum, log) => {
    if (!log.loggedAt) return sum;
    const d = new Date(log.loggedAt);
    if (d < weekAgo || d > now) return sum;
    return sum + (log.sets && log.sets > 0 ? log.sets : 1);
  }, 0);

  const personalRecords = getPersonalRecords(liftLogs, exercises);
  const prsThisMonth = personalRecords.filter((pr) => now.getTime() - new Date(pr.date).getTime() <= 30 * MS_DAY).length;

  return (
    <section className="m3d-pg">
      <h1 className="m3d-pagehead__title">Progress</h1>

      <div className="m3d-pg__stats">
        <div className="m3d-pg__stat">
          <strong>{benchE1RM !== null ? `${Math.round(benchE1RM)} kg` : "—"}</strong>
          <span>
            BENCH e1RM{benchDeltaPct !== null ? ` · ${fmtDelta(benchDeltaPct)} 8 WK` : ""}
          </span>
        </div>
        <div className="m3d-pg__stat">
          <strong>{volumeThisWeek > 0 ? volumeThisWeek.toLocaleString("en-IN") : "0"} kg</strong>
          <span>VOLUME THIS WEEK</span>
        </div>
        <div className="m3d-pg__stat">
          <strong>{setsThisWeek}</strong>
          <span>SETS THIS WEEK</span>
        </div>
        <div className="m3d-pg__stat">
          <strong>{prsThisMonth}</strong>
          <span>PRS THIS MONTH</span>
        </div>
      </div>

      <div className="m3d-pg__prs">
        <span className="m3d-ov__section-label">PERSONAL RECORDS</span>
        {personalRecords.length === 0 ? (
          <p className="mcr-empty-small">No lifts logged yet — your PRs will show up here.</p>
        ) : (
          personalRecords.slice(0, 5).map((pr) => (
            <div key={pr.exerciseId} className="m3d-pg__pr-row">
              <span className="m3d-pg__pr-dot" />
              <span className="m3d-pg__pr-name">{pr.name}</span>
              <span className="m3d-pg__pr-value">{pr.weight} kg × {pr.reps}</span>
              <span className="m3d-pg__pr-date">
                {new Date(pr.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <MemberProgressPanel exercises={exercises} initialLiftLogs={liftLogs} dayLogs={dayLogs} memberId={memberId} program={program} />
        <WorkoutCalendar
          liftLogs={liftLogs}
          dayLogs={dayLogs}
          activityLogs={activityLogs}
          macroLogs={macroLogs}
          macroTarget={macroTarget}
        />
      </div>
    </section>
  );
}
