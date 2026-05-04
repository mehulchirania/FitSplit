import Link from "next/link";
import { Bell, CalendarDays, Dumbbell, UsersRound } from "@/components/icons";
import { MemberRow } from "@/components/member-row";
import { NotificationList } from "@/components/notification-list";
import { OwnerAiCapacityPanel } from "@/components/owner-ai-capacity-panel";
import { StatusPill } from "@/components/status-pill";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import {
  getExerciseCatalog,
  getActiveWorkoutSessions,
  getMembersWithMemberships,
  getOwnerNotifications,
  getTitanWorkspace,
  getWorkoutPrograms
} from "@/lib/firebase/read-models";
import { getDaysRemaining, getMembershipStatus } from "@/lib/memberships";

export const dynamic = "force-dynamic";

export default async function OwnerDashboard() {
  const [
    { members, memberships },
    { notifications: ownerNotifications },
    { exercises },
    { programs },
    { gym },
    { sessions }
  ] = await Promise.all([
    getMembersWithMemberships(),
    getOwnerNotifications(),
    getExerciseCatalog(),
    getWorkoutPrograms(),
    getTitanWorkspace(),
    getActiveWorkoutSessions()
  ]);

  const memberMemberships = members
    .map((member) => ({
      member,
      membership: memberships.find((membership) => membership.memberId === member.id)!
    }))
    .filter((item) => item.membership);

  const counts = memberMemberships.reduce(
    (total, item) => {
      const status = getMembershipStatus(item.membership, gym.expiryWarningDays);
      total[status] += 1;
      return total;
    },
    { active: 0, expiring_soon: 0, expired: 0 }
  );

  return (
    <main className="page">
      <section className="dashboard-header">
        <div className="header-copy">
          <p className="eyebrow">Owner dashboard / {gym.name}</p>
          <h1>Run the floor with fewer blind spots.</h1>
          <p>
            Monitor memberships, renewal alerts, and assigned training programs
            for the Titan V2 Fitness pilot workspace, with AI positioned as an
            automated Semi-Personal Trainer that protects retention.
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
            <StatusPill status="expiring_soon" />
          </div>
          <NotificationList items={ownerNotifications} />
        </aside>
      </section>

      <section className="stats-grid" aria-label="Membership summary">
        <article className="stat-card">
          <UsersRound />
          <strong>{members.length}</strong>
          <span>Total members</span>
        </article>
        <article className="stat-card">
          <CalendarDays />
          <strong>{counts.active}</strong>
          <span>Active memberships</span>
        </article>
        <article className="stat-card">
          <Bell />
          <strong>{counts.expiring_soon}</strong>
          <span>Expiring soon</span>
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
        activeMembers={counts.active}
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
          {memberMemberships.map(({ member, membership }) => (
            <MemberRow
              member={member}
              membership={membership}
              key={member.id}
              warningDays={gym.expiryWarningDays}
            />
          ))}
        </div>

        <aside className="member-focus">
          <p className="eyebrow">Next renewal</p>
          <h2>Meera Iyer</h2>
          <p>
            Membership ends in {getDaysRemaining("2026-05-09")} days. The owner
            should confirm renewal payment and update the new plan window.
          </p>
          <div className="membership-window">
            <span>
              Current plan
              <strong>1 Month Renewal</strong>
            </span>
            <span>
              Action
              <strong>Renew or follow up</strong>
            </span>
          </div>
        </aside>
      </section>
    </main>
  );
}
