import Link from "next/link";
import { EditableMetrics } from "@/components/editable-metrics";
import { GymNoticeBoard } from "@/components/gym-notice-board";
import { MacroProgressPanel } from "@/components/macro-progress-panel";
import { MemberWorkoutConsole } from "@/components/member-workout-console";
import { requireRole } from "@/lib/auth";
import {
  getActiveWorkoutSessions,
  getExerciseCatalog,
  getGymDetail,
  getLiftLogsForMember,
  getMemberWithProfile,
  getProgramAssignmentForMember,
  getWorkoutPrograms
} from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function MemberDashboard() {
  const currentUser = await requireRole(["member"]);
  const currentMemberId = currentUser.memberId ?? currentUser.uid;
  const [
    { member, profile },
    { assignment },
    { programs },
    { liftLogs },
    { exercises },
    { sessions },
    { gym }
  ] = await Promise.all([
    getMemberWithProfile(currentMemberId),
    getProgramAssignmentForMember(currentMemberId),
    getWorkoutPrograms(currentUser.gymId),
    getLiftLogsForMember(currentMemberId),
    getExerciseCatalog(currentUser.gymId),
    getActiveWorkoutSessions(currentUser.gymId),
    getGymDetail(currentUser.gymId)
  ]);

  if (!member) return null;

  const memberWithProfile = { ...member, ...profile };
  const program = assignment ? programs.find((p) => p.id === assignment.programId) ?? null : null;
  const firstName = member.fullName.split(" ")[0];
  const currentWeek = assignment
    ? Math.ceil((Date.now() - new Date(assignment.assignedAt ?? Date.now()).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
    : null;

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);
  const daysTrainedThisWeek = new Set(
    liftLogs
      .filter((log) => log.loggedAt && new Date(log.loggedAt) >= startOfWeek)
      .map((log) => new Date(log.loggedAt!).toDateString())
  ).size;

  // Weekly streak — count consecutive ISO-weeks (Mon-Sun) with ≥1 logged lift,
  // walking backwards from the current week. Stops at the first empty week.
  // Members see a single number that goes up by 1 each week they train, 0 if
  // they break the chain.
  const weeklyStreak = (() => {
    if (liftLogs.length === 0) return 0;
    const trainedWeekKeys = new Set(
      liftLogs
        .filter((log) => log.loggedAt)
        .map((log) => {
          const d = new Date(log.loggedAt!);
          // Snap to that week's Monday for a stable bucket key
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
    // Grace: if this week hasn't started training yet, still count the streak
    // from last week so we don't show "0" on Monday morning before the first set.
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
    <main className="md-page">
      <header className="md-hero">
        <div className="md-hero-inner">
          <div className="md-hero-copy">
            <p className="md-greeting">{getGreeting()}, {firstName}</p>
            <h1 className="md-hero-title">{program ? program.title : "No plan assigned yet"}</h1>
            <div className="md-hero-meta">
              {program ? (
                <>
                  <span className="md-badge md-badge-accent">{program.daysPerWeek} days / week</span>
                  {currentWeek ? <span className="md-badge">Week {currentWeek}</span> : null}
                </>
              ) : (
                <span className="md-badge md-badge-accent">Awaiting trainer</span>
              )}
              <span className="md-badge">{gym?.name ?? "Your gym"}</span>
            </div>
          </div>

          <div className="md-hero-summary" aria-label="Training summary">
            <div className="md-hero-stat">
              <span>Streak</span>
              <strong>{weeklyStreak > 0 ? `🔥 ${weeklyStreak}` : "—"}</strong>
              <small>{weeklyStreak === 1 ? "week" : "weeks"} in a row</small>
            </div>
            <div className="md-hero-stat">
              <span>This week</span>
              <strong>{daysTrainedThisWeek}</strong>
              <small>training day{daysTrainedThisWeek === 1 ? "" : "s"}</small>
            </div>
            <Link href="/member/history" className="md-hero-stat md-hero-stat--link">
              <span>Lift logs</span>
              <strong>{liftLogs.length}</strong>
              <small>sets saved · view history</small>
            </Link>
            <div className="md-hero-stat">
              <span>Status</span>
              <strong>{program ? "Ready" : "Pending"}</strong>
              <small>{program ? "plan assigned" : "trainer review"}</small>
            </div>
          </div>
        </div>
      </header>

      {program ? (
        <MemberWorkoutConsole
          exercises={exercises}
          initialActiveSessionCount={sessions.length}
          initialInjuryNote={profile.injuryNotes}
          initialLiftLogs={liftLogs}
          memberId={member.id}
          program={program}
        />
      ) : (
        <div className="md-empty">
          <div className="md-empty-icon">
            <svg
              fill="none"
              height="48"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
              width="48"
            >
              <path d="M6.5 6.5h11M6.5 12h11M6.5 17.5h11" />
              <rect height="18" rx="3" width="18" x="3" y="3" />
            </svg>
          </div>
          <h2>No workout plan assigned</h2>
          <p>Your trainer at {gym?.name ?? "your gym"} hasn&apos;t assigned a program yet. Check back soon.</p>
          {gym?.phone ? (
            <a className="md-empty-link" href={`tel:${gym.phone}`}>
              Call {gym.phone}
            </a>
          ) : null}
          {gym?.email ? (
            <a className="md-empty-link muted" href={`mailto:${gym.email}`}>
              {gym.email}
            </a>
          ) : null}
        </div>
      )}

      {gym?.notices && gym.notices.length > 0 ? (
        <div className="member-dashboard-section">
          <GymNoticeBoard notices={gym.notices} />
        </div>
      ) : null}

      <section className="member-dashboard-section member-wellness-section" aria-labelledby="member-wellness-title">
        <div className="panel-title">
          <div>
            <p className="eyebrow">Wellness</p>
            <h2 id="member-wellness-title">Body metrics & nutrition</h2>
          </div>
          <span className="status-pill status-neutral">Optional tracking</span>
        </div>
        <div className="member-wellness-grid">
          <div className="member-metrics-card">
            <h3>Profile metrics</h3>
            <p>Keep these updated so your trainer has useful context.</p>
            <EditableMetrics member={memberWithProfile as any} />
          </div>
          <MacroProgressPanel memberId={member.id} target={profile.macroNutritionTarget} />
        </div>
      </section>
    </main>
  );
}
