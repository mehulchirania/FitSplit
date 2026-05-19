import Link from "next/link";
import { Activity, Bell, Dumbbell, UsersRound } from "@/components/icons";
import { Breadcrumb } from "@/components/breadcrumb";
import { MemberRow } from "@/components/member-row";
import { NotificationList } from "@/components/notification-list";
import { OwnerAiCapacityPanel } from "@/components/owner-ai-capacity-panel";
import { GymNoticeManager } from "@/components/gym-notice-manager";
import { requireRole } from "@/lib/auth";
import {
  getActiveProgramAssignments,
  getActiveWorkoutSessions,
  getExerciseCatalog,
  getGymDetail,
  getMembers,
  getOwnerNotifications,
  getWorkoutPrograms
} from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function OwnerDashboard() {
  const currentUser = await requireRole(["admin", "owner"]);
  const isTrainer = currentUser.role === "owner" && currentUser.staffType === "trainer";
  const isStaff = currentUser.role === "owner" && currentUser.staffType === "staff";

  const gymId = currentUser.gymId;
  const [
    { members },
    { notifications: ownerNotifications },
    { exercises },
    { programs },
    { gym },
    { sessions },
    { assignments }
  ] = await Promise.all([
    getMembers(gymId),
    getOwnerNotifications(gymId),
    getExerciseCatalog(gymId),
    getWorkoutPrograms(gymId),
    getGymDetail(gymId),
    getActiveWorkoutSessions(gymId),
    getActiveProgramAssignments(gymId)
  ]);

  const assignedMemberIds = new Set(assignments.map((assignment) => assignment.memberId));
  const assignedMembers = members.filter((member) => assignedMemberIds.has(member.id));
  const unassignedMembers = members.filter((member) => !assignedMemberIds.has(member.id));
  const assignmentRate = members.length
    ? Math.round((assignedMembers.length / members.length) * 100)
    : 0;

  return (
    <main className="page">
      <section className="dashboard-header compact-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px" }}>
        <div className="header-copy">
          <Breadcrumb crumbs={[{ label: isTrainer ? "Trainer" : isStaff ? "Staff" : "Owner" }, { label: "Dashboard" }]} />
          <h1>Training ops command center.</h1>
          <p>
            See who has a plan, who still needs one, what is happening on the
            floor right now, and where to act next for {gym?.name ?? "your gym"}.
          </p>
          <div className="quick-actions" style={{ marginTop: 14 }}>
            <Link className="button button-primary" href="/owner/members">
              {isTrainer || isStaff ? "View members" : "Assign member plans"}
            </Link>
            <Link className="button button-secondary" href="/owner/programs">
              Review programs
            </Link>
            {!isTrainer && !isStaff && (
              <Link className="button button-secondary" href="/owner/exercises">
                Open catalog
              </Link>
            )}
          </div>
        </div>
      </section>

      <OwnerAiCapacityPanel
        activeHeadcount={sessions.length}
        activeMembers={members.length}
        activeSessions={sessions}
        assignmentRate={assignmentRate}
        members={members}
        programCount={programs.length}
      />

      <section className="ui-cards" aria-label="Owner summary" style={{ marginTop: 16 }}>
        <article className="ui-card blue">
          <p className="tip"><UsersRound /> {members.length}</p>
          <p className="second-text">Total members</p>
        </article>
        <article className="ui-card green">
          <p className="tip"><Dumbbell /> {assignedMembers.length}</p>
          <p className="second-text">Assigned plans</p>
        </article>
        <article className="ui-card red">
          <p className="tip"><Bell /> {unassignedMembers.length}</p>
          <p className="second-text">Need assignment</p>
        </article>
        <article className="ui-card purple">
          <p className="tip"><Activity /> {sessions.length}</p>
          <p className="second-text">Active workouts</p>
        </article>
      </section>

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
          {unassignedMembers.length === 0 ? (
            <p style={{ padding: "20px 0", color: "var(--text-soft)", textAlign: "center", fontSize: "0.9rem" }}>
              All members have a program assigned.
            </p>
          ) : (
            unassignedMembers.map((member) => (
              <MemberRow member={member} key={member.id} />
            ))
          )}
        </div>

        <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
          <aside className="list-panel">
            <div className="panel-title">
              <h2>
                <Bell /> Attention
              </h2>
              <span className="status-pill status-neutral">{ownerNotifications.length} updates</span>
            </div>
            <NotificationList items={ownerNotifications.slice(0, 4)} />
          </aside>
          
          <aside className="member-focus">
            <p className="eyebrow">Today&apos;s checklist</p>
            <h2>{assignmentRate}% coverage</h2>
            <p style={{ marginBottom: 0 }}>
              Start with members who need plans, then open Workout Programs to
              review plan details before assigning.
            </p>
          </aside>

          <aside className="list-panel">
            <GymNoticeManager notices={gym?.notices ?? []} />
          </aside>
        </div>
      </section>
    </main>
  );
}
