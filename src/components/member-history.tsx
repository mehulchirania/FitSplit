"use client";

import { useMemo, useState } from "react";
import { Dumbbell } from "@/components/icons";
import type {
  ActivityLog,
  DayLog,
  Exercise,
  LiftLog,
  MacroLog,
  MacroNutritionTarget
} from "@/types/domain";

const SKIP_REASON_LABELS: Record<string, string> = {
  rest: "Rest day",
  no_time: "No time",
  equipment: "No equipment",
  sick: "Feeling sick",
  other: "Other"
};

const DEFAULT_MACRO_TARGET: Required<MacroNutritionTarget> = {
  calories: 2200,
  protein: 140,
  carbs: 240,
  fat: 70,
  waterLiters: 3,
  notes: ""
};

function dateKeyFromIso(iso?: string) {
  return iso ? iso.slice(0, 10) : "";
}

function formatDate(key: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata"
    }).format(new Date(`${key}T12:00:00`));
  } catch {
    return key;
  }
}

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata"
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function isMacroTargetMet(log: MacroLog, target?: MacroNutritionTarget) {
  const goals = {
    calories: target?.calories || DEFAULT_MACRO_TARGET.calories,
    protein: target?.protein || DEFAULT_MACRO_TARGET.protein,
    carbs: target?.carbs || DEFAULT_MACRO_TARGET.carbs,
    fat: target?.fat || DEFAULT_MACRO_TARGET.fat
  };
  const calories = Math.round(log.protein * 4 + log.carbs * 4 + log.fat * 9);
  return (
    log.protein >= goals.protein &&
    log.carbs >= goals.carbs &&
    log.fat >= goals.fat &&
    calories >= goals.calories
  );
}

type HistoryDay = {
  key: string;
  logs: LiftLog[];
  dayLog: DayLog | null;
  activities: ActivityLog[];
  macroLog: MacroLog | null;
};

