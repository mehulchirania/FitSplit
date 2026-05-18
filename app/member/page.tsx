import { MemberWorkoutConsole } from "@/components/member-workout-console";
import { EditableMetrics } from "@/components/editable-metrics";
import { requireRole } from "@/lib/auth";
import {
  getActiveWorkoutSessions,
  getExerciseCatalog,
  getLiftLogsForMember,
  getMemberWithProfile,
  getPrimaryWorkspace,
  getProgramAssignmentForMember,
  getWorkoutPrograms,
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
    { gym },
  ] = await Promise.all([
    getMemberWithProfile(currentMemberId),
    getProgramAssignmentForMember(currentMemberId),
    getWorkoutPrograms(),
    getLiftLogsForMember(currentMemberId),
    getExerciseCatalog(),
    getActiveWorkoutSessions(),
    getPrimaryWorkspace(),
  ]);

  if (!member) return null;

  const memberWithProfile = { ...member, ...profile };
  const program = assignment ? programs.find((p) => p.id === assignment.programId) ?? null : null;
  const firstName = member.fullName.split(" ")[0];

  // Streak: distinct calendar days trained this week (Mon–today)
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
  startOfWeek.setHours(0, 0, 0, 0);
  const daysTrainedThisWeek = new Set(
    liftLogs
      .filter((l) => l.loggedAt && new Date(l.loggedAt) >= startOfWeek)
      .map((l) => new Date(l.loggedAt!).toDateString())
  ).size;

  return (
    <main className="md-page">
      {/* ── Hero ── */}
      <header className="md-hero">
        <div className="md-hero-inner">
          <div className="md-hero-copy">
            <p className="md-greeting">{getGreeting()}, {firstName}</p>
            <h1 className="md-hero-title">
              {program ? program.title : "No plan assigned yet"}
            </h1>
            <div className="md-hero-meta">
              {program && (
                <>
                  <span className="md-badge md-badge-accent">{program.daysPerWeek} days / week</span>
                  {assignment && (
                    <span className="md-badge">Week {Math.ceil((Date.now() - new Date(assignment.assignedAt ?? Date.now()).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1}</span>
                  )}
                </>
              )}
              {liftLogs.length > 0 && (
                <span className="md-badge">{liftLogs.length} sets logged</span>
              )}
              {daysTrainedThisWeek > 0 && (
                <span className="md-badge md-badge-accent">Trained {daysTrainedThisWeek} day{daysTrainedThisWeek !== 1 ? "s" : ""} this week</span>
              )}
            </div>
          </div>
          <div className="md-hero-metrics">
            <EditableMetrics member={memberWithProfile as any} />
          </div>
        </div>
      </header>

      {/* ── Workout Console ── */}
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
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 6.5h11M6.5 12h11M6.5 17.5h11" />
              <rect x="3" y="3" width="18" height="18" rx="3" />
            </svg>
          </div>
          <h2>No workout plan assigned</h2>
          <p>Your trainer at {gym?.name ?? "your gym"} hasn&apos;t assigned a program yet. Check back soon.</p>
          {gym?.phone && (
            <a href={`tel:${gym.phone}`} style={{ fontSize: "13px", color: "var(--brand)", fontWeight: 600 }}>
              Call {gym.phone}
            </a>
          )}
          {gym?.email && (
            <a href={`mailto:${gym.email}`} style={{ fontSize: "13px", color: "var(--text-soft)" }}>
              {gym.email}
            </a>
          )}
        </div>
      )}
    </main>
  );
}
