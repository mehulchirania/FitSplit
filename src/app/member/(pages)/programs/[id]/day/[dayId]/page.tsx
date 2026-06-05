import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import {
  getExerciseCatalog,
  getLiftLogsForMember,
  getProgramAssignmentForMember,
  getWorkoutPrograms
} from "@/lib/firebase/read-models";
import { FocusedDayView } from "@/components/focused-day-view";

export const dynamic = "force-dynamic";

export default async function FocusedDayPage({
  params
}: {
  params: Promise<{ id: string; dayId: string }>;
}) {
  const currentUser = await requireRole(["member"]);
  const memberId = currentUser.memberId ?? currentUser.uid;
  const { id: programId, dayId } = await params;

  const [{ assignment }, { programs }, { exercises }, { liftLogs }] = await Promise.all([
    getProgramAssignmentForMember(memberId, currentUser.gymId),
    getWorkoutPrograms(currentUser.gymId),
    getExerciseCatalog(currentUser.gymId),
    getLiftLogsForMember(memberId, currentUser.gymId)
  ]);

  const program = programs.find((p) => p.id === programId);
  if (!program) notFound();

  const day = program.days.find((d) => d.id === dayId);
  if (!day) notFound();

  // Most-recent lift per exercise for the "last time" hint.
  const lastLogByExercise = new Map<string, (typeof liftLogs)[number]>();
  for (const log of [...liftLogs].reverse()) {
    lastLogByExercise.set(log.exerciseId, log);
  }

  // Personal-record weight per exercise.
  const prMap = new Map<string, number>();
  for (const log of liftLogs) {
    const best = prMap.get(log.exerciseId) ?? 0;
    if ((log.weight ?? 0) > best) prMap.set(log.exerciseId, log.weight ?? 0);
  }

  return (
    <div className="m3d-subpage">
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
        <Link href="/member/programs" style={{ fontSize: 12, color: "var(--text-faint)", textDecoration: "none", fontWeight: 600, transition: "color 120ms" }}>
          Programs
        </Link>
        <span style={{ color: "var(--text-faint)", fontSize: 11 }}>›</span>
        <span style={{ fontSize: 12, color: "var(--text-soft)", fontWeight: 600 }}>{program.title}</span>
      </div>

      <div className="m3d-subpage__head">
        <h1>{day.title}</h1>
        {day.focus && <p>Focus: {day.focus}</p>}
      </div>

      <FocusedDayView
        day={day}
        exercises={exercises}
        liftLogs={liftLogs}
        assignment={assignment}
        programTitle={program.title}
      />
    </div>
  );
}
