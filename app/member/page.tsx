import { Bell, CalendarDays, Dumbbell } from "@/components/icons";
import { ExerciseList } from "@/components/exercise-list";
import { NotificationList } from "@/components/notification-list";
import { StatusPill } from "@/components/status-pill";
import { formatDate, getDaysRemaining, getMembershipStatus } from "@/lib/memberships";
import {
  assignments,
  gym,
  members,
  memberships,
  notifications,
  programs
} from "@/lib/mock-data";

export default function MemberDashboard() {
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

  return (
    <main className="page">
      <section className="dashboard-header">
        <div className="header-copy">
          <p className="eyebrow">Member dashboard</p>
          <h1>Today&apos;s plan is already set.</h1>
          <p>
            {member.fullName} can see membership dates, renewal status, and the
            assigned workout program with demonstration videos.
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

      <section className="content-grid">
        <div className="list-panel">
          <div className="panel-title">
            <h2>
              <Dumbbell /> {program.title}
            </h2>
            <span className="status-pill status-neutral">
              {program.daysPerWeek} days/week
            </span>
          </div>
          <div className="notification-list">
            {program.days.map((day) => (
              <article key={day.id}>
                <p className="eyebrow">Day {day.dayNumber}</p>
                <h2>{day.title}</h2>
                <p>{day.focus}</p>
                <ExerciseList items={day.exercises} />
              </article>
            ))}
          </div>
        </div>

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
