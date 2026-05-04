import { Bell, CalendarDays } from "@/components/icons";
import { MemberWorkoutConsole } from "@/components/member-workout-console";
import { NotificationList } from "@/components/notification-list";
import { StatusPill } from "@/components/status-pill";
import {
  getActiveWorkoutSessions,
  getExerciseCatalog,
  getLiftLogsForMember,
  getMemberDetail,
  getMemberNotifications,
  getProgramAssignmentForMember,
  getTitanWorkspace,
  getWorkoutPrograms
} from "@/lib/firebase/read-models";
import { formatDate, getDaysRemaining, getMembershipStatus } from "@/lib/memberships";

export const dynamic = "force-dynamic";

export default async function MemberDashboard() {
  const currentMemberId = "member-aarav";
  const [
    { gym },
    { member, membership },
    { assignment },
    { programs },
    { notifications: memberNotifications },
    { liftLogs },
    { exercises },
    { sessions }
  ] = await Promise.all([
    getTitanWorkspace(),
    getMemberDetail(currentMemberId),
    getProgramAssignmentForMember(currentMemberId),
    getWorkoutPrograms(),
    getMemberNotifications(currentMemberId),
    getLiftLogsForMember(currentMemberId),
    getExerciseCatalog(),
    getActiveWorkoutSessions()
  ]);

  if (!member || !membership) {
    return null;
  }

  const status = getMembershipStatus(membership, gym.expiryWarningDays);
  const program = programs.find((item) => item.id === assignment?.programId) ?? programs[0];

  return (
    <main className="page">
      <section className="dashboard-header">
        <div className="header-copy">
          <p className="eyebrow">Member dashboard</p>
          <h1>Today&apos;s plan is already set.</h1>
          <p>
            {member.fullName} can see membership dates, renewal status, and an
            AI Semi-Personal Trainer that adjusts workouts when limitations are
            logged.
          </p>
        </div>

        <aside className="summary-panel">
          <div className="panel-title">
            <h2>
              <CalendarDays /> Membership
            </h2>
            <StatusPill status={status} />
          </div>
          <div className="membership-window">
            <span>
              Starts
              <strong>{formatDate(membership.startDate)}</strong>
            </span>
            <span>
              Ends
              <strong>{formatDate(membership.endDate)}</strong>
            </span>
            <span>
              Days remaining
              <strong>{getDaysRemaining(membership.endDate)}</strong>
            </span>
            <span>
              Plan
              <strong>{membership.planName}</strong>
            </span>
          </div>
        </aside>
      </section>

      <MemberWorkoutConsole
        exercises={exercises}
        initialActiveSessionCount={sessions.length}
        initialLiftLogs={liftLogs}
        memberId={member.id}
        program={program}
      />

      <section className="content-grid" style={{ marginTop: 16 }}>
        <aside className="list-panel">
          <div className="panel-title">
            <h2>
              <Bell /> Notifications
            </h2>
          </div>
          <NotificationList items={memberNotifications} />
        </aside>
      </section>
    </main>
  );
}
