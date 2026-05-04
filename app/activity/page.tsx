import Link from "next/link";
import { Activity, Bell, Dumbbell, UsersRound } from "@/components/icons";
import { getActivityEvents } from "@/lib/firebase/read-models";
import type { ActivityEvent } from "@/types/domain";

type ActivityPageProps = {
  searchParams: Promise<{ role?: string }>;
};

const eventIcons: Record<ActivityEvent["icon"], typeof Activity> = {
  activity: Activity,
  bell: Bell,
  dumbbell: Dumbbell,
  users: UsersRound
};

export const dynamic = "force-dynamic";

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const { role } = await searchParams;
  const activeRole = role === "member" ? "member" : "owner";
  const { events } = await getActivityEvents(activeRole, "member-aarav");

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
            const Icon = eventIcons[event.icon];
            return (
              <article className="activity-item" key={event.title}>
                <span className="activity-icon">
                  <Icon />
                </span>
                <div>
                  <h2>{event.title}</h2>
                  <p>{event.detail}</p>
                  <span>{new Date(event.createdAt).toLocaleString("en-IN")}</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
