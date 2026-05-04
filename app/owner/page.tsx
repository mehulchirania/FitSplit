import Link from "next/link";
import { Activity, Bell, Dumbbell, UsersRound } from "@/components/icons";
import { MemberRow } from "@/components/member-row";
import { NotificationList } from "@/components/notification-list";
import { OwnerAiCapacityPanel } from "@/components/owner-ai-capacity-panel";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import {
  getExerciseCatalog,
  getActiveWorkoutSessions,
  getMembers,
  getOwnerNotifications,
  getTitanWorkspace,
  getWorkoutPrograms
} from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function OwnerDashboard() {
  const [
    { members },
    { notifications: ownerNotifications },
    { exercises },
    { programs },
    { gym },
    { sessions }
  ] = await Promise.all([
    getMembers(),
    getOwnerNotifications(),
    getExerciseCatalog(),
    getWorkoutPrograms(),
    getTitanWorkspace(),
    getActiveWorkoutSessions()
  ]);

  return (
    <main className="page">
      <section className="dashboard-header">
        <div className="header-copy">
          <p className="eyebrow">Owner dashboard / {gym.name}</p>
          <h1>Run the floor with fewer blind spots.</h1>
          <p>
            Monitor members, assigned training programs, live capacity, and
            owner-created workout systems for the Titan V2 Fitness pilot gym.
            FitSplit focuses on training delivery while your existing app keeps
            handling membership tracking.
          </p>
          <div className="quick-actions">
            <Link className="button button-primary" href="/owner/members">
              Manage members
            </Link>
            <Link className="button button-secondary" href="/owner/programs">
              Edit programs
            </Link>
          </div>
        </div>

        <aside className="summary-panel">
          <WorkspaceSwitcher />
          <div className="panel-title">
            <h2>
              <Bell /> Attention
            </h2>
            <span className="status-pill status-neutral">Activity</span>
          </div>
          <NotificationList items={ownerNotifications} />
        </aside>
      </section>

      <section className="stats-grid" aria-label="Owner summary">
        <article className="stat-card">
          <UsersRound />
          <strong>{members.length}</strong>
          <span>Total members</span>
        </article>
        <article className="stat-card">
          <Activity />
          <strong>{sessions.length}</strong>
          <span>Active workouts now</span>
        </article>
        <article className="stat-card">
          <Dumbbell />
          <strong>{programs.length}</strong>
          <span>Workout split templates</span>
        </article>
        <article className="stat-card">
          <Dumbbell />
          <strong>{exercises.length}</strong>
          <span>Owner catalog exercises</span>
        </article>
      </section>

      <OwnerAiCapacityPanel
        activeMembers={members.length}
        activeHeadcount={sessions.length}
        programCount={programs.length}
      />

      <section className="content-grid" style={{ marginTop: 16 }}>
        <div className="list-panel">
          <div className="panel-title">
            <h2>
              <UsersRound /> Members
            </h2>
            <Link className="button button-secondary" href="/owner/members">
              View all
            </Link>
          </div>
          {members.map((member) => (
            <MemberRow member={member} key={member.id} />
          ))}
        </div>

        <aside className="member-focus">
          <p className="eyebrow">Training flow</p>
          <h2>Members → Programs → Weekly schedule</h2>
          <p>
            Add or edit a member, review their assigned program, then use the
            Programs and Catalog areas to keep workouts ready for weekly use.
          </p>
          <div className="detail-window">
            <span>
              Next step
              <strong>Open member record</strong>
            </span>
            <span>
              Action
              <strong>Review assigned plan</strong>
            </span>
          </div>
        </aside>
      </section>
    </main>
  );
}
