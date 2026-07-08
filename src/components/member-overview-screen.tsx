"use client";

import Link from "next/link";
import type { Exercise, LiftLog, DayLog, WorkoutProgram, GymNotice } from "@/types/domain";
import { GymNoticeBoard } from "@/components/gym-notice-board";

interface OverviewScreenProps {
  firstName: string;
  gymName: string;
  program: WorkoutProgram | null;
  currentWeek: number | null;
  exercises: Exercise[];
  liftLogs: LiftLog[];
  dayLogs: DayLog[];
  weeklyStreak: number;
  daysTrainedThisWeek: number;
  weeklyTarget: number;
  coachNote?: string | null;
  coachNoteFrom?: string | null;
  gymNotices?: GymNotice[] | null;
  goWorkout: () => void;
  goLogs: () => void;
}

const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function startOfWeek(d: Date) {
  const s = new Date(d);
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  s.setHours(0, 0, 0, 0);
  return s;
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** % of the trailing 4 weeks' target training days that were actually trained. */
function computeAdherencePct(liftLogs: LiftLog[], dayLogs: DayLog[], weeklyTarget: number) {
  const since = new Date();
  since.setDate(since.getDate() - 28);
  const trainedDays = new Set<string>();
  for (const log of liftLogs) {
    if (!log.loggedAt) continue;
    const d = new Date(log.loggedAt);
    if (d >= since) trainedDays.add(dateKey(d));
  }
  for (const log of dayLogs) {
    if (log.status !== "completed" || !log.loggedAt) continue;
    const d = new Date(log.loggedAt);
    if (d >= since) trainedDays.add(dateKey(d));
  }
  const target = Math.max(1, weeklyTarget * 4);
  return Math.min(100, Math.round((trainedDays.size / target) * 100));
}

/** Most recently-achieved PR (max weight per exercise, newest one first). */
function getRecentPR(liftLogs: LiftLog[], exercises: Exercise[]) {
  const maxByExercise = new Map<string, number>();
  for (const log of liftLogs) {
    if (!log.exerciseId || typeof log.weight !== "number") continue;
    const current = maxByExercise.get(log.exerciseId) ?? 0;
    if (log.weight > current) maxByExercise.set(log.exerciseId, log.weight);
  }
  const sorted = [...liftLogs]
    .filter((l) => l.loggedAt)
    .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
  for (const log of sorted) {
    if (log.weight > 0 && log.weight === maxByExercise.get(log.exerciseId)) {
      const ex = exercises.find((e) => e.id === log.exerciseId);
      return { name: ex?.name ?? "Lift", weight: log.weight, reps: log.reps };
    }
  }
  return null;
}

export function OverviewScreen({
  firstName, gymName, program, currentWeek, exercises, liftLogs, dayLogs,
  weeklyStreak, daysTrainedThisWeek, weeklyTarget, coachNote, coachNoteFrom, gymNotices,
  goWorkout, goLogs,
}: OverviewScreenProps) {
  const today = new Date();
  const day = program?.days?.[0] ?? null;
  const liftsCount = day?.exercises?.length ?? 0;
  const totalSets = (day?.exercises ?? []).reduce((s, e) => s + (e.sets ?? 0), 0);
  const estMin = liftsCount * 8;
  const exerciseNames = (day?.exercises ?? [])
    .map((e) => exercises.find((x) => x.id === e.exerciseId)?.name)
    .filter(Boolean)
    .join(" · ");

  const adherencePct = computeAdherencePct(liftLogs, dayLogs, weeklyTarget);
  const recentPR = getRecentPR(liftLogs, exercises);

  const weekStart = startOfWeek(today);
  const trainedDates = new Set(
    liftLogs.filter((l) => l.loggedAt).map((l) => dateKey(new Date(l.loggedAt)))
  );
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const key = dateKey(d);
    const isToday = key === dateKey(today);
    const isPast = d < today && !isToday;
    return {
      label: WEEKDAY_LABELS[i],
      trained: trainedDates.has(key),
      isToday,
      isPast,
    };
  });

  const recentActivity = [...liftLogs]
    .filter((l) => l.loggedAt)
    .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())
    .slice(0, 3)
    .map((l) => {
      const ex = exercises.find((e) => e.id === l.exerciseId);
      return {
        id: l.id,
        title: ex?.name ?? "Lift logged",
        meta: l.weight > 0 ? `${l.weight} kg × ${l.reps}` : `${l.reps} reps`,
        time: new Date(l.loggedAt).toLocaleString("en-IN", { weekday: "short", hour: "2-digit", minute: "2-digit" }),
      };
    });

  return (
    <section className="m3d-ov">
      <div className="m3d-ov__header">
        <span className="m3d-ov__avatar">{firstName.charAt(0).toUpperCase()}</span>
        <div>
          <span className="m3d-ov__eyebrow">MEMBER · {gymName.toUpperCase()}</span>
          <h1 className="m3d-ov__name">{firstName}</h1>
          <div className="m3d-ov__sub">
            {program ? `${program.title} · ${program.daysPerWeek}-day` : "No program assigned"}
            {currentWeek ? ` · Week ${currentWeek}` : ""}
            {coachNoteFrom ? ` · Coach ${coachNoteFrom}` : ""}
          </div>
        </div>
      </div>

      <div className="m3d-ov__stats">
        <div className="m3d-ov__stat">
          <strong>{adherencePct}%</strong>
          <span>ADHERENCE · 4 WK</span>
        </div>
        <div className="m3d-ov__stat">
          <strong>{weeklyStreak} <small>wks</small></strong>
          <span>WORKOUT STREAK</span>
        </div>
        <div className="m3d-ov__stat">
          <strong>{daysTrainedThisWeek}<span className="m3d-ov__stat-of">/{weeklyTarget}</span></strong>
          <span>SESSIONS THIS WEEK</span>
        </div>
        <div className="m3d-ov__stat">
          <strong>{recentPR ? `${recentPR.weight} kg × ${recentPR.reps}` : "—"}</strong>
          <span>RECENT PR{recentPR ? ` · ${recentPR.name.toUpperCase()}` : ""}</span>
        </div>
      </div>

      <div className="m3d-ov__today">
        <span className="m3d-ov__section-label">
          TODAY · {today.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}
        </span>
        <div className="m3d-ov__today-row">
          <button type="button" className="m3d-ov__today-btn" onClick={goWorkout}>
            {day ? (
              <>
                <div className="m3d-ov__today-title">{day.title} <span className="m3d-ov__today-day">· Day {day.dayNumber}</span></div>
                {exerciseNames && <div className="m3d-ov__today-ex">{exerciseNames}</div>}
                <div className="m3d-ov__today-meta">{liftsCount} lifts · {totalSets} sets · est. {estMin} min</div>
              </>
            ) : (
              <div className="m3d-ov__today-title">No workout plan assigned</div>
            )}
          </button>
          <button type="button" className="m3d-ov__cta" onClick={goWorkout}>
            {day ? "Continue workout →" : "View workout →"}
          </button>
        </div>

        <div className="m3d-ov__week">
          {weekDays.map((d) => (
            <div key={d.label} className={`m3d-ov__day${d.isToday ? " m3d-ov__day--today" : ""}${d.trained ? " m3d-ov__day--done" : ""}`}>
              <div className="m3d-ov__day-dot">
                {d.trained ? "✓" : d.isToday ? "•" : ""}
              </div>
              <span>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {coachNote && (
        <div className="m3d-ov__coach">
          <span className="m3d-ov__section-label">COACH&apos;S NOTE</span>
          <p>{coachNote}</p>
        </div>
      )}

      {gymNotices && gymNotices.length > 0 && (
        <div className="mcr-notices-wrap">
          <GymNoticeBoard notices={gymNotices} />
        </div>
      )}

      <div className="m3d-ov__activity">
        <div className="m3d-ov__activity-head">
          <span className="m3d-ov__section-label">RECENT ACTIVITY</span>
          <button type="button" className="m3d-ov__view-all" onClick={goLogs}>View all →</button>
        </div>
        {recentActivity.length === 0 ? (
          <p className="mcr-empty-small">No lift logs yet — start your first workout!</p>
        ) : (
          recentActivity.map((a) => (
            <div key={a.id} className="m3d-ov__activity-row">
              <span className="m3d-ov__activity-dot" />
              <span className="m3d-ov__activity-title">{a.title}</span>
              <span className="m3d-ov__activity-meta">{a.meta}</span>
              <span className="m3d-ov__activity-time">{a.time}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
