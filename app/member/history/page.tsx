import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { Dumbbell, Activity } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import {
  getDayLogsForMember,
  getExerciseCatalog,
  getLiftLogsForMember
} from "@/lib/firebase/read-models";
import type { DayLog, LiftLog } from "@/types/domain";

const SKIP_REASON_LABELS: Record<string, string> = {
  rest: "Rest day",
  no_time: "No time",
  equipment: "No equipment",
  sick: "Feeling sick",
  other: "Other"
};

export const dynamic = "force-dynamic";

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

/**
 * Buckets logs by calendar day. A "workout" = all logs from the same day,
 * regardless of sessionId. This matches what the user perceives — "what did
 * I do on Tuesday" — rather than the technical session boundary.
 */
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

export default async function MemberHistoryPage() {
  const currentUser = await requireRole(["member"]);
  const memberId = currentUser.memberId ?? currentUser.uid;

  const [{ liftLogs }, { exercises }, { dayLogs }] = await Promise.all([
    getLiftLogsForMember(memberId),
    getExerciseCatalog(currentUser.gymId),
    getDayLogsForMember(memberId)
  ]);

  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const days = groupByDay(liftLogs);

  // Build a map of calendar-day-key → DayLog so we can annotate each bucket.
  // A DayLog's loggedAt is when they filed the skip/note, which is a good enough
  // calendar anchor (same or next day at worst).
  const dayLogByCalendarKey = new Map<string, DayLog>();
  for (const dl of dayLogs) {
    const key = new Date(dl.loggedAt).toDateString();
    // Keep the most-recent log per calendar day (they may update the reason)
    if (!dayLogByCalendarKey.has(key)) {
      dayLogByCalendarKey.set(key, dl);
    }
  }

  // Also build a set of days that have lift logs, so we can surface "skipped"
  // days that have NO lift logs as separate entries.
  const daysWithLifts = new Set(days.map(([key]) => key));

  // Skipped/modified days that don't appear in the lift-log buckets
  const standaloneDayLogs: [string, DayLog][] = dayLogs
    .filter((dl) => {
      const key = new Date(dl.loggedAt).toDateString();
      return !daysWithLifts.has(key);
    })
    .map((dl) => [new Date(dl.loggedAt).toDateString(), dl]);

  // Merge all days, sort newest first
  const allDays = [
    ...days.map(([k, logs]) => ({ key: k, logs, dayLog: dayLogByCalendarKey.get(k) ?? null })),
    ...standaloneDayLogs.map(([k, dl]) => ({ key: k, logs: [] as LiftLog[], dayLog: dl }))
  ].sort((a, b) => new Date(b.key).getTime() - new Date(a.key).getTime());

  // Lifetime PR per exercise — used to badge each set
  const prMap = liftLogs.reduce<Map<string, number>>((acc, log) => {
    if (log.weight && log.exerciseId) {
      acc.set(log.exerciseId, Math.max(acc.get(log.exerciseId) ?? 0, log.weight));
    }
    return acc;
  }, new Map());

  // Aggregate stats for the hero
  const totalSets = liftLogs.reduce((sum, log) => sum + (log.sets ?? 0), 0);
  const totalWorkouts = days.length;
  const totalVolume = liftLogs.reduce((sum, log) => {
    // Volume = weight × sets × first-rep number (best we can do given "10" or "8,8,7" reps format)
    const firstRep = Number(String(log.reps ?? "0").split(",")[0]?.trim()) || 0;
    return sum + log.weight * log.sets * firstRep;
  }, 0);

  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <Breadcrumb crumbs={[{ label: "Workout", href: "/member" }, { label: "History" }]} />
          <h1>Workout history.</h1>
          <p>Every set you&apos;ve logged, grouped by day. Track what worked, repeat it, then beat it.</p>
        </div>
        <aside className="ui-cards" style={{ alignContent: "start", height: "fit-content", gap: 14 }}>
          <article className="ui-card blue">
            <p className="tip" style={{ fontSize: "1.2em" }}><Activity /> {totalWorkouts}</p>
            <p className="second-text">Total workouts</p>
          </article>
          <article className="ui-card purple">
            <p className="tip" style={{ fontSize: "1.2em" }}><Dumbbell /> {totalSets}</p>
            <p className="second-text">Total sets</p>
          </article>
          <article className="ui-card green">
            <p className="tip" style={{ fontSize: "1.2em" }}>{Math.round(totalVolume / 1000)}k</p>
            <p className="second-text">Total volume (kg)</p>
          </article>
        </aside>
      </section>

      {allDays.length === 0 ? (
        <div className="list-panel" style={{ textAlign: "center", padding: "48px 24px" }}>
          <Dumbbell />
          <h2 style={{ marginTop: 8 }}>No workouts logged yet</h2>
          <p style={{ color: "var(--text-soft)", marginBottom: 16 }}>
            Log your first set on the workout page to see it appear here.
          </p>
          <Link className="button button-primary" href="/member">Start today&apos;s workout</Link>
        </div>
      ) : (
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
                      return (
                        <div className="history-log-row" key={log.id}>
                          <span className="history-log-name">
                            {exerciseName}
                            {isPR && <span className="pr-chip" style={{ marginLeft: 6 }}>PR</span>}
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
      )}
    </main>
  );
}
