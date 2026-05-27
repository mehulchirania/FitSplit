import { EditableMetrics } from "@/components/editable-metrics";
import { GymNoticeBoard } from "@/components/gym-notice-board";
import { MacroProgressPanel } from "@/components/macro-progress-panel";
import { MemberWorkoutConsole } from "@/components/member-workout-console";
import { MemberDashboardTabs } from "@/components/member-dashboard-tabs";
import { MemberHistory } from "@/components/member-history";
import { MemberProgressPanel } from "@/components/member-progress-panel";
import { WorkoutCalendar } from "@/components/workout-calendar";
import { ProfileMetricsWidget } from "@/components/profile-metrics-widget";
import { ActivityLogForm } from "@/components/activity-log-form";
import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import type { Member } from "@/types/domain";
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

function getGreeting() {
  const h = Number(
    new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Kolkata"
    }).format(new Date())
  );

  if (h >= 6 && h < 12) return "Good morning";
  if (h >= 12 && h < 16) return "Good afternoon";
  return "Good evening";
}

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
    <main className="md-page" style={{ padding: "16px", maxWidth: "1200px", margin: "0 auto" }}>
      <header className="md-hero-new">
        <div className="md-hero-inner-new">
          <div className="md-hero-copy-new">
            <p className="md-greeting-new">{getGreeting()}, {firstName}</p>
            <h1 className="md-hero-title-new">{program ? program.title : "No plan assigned yet"}</h1>
            <div className="md-hero-meta-new">
              {program ? (
                <>
                  <span className="md-badge-new md-badge-accent-new">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {program.daysPerWeek} days / week
                  </span>
                  {currentWeek ? (
                    <span className="md-badge-new">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      Week {currentWeek}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="md-badge-new md-badge-accent-new">Awaiting trainer</span>
              )}
              {gym?.locationUrl ? (
                <a
                  className="md-badge-new md-gym-location-link"
                  href={gym.locationUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                  title="Open gym location in Google Maps"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {gym.name}
                </a>
              ) : (
                <span className="md-badge-new">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {gym?.name ?? "Your gym"}
                </span>
              )}
            </div>
          </div>

          <div className="md-hero-summary-new" aria-label="Training summary">
            <div className="md-hero-stat-new">
              <span>Streak</span>
              <strong>{weeklyStreak > 0 ? `🔥 ${weeklyStreak}` : "—"}</strong>
              <small>{weeklyStreak === 1 ? "week" : "weeks"} in a row</small>
            </div>
            <div className="md-hero-stat-new">
              <span>This week</span>
              <strong>{daysTrainedThisWeek}</strong>
              <small>training day{daysTrainedThisWeek === 1 ? "" : "s"}</small>
            </div>
            <a href="#history" className="md-hero-stat-new md-hero-stat-link-new">
              <span>Lift logs</span>
              <strong>{liftLogs.length}</strong>
              <small>sets saved</small>
            </a>
            <div className="md-hero-stat-new">
              <span>Status</span>
              <strong>{program ? "Ready" : "Pending"}</strong>
              <small>{program ? "plan assigned" : "trainer review"}</small>
            </div>
          </div>
        </div>
      </header>

      <MemberDashboardTabs
        workoutSection={
          <div style={{ display: "grid", gap: "24px" }}>
            {profile.coachNote ? (
              <section
                className="member-dashboard-section"
                aria-label="Note from your trainer"
                style={{
                  background: "color-mix(in srgb, var(--brand) 8%, var(--bg-elevated))",
                  border: "1px solid color-mix(in srgb, var(--brand) 30%, var(--border))",
                  borderRadius: "var(--radius)",
                  padding: "14px 18px"
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                  <strong style={{ color: "var(--brand)", fontSize: "0.78rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Note from your trainer
                  </strong>
                  {profile.coachNoteUpdatedAt && (
                    <span style={{ color: "var(--text-faint)", fontSize: "0.72rem" }}>
                      {new Date(profile.coachNoteUpdatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.5 }}>{profile.coachNote}</p>
                {profile.coachNoteUpdatedByName && (
                  <p style={{ margin: "8px 0 0", fontSize: "0.78rem", color: "var(--text-soft)" }}>
                    — {profile.coachNoteUpdatedByName}
                  </p>
                )}
              </section>
            ) : null}

            {program ? (
              <MemberWorkoutConsole
                exercises={exercises}
                gymId={gymId}
                initialActiveSessionCount={sessions.length}
                initialDayLogs={dayLogs}
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
          </div>
        }
        progressSection={
          <div className="member-dashboard-section member-progress-section">
            <MemberProgressPanel
              exercises={exercises}
              initialLiftLogs={liftLogs}
              memberId={member.id}
              program={program}
            />
            <div className="member-progress-history-card" id="history">
              <div className="panel-title" style={{ marginBottom: "20px" }}>
                <div>
                  <p className="eyebrow">History</p>
                  <h2>Recent training activity</h2>
                </div>
              </div>
              <MemberHistory
                liftLogs={liftLogs}
                exercises={exercises}
                dayLogs={dayLogs}
                activityLogs={activityLogs}
                macroLogs={macroLogs}
                macroTarget={profile.macroNutritionTarget}
              />
            </div>

            <div className="member-progress-history-card">
              <div className="panel-title" style={{ marginBottom: "20px" }}>
                <div>
                  <p className="eyebrow">Calendar</p>
                  <h2>Training calendar</h2>
                </div>
              </div>
              <WorkoutCalendar
                liftLogs={liftLogs}
                dayLogs={dayLogs}
                activityLogs={activityLogs}
                macroLogs={macroLogs}
                macroTarget={profile.macroNutritionTarget}
              />
            </div>

            <div className="member-progress-history-card">
              <div className="panel-title" style={{ marginBottom: "20px" }}>
                <div>
                  <p className="eyebrow">Cardio & mobility</p>
                  <h2>Log other activity</h2>
                </div>
              </div>
              <ActivityLogForm memberId={member.id} gymId={gymId} recentLogs={activityLogs} />
            </div>
          </div>
        }
        wellnessSection={
          <section className="member-dashboard-section member-wellness-section" aria-labelledby="member-wellness-title">
            <div className="panel-title">
              <div>
                <p className="eyebrow">Wellness</p>
                <h2 id="member-wellness-title">Body metrics & nutrition</h2>
              </div>
              <span className="status-pill status-neutral">Optional tracking</span>
            </div>
            
            <div style={{ padding: "0 22px" }}>
              <ProfileMetricsWidget profile={profile} />
            </div>

            <div className="member-wellness-grid">
              <div className="member-metrics-card">
                <h3>Profile metrics</h3>
                <p>Keep these updated so your trainer has useful context.</p>
                <EditableMetrics member={memberWithProfile as Member} />
              </div>
              <MacroProgressPanel
                memberId={member.id}
                gymId={gymId}
                date={todayDate}
                target={profile.macroNutritionTarget}
                initialActual={initialMacroLog ?? undefined}
                macroHistory={macroLogs}
              />
            </div>
          </section>
        }
      />
    </main>
  );
}
