import { MemberCoachShell } from "@/components/member-coach-shell";
import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import {
  getActiveWorkoutSessions,
  getDayLogsForMember,
  getExerciseCatalog,
  getGymDetail,
  getLiftLogsForMember,
  getMacroLogsForMember,
  getActivityLogsForMember,
  getMacroLogForMember,
  getMemberWithProfile,
  getProgramAssignmentForMember,
  getWorkoutPrograms
} from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function MemberDashboard() {
  const currentUser = await requireRole(["member"]);
  const currentMemberId = currentUser.memberId ?? currentUser.uid;
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
  const todayDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

  const [
    { member, profile },
    { assignment },
    { programs },
    { liftLogs },
    { exercises },
    { sessions },
    { gym },
    { dayLogs },
    { macroLog: initialMacroLog },
    { macroLogs },
    { activityLogs }
  ] = await Promise.all([
    getMemberWithProfile(currentMemberId),
    getProgramAssignmentForMember(currentMemberId, gymId),
    getWorkoutPrograms(gymId),
    getLiftLogsForMember(currentMemberId, gymId),
    getExerciseCatalog(gymId),
    getActiveWorkoutSessions(gymId),
    getGymDetail(gymId),
    getDayLogsForMember(currentMemberId, gymId),
    getMacroLogForMember(currentMemberId, gymId, todayDate),
    getMacroLogsForMember(currentMemberId, gymId, 14),
    getActivityLogsForMember(currentMemberId, gymId, 30)
  ]);

  if (!member) return null;

  const program = assignment ? programs.find((p) => p.id === assignment.programId) ?? null : null;
  const firstName = member.fullName.split(" ")[0];
  const now = new Date();
  const nowMs = now.getTime();

  const currentWeek = assignment
    ? Math.ceil((nowMs - new Date(assignment.assignedAt ?? nowMs).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
    : null;

  // Days trained this week (Mon-Sun)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);
  const daysTrainedThisWeek = new Set(
    liftLogs
      .filter((log) => log.loggedAt && new Date(log.loggedAt) >= startOfWeek)
      .map((log) => new Date(log.loggedAt!).toDateString())
  ).size;

  // Weekly streak — consecutive ISO-weeks with ≥1 logged lift, walking backwards
  const weeklyStreak = (() => {
    if (liftLogs.length === 0) return 0;
    const trainedWeekKeys = new Set(
      liftLogs
        .filter((log) => log.loggedAt)
        .map((log) => {
          const d = new Date(log.loggedAt!);
          const day = (d.getDay() + 6) % 7;
          d.setDate(d.getDate() - day);
          d.setHours(0, 0, 0, 0);
          return d.toISOString().slice(0, 10);
        })
    );
    let streak = 0;
    const cursor = new Date(startOfWeek);
    while (true) {
      const key = cursor.toISOString().slice(0, 10);
      if (trainedWeekKeys.has(key)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 7);
      } else {
        break;
      }
    }
    if (streak === 0 && daysTrainedThisWeek === 0) {
      const lastWeekStart = new Date(startOfWeek);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      if (trainedWeekKeys.has(lastWeekStart.toISOString().slice(0, 10))) {
        const c = new Date(lastWeekStart);
        while (trainedWeekKeys.has(c.toISOString().slice(0, 10))) {
          streak += 1;
          c.setDate(c.getDate() - 7);
        }
      }
    }
    return streak;
  })();

  return (
    <MemberCoachShell
      firstName={firstName}
      gymName={gym?.name ?? "Your Gym"}
      gymLogoUrl={gym?.logoUrl}
      gymPhone={gym?.phone}
      gymEmail={gym?.email}
      gymLocationUrl={gym?.locationUrl}
      gymNotices={gym?.notices}
      weeklyStreak={weeklyStreak}
      daysTrainedThisWeek={daysTrainedThisWeek}
      liftLogCount={liftLogs.length}
      membershipStatus={member.membershipStatus}
      membershipEndDate={member.membershipEndDate}
      coachNote={profile.coachNote}
      coachNoteFrom={profile.coachNoteUpdatedByName}
      coachNoteUpdatedAt={profile.coachNoteUpdatedAt}
      program={program}
      assignment={assignment}
      currentWeek={currentWeek}
      exercises={exercises}
      liftLogs={liftLogs}
      dayLogs={dayLogs}
      activityLogs={activityLogs}
      macroLogs={macroLogs}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      macroLog={initialMacroLog as any}
      macroTarget={profile.macroNutritionTarget}
      injuryNote={profile.injuryNotes}
      memberId={member.id}
      gymId={gymId}
      todayDate={todayDate}
      member={member}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      profile={profile as any}
      initialActiveSessionCount={sessions.length}
    />
  );
}
