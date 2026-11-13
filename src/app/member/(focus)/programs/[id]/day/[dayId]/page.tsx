import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getAllProgramsForMember, getLiftLogsForMember } from "@/lib/firebase/read-models";
import { findExercise } from "@/lib/exercise-library";
import { matchDayIndex } from "@/lib/today";
import { buildRoutine, routineMinutes } from "@/lib/rehab/routine";
import { getRehabConditions } from "@/lib/rehab/server";
import { WorkoutSessionLoader } from "@/components/app/workout-session-loader";
import type { SessionExercise } from "@/components/app/workout-session";
import type { LiftLog } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function WorkoutPage({ params }: { params: Promise<{ id: string; dayId: string }> }) {
  const user = await requireAuth();
  const { id, dayId } = await params;

  const [programs, { liftLogs }] = await Promise.all([getAllProgramsForMember(user.uid), getLiftLogsForMember(user.uid)]);
  const program = programs.find((p) => p.id === id);
  if (!program) notFound();

  const days = program.days.filter((d) => d.exercises.length > 0);
  const dayIndex = matchDayIndex(days, { dayId });
  if (dayIndex < 0) notFound();
  const day = days[dayIndex];

  // liftLogs arrive newest first. For each exercise: its last session's sets, and its all-time best weight.
  const byExercise = new Map<string, LiftLog[]>();
  const priorBest = new Map<string, number>();
  for (const log of liftLogs) {
    const list = byExercise.get(log.exerciseId) ?? [];
    list.push(log);
    byExercise.set(log.exerciseId, list);
    if (log.weight > (priorBest.get(log.exerciseId) ?? 0)) priorBest.set(log.exerciseId, log.weight);
  }
  const lastSets = (exerciseId: string) => {
    const logs = byExercise.get(exerciseId) ?? [];
    if (logs.length === 0) return [];
    const sessionId = logs[0].sessionId;
    return logs
      .filter((l) => l.sessionId === sessionId)
      .sort((a, b) => (a.setIndex ?? 0) - (b.setIndex ?? 0) || a.loggedAt.localeCompare(b.loggedAt))
      .map((l) => ({ weight: l.weight, reps: parseInt(l.reps, 10) || 0 }));
  };

  const exercises: SessionExercise[] = day.exercises.flatMap((item, i) => {
    const e = findExercise(item.exerciseId);
    if (!e) return [];
    return [
      {
        key: `${item.exerciseId}:${i}`,
        exerciseId: item.exerciseId,
        name: e.name,
        muscleGroup: e.muscleGroup,
        equipment: e.equipment,
        steps: e.instructions.split("\n").map((s) => s.trim()).filter(Boolean),
        videoUrl: e.videoSource === "youtube" ? e.videoUrl : "",
        sets: item.sets ?? 3,
        reps: item.reps ?? "8-12",
        restSeconds: item.restSeconds ?? 90,
        last: lastSets(item.exerciseId),
        priorBest: priorBest.get(item.exerciseId) ?? 0
      }
    ];
  });
  if (exercises.length === 0) notFound();

  const nextDay = days[(dayIndex + 1) % days.length];
  const rehabRoutine = buildRoutine(await getRehabConditions(user.uid));

  return (
    <WorkoutSessionLoader
      programId={program.id}
      dayId={day.id}
      dayTitle={day.title}
      exercises={exercises}
      nextDayTitle={days.length > 1 ? nextDay.title : null}
      rehab={rehabRoutine.length > 0 ? { count: rehabRoutine.length, minutes: routineMinutes(rehabRoutine) } : null}
    />
  );
}
