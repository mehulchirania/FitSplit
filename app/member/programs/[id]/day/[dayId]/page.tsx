/* eslint-disable @typescript-eslint/no-unused-vars */
// D17: Focused single-day workout view for a member.
// Accessible from the workout console day tabs via a "View day" link.
// Shows the day's exercise list with set/rep targets and a compact lift-log form.

import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import {
  getExerciseCatalog,
  getLiftLogsForMember,
  getProgramAssignmentForMember,
  getWorkoutPrograms
} from "@/lib/firebase/read-models";
import { Breadcrumb } from "@/components/breadcrumb";
import { getExerciseName } from "@/lib/workout-utils";
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
    <main className="page" style={{ maxWidth: "760px" }}>
      <Breadcrumb
        crumbs={[
          { label: "Dashboard", href: "/member" },
          { label: program.title, href: "/member" },
          { label: day.title }
        ]}
      />

      <header style={{ margin: "20px 0 24px" }}>
        <p style={{ color: "var(--text-faint)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: "4px" }}>
          Day {day.dayNumber}
        </p>
        <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800 }}>{day.title}</h1>
        {day.focus && (
          <p style={{ margin: "6px 0 0", color: "var(--text-soft)", fontSize: "0.9rem" }}>
            Focus: {day.focus}
          </p>
        )}
      </header>

      <FocusedDayView 
        day={day} 
        exercises={exercises} 
        liftLogs={liftLogs} 
        assignment={assignment} 
        programTitle={program.title}
      />

      {/* Assignment badge at bottom */}
      {assignment && (
        <p style={{ marginTop: "24px", fontSize: "0.78rem", color: "var(--text-faint)" }}>
          Program assigned {assignment.assignedAt ? `on ${new Date(assignment.assignedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}.
        </p>
      )}
    </main>
  );
}
