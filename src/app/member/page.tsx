import { MemberCoachShell } from "@/components/member-coach-shell";
import { requireAuth } from "@/lib/auth";
import { getWeekStart, getTrainedDateKeys, nowInIST } from "@/lib/workout-utils";
import {
  getDayLogsForMember,
  getExerciseCatalog,
  getLiftLogsForMember,
  getMacroLogsForMember,
  getMealLogsForMember,
  getActivityLogsForMember,
  getMacroLogForMember,
  getUserProfile,
  getProgramAssignmentForMember,
  getWorkoutPrograms
} from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function MemberDashboard() {
  const currentUser = await requireAuth();
  const uid = currentUser.uid;
  const todayDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

  const [
    { user: member, profile },
    { assignment },
    { programs },
    { liftLogs },
    { exercises },
    { dayLogs },
    { macroLog: initialMacroLog },
    { macroLogs },
    { activityLogs },
    { mealLogs }
  ] = await Promise.all([
    getUserProfile(uid, currentUser.fullName),
    getProgramAssignmentForMember(uid),
    getWorkoutPrograms(),
    getLiftLogsForMember(uid),
    getExerciseCatalog(),
    getDayLogsForMember(uid),
    getMacroLogForMember(uid, todayDate),
    getMacroLogsForMember(uid, 14),
    getActivityLogsForMember(uid, 30),
    getMealLogsForMember(uid, todayDate)
  ]);

  const program = assignment ? programs.find((p) => p.id === assignment.programId) ?? null : null;
  const firstName = member.fullName.split(" ")[0];
  // getWeekStart and everything derived from `now` below use the runtime's
  // *local* timezone for extraction (getDay/getDate/getFullYear) — correct
  // on a member's own IST browser, but on this server (which runs UTC) a
  // bare `new Date()` would compute week boundaries, streaks, and adherence
  // against UTC's calendar, silently wrong for part of every day. See
  // nowInIST's own doc comment.
  const now = nowInIST();
  const nowMs = now.getTime();

  const currentWeek = assignment
    ? Math.ceil((nowMs - new Date(assignment.assignedAt ?? nowMs).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
    : null;

  // A day counts as trained if it has >=1 lift log OR a dayLog marked "completed" —
  // the member's only completion action on mobile is "Mark done" (writes a dayLog),
  // so lift logs alone would undercount.
  const trainedDateKeys = getTrainedDateKeys(liftLogs, dayLogs);

  // Days trained this week (Mon-Sun)
  const weekStartIso = getWeekStart(now);
  const weekEndDate = new Date(`${weekStartIso}T00:00:00`);
  weekEndDate.setDate(weekEndDate.getDate() + 7);
  const weekEndIso = getWeekStart(weekEndDate); // next Monday's date-key, exclusive upper bound
  const daysTrainedThisWeek = Array.from(trainedDateKeys).filter(
    (key) => key >= weekStartIso && key < weekEndIso
  ).length;

  // Weekly streak — consecutive ISO-weeks with >=1 trained day, walking backwards
  const weeklyStreak = (() => {
    if (trainedDateKeys.size === 0) return 0;
    const trainedWeekKeys = new Set(
      Array.from(trainedDateKeys).map((key) => getWeekStart(new Date(`${key}T00:00:00`)))
    );
    let streak = 0;
    let cursorIso = weekStartIso;
    while (trainedWeekKeys.has(cursorIso)) {
      streak += 1;
      const cursorDate = new Date(`${cursorIso}T00:00:00`);
      cursorDate.setDate(cursorDate.getDate() - 7);
      cursorIso = getWeekStart(cursorDate);
    }
    // Streak ended last week (current week not yet trained) — still show it as alive
    // rather than resetting to 0 the moment the new week starts.
    if (streak === 0) {
      const lastWeekDate = new Date(`${weekStartIso}T00:00:00`);
      lastWeekDate.setDate(lastWeekDate.getDate() - 7);
      let cursorIso2 = getWeekStart(lastWeekDate);
      while (trainedWeekKeys.has(cursorIso2)) {
        streak += 1;
        const cursorDate2 = new Date(`${cursorIso2}T00:00:00`);
        cursorDate2.setDate(cursorDate2.getDate() - 7);
        cursorIso2 = getWeekStart(cursorDate2);
      }
    }
    return streak;
  })();

  return (
    <MemberCoachShell
      firstName={firstName}
      weeklyStreak={weeklyStreak}
      daysTrainedThisWeek={daysTrainedThisWeek}
      program={program}
      currentWeek={currentWeek}
      exercises={exercises}
      liftLogs={liftLogs}
      dayLogs={dayLogs}
      activityLogs={activityLogs}
      macroLogs={macroLogs}
      mealLogs={mealLogs}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      macroLog={initialMacroLog as any}
      macroTarget={profile.macroNutritionTarget}
      injuryNote={profile.injuryNotes}
      memberId={member.id}
      todayDate={todayDate}
      member={member}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      profile={profile as any}
    />
  );
}
