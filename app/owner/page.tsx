import Link from "next/link";
import { Activity, Bell, Dumbbell, UsersRound } from "@/components/icons";
import { MemberRow } from "@/components/member-row";
import { NotificationList } from "@/components/notification-list";
import { OwnerAiCapacityPanel } from "@/components/owner-ai-capacity-panel";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import {
  getActiveProgramAssignments,
  getActiveWorkoutSessions,
  getExerciseCatalog,
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
    { sessions },
    { assignments }
  ] = await Promise.all([
    getMembers(),
    getOwnerNotifications(),
    getExerciseCatalog(),
    getWorkoutPrograms(),
    getTitanWorkspace(),
    getActiveWorkoutSessions(),
    getActiveProgramAssignments()
  ]);

  const assignedMemberIds = new Set(assignments.map((assignment) => assignment.memberId));
  const assignedMembers = members.filter((member) => assignedMemberIds.has(member.id));
  const unassignedMembers = members.filter((member) => !assignedMemberIds.has(member.id));
  const assignmentRate = members.length
    ? Math.round((assignedMembers.length / members.length) * 100)
    : 0;

  return (
    <main className="page">
      <section className="dashboard-header">
        <div className="header-copy">
          <p className="eyebrow">Owner dashboard / {gym.name}</p>
          <h1>Training ops command center.</h1>
          <p>
            See who has a plan, who still needs one, what is happening on the
            floor right now, and where to act next for Titan V2 Fitness.
          </p>
          <div className="quick-actions">
            <Link className="button button-primary" href="/owner/members">
              Assign member plans
            </Link>
            <Link className="button button-secondary" href="/owner/programs">
              Review programs
            </Link>
            <Link className="button button-secondary" href="/owner/exercises">
              Open catalog
            </Link>
          </div>
        </div>

        <aside className="summary-panel">
          <WorkspaceSwitcher />
          <div className="panel-title">
            <h2>
              <Bell /> Attention
            </h2>
            <span className="status-pill status-neutral">{ownerNotifications.length} updates</span>
          </div>
          <NotificationList items={ownerNotifications.slice(0, 3)} />
        </aside>
      </section>

      <section className="stats-grid" aria-label="Owner summary">
        <article className="stat-card">
          <UsersRound />
          <strong>{members.length}</strong>
          <span>Total members</span>
        </article>
        <article className="stat-card">
          <Dumbbell />
          <strong>{assignedMembers.length}</strong>
          <span>Members with assigned plans</span>
        </article>
        <article className="stat-card">
          <Bell />
          <strong>{unassignedMembers.length}</strong>
          <span>Need workout assignment</span>
        </article>
        <article className="stat-card">
          <Activity />
          <strong>{sessions.length}</strong>
          <span>Active workouts now</span>
        </article>
        <article className="stat-card">
          <Dumbbell />
          <strong>{programs.length}</strong>
          <span>Workout plans</span>
        </article>
        <article className="stat-card">
          <Dumbbell />
          <strong>{exercises.length}</strong>
          <span>Catalog exercises</span>
        </article>
      </section>

      <OwnerAiCapacityPanel
        activeHeadcount={sessions.length}
        activeMembers={members.length}
        activeSessions={sessions}
        assignmentRate={assignmentRate}
        members={members}
        programCount={programs.length}
      />

      <section className="content-grid" style={{ marginTop: 16 }}>
        <div className="list-panel">
          <div className="panel-title">
            <h2>
              <UsersRound /> Members needing plans
            </h2>
            <Link className="button button-secondary" href="/owner/members">
              View all
            </Link>
          </div>
          {(unassignedMembers.length ? unassignedMembers : members.slice(0, 4)).map((member) => (
            <MemberRow member={member} key={member.id} />
          ))}
        </div>

        <aside className="member-focus">
          <p className="eyebrow">Today&apos;s owner checklist</p>
          <h2>{assignmentRate}% assignment coverage</h2>
          <p>
            Start with members who need plans, then open Workout Programs to
            review plan details before assigning.
          </p>
          <div className="detail-window">
            <span>
              Priority
              <strong>{unassignedMembers.length} plan gaps</strong>
            </span>
            <span>
              Capacity
              <strong>{sessions.length} active now</strong>
            </span>
          </div>
          <div className="quick-actions" style={{ marginTop: 14 }}>
            <Link className="button button-primary" href="/owner/members">
              Assign plans
            </Link>
            <Link className="button button-secondary" href="/owner/programs">
              Review programs
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