export function MemberHistory({
  liftLogs,
  exercises,
  dayLogs,
  activityLogs = [],
  macroLogs = [],
  macroTarget
}: {
  liftLogs: LiftLog[];
  exercises: Exercise[];
  dayLogs: DayLog[];
  activityLogs?: ActivityLog[];
  macroLogs?: MacroLog[];
  macroTarget?: MacroNutritionTarget;
}) {
  const [expanded, setExpanded] = useState(false);
  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  const prMap = useMemo(() => {
    return liftLogs.reduce<Map<string, number>>((acc, log) => {
      if (log.weight && log.exerciseId) {
        acc.set(log.exerciseId, Math.max(acc.get(log.exerciseId) ?? 0, log.weight));
      }
      return acc;
    }, new Map());
  }, [liftLogs]);

  const allDays = useMemo<HistoryDay[]>(() => {
    const byDay = new Map<string, HistoryDay>();
    const ensureDay = (key: string) => {
      if (!byDay.has(key)) {
        byDay.set(key, { key, logs: [], dayLog: null, activities: [], macroLog: null });
      }
      return byDay.get(key)!;
    };

    for (const log of liftLogs) {
      const key = dateKeyFromIso(log.loggedAt);
      if (key) ensureDay(key).logs.push(log);
    }

    for (const dayLog of dayLogs) {
      const key = dateKeyFromIso(dayLog.loggedAt);
      if (key && !ensureDay(key).dayLog) ensureDay(key).dayLog = dayLog;
    }

    for (const activity of activityLogs) {
      const key = dateKeyFromIso(activity.loggedAt);
      if (key) ensureDay(key).activities.push(activity);
    }

    for (const macroLog of macroLogs) {
      if (macroLog.date) ensureDay(macroLog.date).macroLog = macroLog;
    }

    return Array.from(byDay.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [activityLogs, dayLogs, liftLogs, macroLogs]);

  if (allDays.length === 0) {
    return (
      <div className="list-panel" style={{ textAlign: "center", padding: "48px 24px" }}>
        <Dumbbell />
        <h2 style={{ marginTop: 8 }}>No activity logged yet</h2>
        <p style={{ color: "var(--text-soft)", marginBottom: 0 }}>
          Log a set, cardio session, stretch, or macros to build your history.
        </p>
      </div>
    );
  }

  const visibleDays = expanded ? allDays : allDays.slice(0, 5);

  return (
    <section className="list-panel" style={{ padding: 0 }}>
      {visibleDays.map(({ key: dayKey, logs: rawLogs, dayLog, activities, macroLog }) => {
        const sortedLogs = [...rawLogs].sort((a, b) => (b.loggedAt ?? "").localeCompare(a.loggedAt ?? ""));
        const sortedActivities = [...activities].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
        const muscleGroups = Array.from(
          new Set(sortedLogs.map((log) => exerciseById.get(log.exerciseId)?.muscleGroup).filter(Boolean))
        ) as string[];
        const dayPRs = sortedLogs.filter(
          (log) => log.weight && log.weight === prMap.get(log.exerciseId)
        ).length;
        const cardioCount = sortedActivities.filter((log) => log.type === "cardio").length;
        const stretchCount = sortedActivities.filter((log) => log.type === "stretch").length;
        const macroMet = macroLog ? isMacroTargetMet(macroLog, macroTarget) : false;

        return (
          <article key={dayKey} className="history-day-card">
            <header className="history-day-header">
              <div>
                <h2 style={{ margin: 0, fontSize: "1rem" }}>{formatDate(dayKey)}</h2>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--text-soft)" }}>
                  {sortedLogs.length > 0
                    ? (muscleGroups.join(" / ") || "Mixed session")
                    : sortedActivities.length > 0
                      ? "Cardio and mobility"
                      : macroLog
                        ? "Nutrition logged"
                        : dayLog?.status === "completed"
                          ? "Planned day done"
                          : dayLog?.status === "skipped"
                            ? "No training"
                            : "Custom activity"}
                </p>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {sortedLogs.length > 0 && (
                  <span className="status-pill status-neutral">
                    {sortedLogs.length} set{sortedLogs.length === 1 ? "" : "s"}
                  </span>
                )}
                {dayPRs > 0 && <span className="status-pill status-active">{dayPRs} PR</span>}
                {cardioCount > 0 && <span className="status-pill status-neutral">{cardioCount} cardio</span>}
                {stretchCount > 0 && <span className="status-pill status-neutral">{stretchCount} stretch</span>}
                {macroMet && <span className="status-pill status-active">Macro target hit</span>}
                {dayLog?.status === "completed" && (
                  <span className="status-pill status-active">Day done</span>
                )}
                {dayLog?.status === "skipped" && (
                  <span className="status-pill status-inactive">
                    Skipped{dayLog.skipReason ? ` / ${SKIP_REASON_LABELS[dayLog.skipReason] ?? "Other"}` : ""}
                  </span>
                )}
                {dayLog?.status === "modified" && (
                  <span className="status-pill status-neutral">Different activity</span>
                )}
              </div>
            </header>

            {dayLog?.note && (
              <div className="history-day-note">
                <span className="history-day-note-icon">
                  {dayLog.status === "completed" ? "Done" : dayLog.status === "skipped" ? "Skip" : "Note"}
                </span>
                <span>{dayLog.note}</span>
              </div>
            )}

            {sortedLogs.length > 0 && (
              <div className="history-day-logs">
                {sortedLogs.map((log) => {
                  const isPR = log.weight && log.weight === prMap.get(log.exerciseId);
                  const exerciseName = exerciseById.get(log.exerciseId)?.name ?? "Exercise";
                  const isTrainerLogged = log.source === "trainer";
                  return (
                    <div className="history-log-row" key={log.id}>
                      <span className="history-log-name">
                        {exerciseName}
                        {isPR && <span className="pr-chip" style={{ marginLeft: 6 }}>PR</span>}
                        {isTrainerLogged && (
                          <span className="pt-trainer-badge" style={{ marginLeft: 6 }} title="Logged by trainer in PT session">
                            PT
                          </span>
                        )}
                      </span>
                      <span className="history-log-stats">
                        {log.weight}kg x {log.sets} x {log.reps}
                      </span>
                      <span className="history-log-time">{formatTime(log.loggedAt ?? "")}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {sortedActivities.length > 0 && (
              <div className="history-day-logs">
                {sortedActivities.map((activity) => (
                  <div className="history-log-row" key={activity.id}>
                    <span className="history-log-name">
                      {activity.name}
                      <span className="status-pill status-neutral" style={{ marginLeft: 6 }}>
                        {activity.type === "cardio" ? "Cardio" : "Stretch"}
                      </span>
                    </span>
                    <span className="history-log-stats">
                      {activity.duration ? `${activity.duration} min` : "Logged"}
                      {activity.distance ? ` / ${activity.distance} km` : ""}
                    </span>
                    <span className="history-log-time">{formatTime(activity.loggedAt)}</span>
                  </div>
                ))}
              </div>
            )}

            {macroLog && (
              <div className="history-day-note">
                <span className="history-day-note-icon">Macros</span>
                <span>
                  {macroLog.protein}g protein / {macroLog.carbs}g carbs / {macroLog.fat}g fat / {macroLog.water}L water
                </span>
              </div>
            )}
          </article>
        );
      })}

      {allDays.length > 5 && (
        <div style={{ display: "flex", justifyContent: "center", padding: "14px" }}>
          <button className="history-toggle-btn" onClick={() => setExpanded((value) => !value)} type="button">
            {expanded ? "Collapse history" : `Expand history (${allDays.length - 5} more)`}
          </button>
        </div>
      )}
    </section>
  );
}
