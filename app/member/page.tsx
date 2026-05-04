import { Bell, CalendarDays } from "@/components/icons";
import { MemberWorkoutConsole } from "@/components/member-workout-console";
import { NotificationList } from "@/components/notification-list";
import { StatusPill } from "@/components/status-pill";
import { getLiftLogsForMember } from "@/lib/firebase/read-models";
import { formatDate, getDaysRemaining, getMembershipStatus } from "@/lib/memberships";
import {
  assignments,
  gym,
  members,
  memberships,
  notifications,
  programs
} from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default async function MemberDashboard() {
  const member = members[0];
  const membership = memberships.find((item) => item.memberId === member.id)!;
  const status = getMembershipStatus(membership, gym.expiryWarningDays);
  const assignment = assignments.find(
    (item) => item.memberId === member.id && item.status === "active"
  );
  const program = programs.find((item) => item.id === assignment?.programId)!;
  const memberNotifications = notifications.filter(
    (notification) => notification.recipientId === member.id
  );
  const { liftLogs } = await getLiftLogsForMember(member.id);

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
