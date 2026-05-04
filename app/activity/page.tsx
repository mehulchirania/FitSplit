import Link from "next/link";
import { Activity, Bell, Dumbbell, UsersRound } from "@/components/icons";

type ActivityPageProps = {
  searchParams: Promise<{ role?: string }>;
};

const ownerEvents = [
  {
    icon: UsersRound,
    title: 'New member added - "Aarav Sharma"',
    detail: "Membership record created for Titan V2 Fitness.",
    time: "Today, 10:30 AM"
  },
  {
    icon: Dumbbell,
    title: "New workout plan created - Custom split v1",
    detail: "Owner-created custom plan is ready for assignment.",
    time: "Today, 9:45 AM"
  },
  {
    icon: Bell,
    title: 'Membership expiring soon - "Meera Iyer"',
    detail: "Renewal follow-up required before the current plan ends.",
    time: "Yesterday, 6:20 PM"
  }
];

const memberEvents = [
  {
    icon: Bell,
    title: "Membership status updated",
    detail: "Your active membership now shows the latest renewal window.",
    time: "Today, 11:10 AM"
  },
  {
    icon: Dumbbell,
    title: "New workout plan assigned",
    detail: "PPL + Upper/Lower is available in your member portal.",
    time: "Yesterday, 5:15 PM"
  },
  {
    icon: Activity,
    title: "Profile details reviewed",
    detail: "Your basic fitness profile is ready for owner review.",
    time: "Mon, 8:00 AM"
  }
];

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const { role } = await searchParams;
  const activeRole = role === "member" ? "member" : "owner";
  const events = activeRole === "member" ? memberEvents : ownerEvents;

  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <p className="eyebrow">Activity</p>
          <h1>{activeRole === "member" ? "Your account activity." : "Workspace activity feed."}</h1>
          <p>
            {activeRole === "member"
              ? "Personal membership and workout updates for the current member view."
              : "Global system events across the Titan V2 Fitness owner workspace."}
          </p>
          <div className="quick-actions">
            <Link
              className={`button ${activeRole === "owner" ? "button-primary" : "button-secondary"}`}
              href="/activity?role=owner"
            >
              Owner view
            </Link>
            <Link
              className={`button ${activeRole === "member" ? "button-primary" : "button-secondary"}`}
              href="/activity?role=member"
            >
              Member view
            </Link>
          </div>
        </div>
      </section>

      <section className="list-panel">
        <div className="panel-title">
          <h2>
            <Activity /> {activeRole === "member" ? "Personal feed" : "System feed"}
          </h2>
          <span className="status-pill status-neutral">
            {events.length} updates
          </span>
        </div>
        <div className="activity-feed">
          {events.map((event) => {
            const Icon = event.icon;
            return (
              <article className="activity-item" key={event.title}>
                <span className="activity-icon">
                  <Icon />
                </span>
                <div>
                  <h2>{event.title}</h2>
                  <p>{event.detail}</p>
                  <span>{event.time}</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
