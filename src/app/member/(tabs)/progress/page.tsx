import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getDayLogsForMember, getLiftLogsForMember, getWorkoutSessionsForMember } from "@/lib/firebase/read-models";
import { exerciseName } from "@/lib/member-data";
import { getCondition } from "@/lib/rehab/routine";
import { getRehabSessionsForMember } from "@/lib/rehab/server";
import { mergeHistory } from "@/lib/rehab/session";
import { formatDuration, formatKg, istDateKey, trainedDateKeys, trainingStreak, weekDateKeys, weekStartOf } from "@/lib/today";
import { weeklyRecap } from "@/lib/recap";
import { ChevronLeft } from "@/components/app/icons";

export const dynamic = "force-dynamic";

/** Workout history and personal bests. Lives under Profile: it is for looking back, not for today. */
export default async function ProgressPage() {
  const user = await requireAuth();
  const [sessions, rehabSessions, { dayLogs }, { liftLogs }] = await Promise.all([
    getWorkoutSessionsForMember(user.uid),
    getRehabSessionsForMember(user.uid),
    getDayLogsForMember(user.uid),
    getLiftLogsForMember(user.uid)
  ]);

  // Streak and "days trained" are workout-only: rehab runs are history, never counted here.
  const trained = trainedDateKeys(sessions, dayLogs);

  const todayKey = istDateKey();
  const thisWeek = new Set(weekDateKeys(weekStartOf(todayKey)));
  const weekVolume = liftLogs
    .filter((l) => thisWeek.has(istDateKey(l.loggedAt)))
    .reduce((n, l) => n + l.weight * (parseInt(l.reps, 10) || 0), 0);
  const streak = trainingStreak(sessions, dayLogs, todayKey).weeks;
  const recap = weeklyRecap(sessions, liftLogs, todayKey);
  const pct = recap.volumeChangePct;

  const best = new Map<string, { weight: number; reps: number }>();
  for (const l of liftLogs) {
    const reps = parseInt(l.reps, 10) || 0;
    const cur = best.get(l.exerciseId);
    if (l.weight > 0 && (!cur || l.weight > cur.weight || (l.weight === cur.weight && reps > cur.reps))) {
      best.set(l.exerciseId, { weight: l.weight, reps });
    }
  }
  const records = [...best.entries()].sort((a, b) => b[1].weight - a[1].weight).slice(0, 10);

  const history = mergeHistory(sessions, (s) => s.endedAt ?? s.startedAt, rehabSessions).slice(0, 12);

  const when = (iso: string) =>
    new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(iso));

  return (
    <main className="fs-page">
      <header className="fs-navbar">
        <Link href="/member/settings" className="fs-text-btn fs-navbar__back">
          <ChevronLeft size={18} /> Profile
        </Link>
      </header>
      <header className="fs-head">
        <h1 className="fs-title">Progress</h1>
      </header>

      <section className="fs-section" aria-label="Weekly recap">
        <h2 className="fs-section__title">This week</h2>
        <div className="fs-recap">
          <p className="fs-recap__line">{recap.summary}</p>
          <dl className="fs-recap__grid">
            <div>
              <dt>Sessions</dt>
              <dd className="fs-num">
                {recap.sessions}
                <small>Last week {recap.lastSessions}</small>
              </dd>
            </div>
            <div>
              <dt>Volume</dt>
              <dd className="fs-num">
                {recap.volume.toLocaleString("en-US")} kg
                <small>{pct === null ? "No prior week" : `${pct > 0 ? "+" : ""}${pct}% vs last week`}</small>
              </dd>
            </div>
            <div>
              <dt>Records</dt>
              <dd className="fs-num">{recap.prs}</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="fs-group">
        <div className="fs-row">
          <span className="fs-row__title">Days trained</span>
          <span className="fs-row__value fs-num">{trained.size}</span>
        </div>
        <div className="fs-row">
          <span className="fs-row__title">Weekly streak</span>
          <span className="fs-row__value fs-num">
            {streak} {streak === 1 ? "week" : "weeks"}
          </span>
        </div>
        <div className="fs-row">
          <span className="fs-row__title">Lifted this week</span>
          <span className="fs-row__value fs-num">{Math.round(weekVolume).toLocaleString("en-US")} kg</span>
        </div>
      </div>

      <section className="fs-section">
        <h2 className="fs-section__title">History</h2>
        {history.length === 0 ? (
          <div className="fs-group">
            <p className="fs-empty">Finish a workout and it will show up here.</p>
          </div>
        ) : (
          <div className="fs-group">
            {history.map((h) => {
              if (h.kind === "rehab") {
                const r = h.rehab;
                const names = r.conditionIds.map((id) => getCondition(id)?.name).filter(Boolean).join(", ");
                return (
                  <div className="fs-row" key={h.id}>
                    <span className="fs-row__main">
                      <span className="fs-row__title">
                        {names || "Rehab routine"} <span className="fs-tag-rehab">Rehab</span>
                      </span>
                      <span className="fs-row__sub fs-num">
                        {when(r.completedAt)}
                        {r.durationSec >= 60 ? ` · ${formatDuration(r.durationSec)}` : ""}
                        {` · ${r.exercisesCompleted} ${r.exercisesCompleted === 1 ? "exercise" : "exercises"}`}
                        {r.exercisesSkipped ? `, ${r.exercisesSkipped} skipped` : ""}
                      </span>
                    </span>
                  </div>
                );
              }
              const s = h.workout;
              return (
                <div className="fs-row" key={h.id}>
                  <span className="fs-row__main">
                    <span className="fs-row__title">{s.dayTitle || "Workout"}</span>
                    <span className="fs-row__sub fs-num">
                      {when(s.endedAt ?? s.startedAt)}
                      {s.durationSec ? ` · ${formatDuration(s.durationSec)}` : ""}
                      {s.setsCompleted ? ` · ${s.setsCompleted} sets` : ""}
                    </span>
                  </span>
                  {s.volumeKg ? <span className="fs-row__value fs-num">{s.volumeKg.toLocaleString("en-US")} kg</span> : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {records.length > 0 && (
        <section className="fs-section">
          <h2 className="fs-section__title">Personal bests</h2>
          <div className="fs-group">
            {records.map(([id, r]) => (
              <div className="fs-row" key={id}>
                <span className="fs-row__title">{exerciseName(id)}</span>
                <span className="fs-row__value fs-num">
                  {formatKg(r.weight)} kg × {r.reps}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
