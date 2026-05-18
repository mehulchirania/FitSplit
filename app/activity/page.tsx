import { Activity, Bell, Dumbbell, UsersRound } from "@/components/icons";
import { Breadcrumb } from "@/components/breadcrumb";
import { requireAuth } from "@/lib/auth";
import { getActivityEvents } from "@/lib/firebase/read-models";
import type { ActivityEvent } from "@/types/domain";

const eventIcons: Record<ActivityEvent["icon"], typeof Activity> = {
  activity: Activity,
  bell: Bell,
  dumbbell: Dumbbell,
  users: UsersRound
};

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const currentUser = await requireAuth();
  const [{ events: ownerEvents }, { events: memberEvents }] =
    currentUser.role === "member"
      ? await Promise.all([
          Promise.resolve({ events: [] }),
          getActivityEvents("member", currentUser.memberId ?? currentUser.uid, currentUser.gymId)
        ])
      : await Promise.all([
          getActivityEvents("owner", undefined, currentUser.gymId),
          getActivityEvents("member", undefined, currentUser.gymId)
        ]);
  const events = [...ownerEvents, ...memberEvents].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );

  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <Breadcrumb crumbs={[{ label: "Activity" }]} />
          <h1>{currentUser.role === "member" ? "Your activity feed." : "Full gym activity feed."}</h1>
          <p>
            {currentUser.role === "member"
              ? "Your workout, assignment, profile, and account events stay attached to your FitSplit account."
              : "All owner, member, workout, assignment, and system events across your gym, independent of which device is being used."}
          </p>
        </div>
      </section>

      <section className="list-panel">
        <div className="panel-title">
          <h2>
            <Activity /> All activity
          </h2>
          <span className="status-pill status-neutral">
            {events.length} updates
          </span>
        </div>
        <div className="activity-feed">
          {events.map((event) => {
            const Icon = eventIcons[event.icon];
            return (
              <article className="activity-item" key={event.id}>
                <span className="activity-icon">
                  <Icon />
                </span>
                <div>
                  <div className="toolbar">
                    <h2>{event.title}</h2>
                    <span className="status-pill status-neutral">{event.audience}</span>
                  </div>
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
