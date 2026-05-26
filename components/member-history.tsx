/* eslint-disable @typescript-eslint/no-unused-vars */
import Link from "next/link";
import { Dumbbell } from "@/components/icons";
import type { DayLog, LiftLog, Exercise } from "@/types/domain";

const SKIP_REASON_LABELS: Record<string, string> = {
  rest: "Rest day",
  no_time: "No time",
  equipment: "No equipment",
  sick: "Feeling sick",
  other: "Other"
};

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function groupByDay(logs: LiftLog[]) {
  const buckets = new Map<string, LiftLog[]>();
  for (const log of logs) {
    if (!log.loggedAt) continue;
    const key = new Date(log.loggedAt).toDateString();
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(log);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
}

export function MemberHistory({
  liftLogs,
  exercises,
  dayLogs
}: {
  liftLogs: LiftLog[];
  exercises: Exercise[];
  dayLogs: DayLog[];
}) {
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const days = groupByDay(liftLogs);

  const dayLogByCalendarKey = new Map<string, DayLog>();
  for (const dl of dayLogs) {
    const key = new Date(dl.loggedAt).toDateString();
    if (!dayLogByCalendarKey.has(key)) {
      dayLogByCalendarKey.set(key, dl);
    }
  }

  const daysWithLifts = new Set(days.map(([key]) => key));

  const standaloneDayLogs: [string, DayLog][] = dayLogs
    .filter((dl) => {
      const key = new Date(dl.loggedAt).toDateString();
      return !daysWithLifts.has(key);
    })
    .map((dl) => [new Date(dl.loggedAt).toDateString(), dl]);

  const allDays = [
    ...days.map(([k, logs]) => ({ key: k, logs, dayLog: dayLogByCalendarKey.get(k) ?? null })),
    ...standaloneDayLogs.map(([k, dl]) => ({ key: k, logs: [] as LiftLog[], dayLog: dl }))
  ].sort((a, b) => new Date(b.key).getTime() - new Date(a.key).getTime());

  const prMap = liftLogs.reduce<Map<string, number>>((acc, log) => {
    if (log.weight && log.exerciseId) {
      acc.set(log.exerciseId, Math.max(acc.get(log.exerciseId) ?? 0, log.weight));
    }
    return acc;
  }, new Map());

  if (allDays.length === 0) {
    return (
      <div className="list-panel" style={{ textAlign: "center", padding: "48px 24px" }}>
        <Dumbbell />
        <h2 style={{ marginTop: 8 }}>No workouts logged yet</h2>
        <p style={{ color: "var(--text-soft)", marginBottom: 16 }}>
          Log your first set on the workout page to see it appear here.
        </p>
      </div>
    );
  }

  return (
    <section className="list-panel" style={{ padding: 0 }}>
      {allDays.map(({ key: dayKey, logs: rawLogs, dayLog }) => {
        const sortedLogs = rawLogs.sort((a, b) =>
          (b.loggedAt ?? "").localeCompare(a.loggedAt ?? "")
        );
        const muscleGroups = Array.from(
          new Set(
            sortedLogs
              .map((log) => exerciseById.get(log.exerciseId)?.muscleGroup)
              .filter(Boolean)
          )
        ) as string[];
        const dayPRs = sortedLogs.filter(
          (log) => log.weight && log.weight === prMap.get(log.exerciseId)
        ).length;

        return (
          <article key={dayKey} className="history-day-card">
            <header className="history-day-header">
              <div>
                <h2 style={{ margin: 0, fontSize: "1rem" }}>{formatDate(dayKey)}</h2>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--text-soft)" }}>
                  {sortedLogs.length > 0
                    ? (muscleGroups.join(" · ") || "Mixed session")
                    : dayLog?.status === "skipped" ? "No training" : "Custom activity"}
                </p>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {sortedLogs.length > 0 && (
                  <span className="status-pill status-neutral">
                    {sortedLogs.length} set{sortedLogs.length === 1 ? "" : "s"}
                  </span>
                )}
                {dayPRs > 0 && (
                  <span className="status-pill status-active">
                    {dayPRs} PR{dayPRs === 1 ? "" : "s"}
                  </span>
                )}
                {dayLog?.status === "skipped" && (
                  <span className="status-pill status-inactive">
                    ⏭ {dayLog.skipReason ? SKIP_REASON_LABELS[dayLog.skipReason] ?? "Skipped" : "Skipped"}
                  </span>
                )}
                {dayLog?.status === "modified" && (
                  <span className="status-pill status-neutral">
                    📝 Different activity
                  </span>
                )}
              </div>
            </header>

            {/* Day log note — what they did instead, or skip context */}
            {dayLog?.note && (
              <div className="history-day-note">
                <span className="history-day-note-icon">
                  {dayLog.status === "skipped" ? "⏭" : "📝"}
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
                            🏋️ PT
                          </span>
                        )}
                      </span>
                      <span className="history-log-stats">
                        {log.weight}kg × {log.sets} × {log.reps}
                      </span>
                      <span className="history-log-time">
                        {formatTime(log.loggedAt ?? "")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
