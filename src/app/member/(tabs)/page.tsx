import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getDayLogsForMember, getWorkoutSessionsForMember } from "@/lib/firebase/read-models";
import { exerciseName, getActivePlan } from "@/lib/member-data";
import { estimateSessionMinutes } from "@/lib/workout-utils";
import { countLabel, istDateKey, resolveNextDayIndex, trainedDateKeys, weekDateKeys, weekStartOf, type CompletedWorkout } from "@/lib/today";
import { UpcomingDays } from "@/components/app/upcoming-days";
import { CheckIcon } from "@/components/app/icons";
import { RehabChecklist, type RehabItem } from "@/components/app/rehab/rehab-checklist";
import { rehabImage } from "@/lib/rehab/media";
import { buildRoutine, dosageLabel, routineMinutes } from "@/lib/rehab/routine";
import { getRehabConditions } from "@/lib/rehab/server";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * Today. A user with no plan is sent to pick one; everyone else lands on the next workout
 * of their plan (the day after the one they last finished), with the rest of the plan below.
 */
export default async function TodayPage() {
  const user = await requireAuth();
  const active = await getActivePlan(user.uid);
  if (!active) redirect("/member/onboarding");

  const { program, assignment } = active;
  const [sessions, { dayLogs }, rehabConditions] = await Promise.all([
    getWorkoutSessionsForMember(user.uid),
    getDayLogsForMember(user.uid),
    getRehabConditions(user.uid)
  ]);
  const rehab = buildRoutine(rehabConditions);
  const rehabItems: RehabItem[] = rehab.map((e) => ({
    id: e.id,
    name: e.name,
    target: e.target,
    dose: dosageLabel(e.dosage),
    image: rehabImage(e.id),
    steps: e.cues.slice(0, 3),
    stopIf: e.stopIf,
    equipment: e.equipment
  }));

  const days = program.days.filter((d) => d.exercises.length > 0);
  const history: CompletedWorkout[] = [
    ...sessions
      .filter((s) => s.programId === program.id)
      .map((s) => ({ dayId: s.programDayId, dayTitle: s.dayTitle, completedAt: s.endedAt ?? s.startedAt })),
    ...dayLogs
      .filter((l) => l.programId === program.id && l.status === "completed")
      .map((l) => ({ dayId: l.dayId, completedAt: l.loggedAt }))
  ];
  const nextIndex = resolveNextDayIndex(days, history, assignment.assignedAt);
  const next = days[nextIndex];

  // Workout-only: finished sessions and completed days. Rehab runs and stray sets never tick it.
  const trained = trainedDateKeys(sessions, dayLogs);

  const todayKey = istDateKey();
  const week = weekDateKeys(weekStartOf(todayKey));
  const trainedThisWeek = week.filter((k) => trained.has(k)).length;

  const dateLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Kolkata" }).format(new Date());
  const href = (dayId: string) => `/member/programs/${encodeURIComponent(program.id)}/day/${encodeURIComponent(dayId)}`;
  const toLines = (d: (typeof days)[number]) =>
    d.exercises.map((e) => ({ name: exerciseName(e.exerciseId), sets: e.sets ?? 3, reps: e.reps ?? "" }));

  const upcoming = days
    .map((d, i) => ({ d, i }))
    .filter(({ i }) => i !== nextIndex)
    .sort((a, b) => ((a.i - nextIndex + days.length) % days.length) - ((b.i - nextIndex + days.length) % days.length))
    .map(({ d, i }) => ({ id: d.id, title: d.title, position: i + 1, href: href(d.id), exercises: toLines(d) }));

  const nextLines = toLines(next);

  return (
    <main className="fs-page">
      <header className="fs-head">
        <h1 className="fs-title">Today</h1>
        <p className="fs-soft">{dateLabel}</p>
      </header>

      <section className="fs-hero" aria-labelledby="next-workout">
        <p className="fs-hero__plan">
          {program.title} · Day {nextIndex + 1} of {days.length}
        </p>
        <h2 className="fs-hero__title" id="next-workout">
          {next.title}
        </h2>
        <p className="fs-soft">
          {countLabel(next.exercises.length, "exercise")} · about {estimateSessionMinutes(next.exercises)} min
        </p>
        <ol className="fs-plain-list fs-hero__list">
          {nextLines.slice(0, 4).map((e, i) => (
            <li key={`${e.name}-${i}`}>
              <span>{e.name}</span>
              <span className="fs-num">
                {e.sets} × {e.reps}
              </span>
            </li>
          ))}
          {nextLines.length > 4 && <li className="fs-soft">+ {nextLines.length - 4} more</li>}
        </ol>
        <Link href={href(next.id)} className="fs-btn fs-btn--primary fs-btn--lg">
          Start workout
        </Link>
      </section>

      {rehab.length > 0 && (
        <section className="fs-section" aria-label="Rehab">
          <h2 className="fs-section__title">Rehab</h2>
          <RehabChecklist items={rehabItems} conditionIds={rehabConditions} dayKey={todayKey} minutes={routineMinutes(rehab)} />
        </section>
      )}

      <section className="fs-section" aria-label="This week">
        <div className="fs-group fs-week">
          <ol className="fs-week__days">
            {week.map((key, i) => {
              const done = trained.has(key);
              return (
                <li key={key} data-today={key === todayKey} data-done={done}>
                  <span className="fs-week__dow" aria-hidden="true">
                    {WEEKDAYS[i]}
                  </span>
                  <span className="fs-week__dot">{done ? <CheckIcon size={16} /> : Number(key.slice(8))}</span>
                  <span className="fs-sr">
                    {key}
                    {done ? ", trained" : ""}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="fs-week__note fs-soft">
            {trainedThisWeek === 0
              ? "Nothing logged yet this week."
              : `${trainedThisWeek} ${trainedThisWeek === 1 ? "day" : "days"} trained this week.`}
          </p>
        </div>
      </section>

      {upcoming.length > 0 && (
        <section className="fs-section">
          <h2 className="fs-section__title">Coming up</h2>
          <UpcomingDays days={upcoming} />
        </section>
      )}
    </main>
  );
}
