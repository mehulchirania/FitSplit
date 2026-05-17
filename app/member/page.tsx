import { Dumbbell } from "@/components/icons";
import { MemberWorkoutConsole } from "@/components/member-workout-console";
import { EditableMetrics } from "@/components/editable-metrics";
import { requireRole } from "@/lib/auth";
import {
  getActiveWorkoutSessions,
  getExerciseCatalog,
  getLiftLogsForMember,
  getMemberDetail,
  getProgramAssignmentForMember,
  getWorkoutPrograms,
  getProfileMetrics
} from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function MemberDashboard() {
  const currentUser = await requireRole(["member"]);
  const currentMemberId = currentUser.memberId ?? currentUser.uid;
  const [
    { member },
    { assignment },
    { programs },
    { liftLogs },
    { exercises },
    { sessions },
    { profile }
  ] = await Promise.all([
    getMemberDetail(currentMemberId),
    getProgramAssignmentForMember(currentMemberId),
    getWorkoutPrograms(),
    getLiftLogsForMember(currentMemberId),
    getExerciseCatalog(),
    getActiveWorkoutSessions(),
    getProfileMetrics(currentMemberId)
  ]);

  if (!member) {
    return null;
  }

  const memberWithProfile = { ...member, ...profile };

  const program = programs.find((item) => item.id === assignment?.programId) ?? programs[0];

  return (
    <main className="page">
      <section className="dashboard-header compact-header member-dashboard-hero">
        <div className="header-copy">
          <p className="eyebrow">Welcome, {member.fullName.split(" ")[0]}</p>
          <h1>Let&apos;s get fit.</h1>
          <span className="member-program-pill">
            <Dumbbell /> {program.title}
          </span>
          <EditableMetrics member={memberWithProfile as any} />
        </div>
      </section>

      <MemberWorkoutConsole
        exercises={exercises}
        initialActiveSessionCount={sessions.length}
        initialInjuryNote={profile.injuryNotes}
        initialLiftLogs={liftLogs}
        memberId={member.id}
        program={program}
      />

    </main>
  );
}
