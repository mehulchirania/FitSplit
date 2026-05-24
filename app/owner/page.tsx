import Link from "next/link";
import { Activity, Bell, Calendar, Dumbbell, UsersRound } from "@/components/icons";
import { Breadcrumb } from "@/components/breadcrumb";
import { MemberRow } from "@/components/member-row";
import { NotificationList } from "@/components/notification-list";
import { GymNoticeManager } from "@/components/gym-notice-manager";
import { GymFloorLoadMap } from "@/components/gym-floor-load-map";
import { requireRole } from "@/lib/auth";
import {
  getActiveProgramAssignments,
  getActiveWorkoutSessions,
  getAllPTSessionsForGym,
  getExerciseCatalog,
  getGymDetail,
  getMembers,
  getOwnerNotifications,
  getWorkoutPrograms,
  getGymFloorLoadMap
} from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

function getJoinedDate(joinedAt: string) {
  const d = new Date(joinedAt);
  return Number.isFinite(d.getTime()) ? d : new Date();
}

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
    { sessions: workoutSessions },
    { assignments },
    { slots },
    ptPlans
  ] = await Promise.all([
    getMembers(gymId),
    getOwnerNotifications(gymId),
    getExerciseCatalog(gymId),
    getWorkoutPrograms(gymId),
    getGymDetail(gymId),
    getActiveWorkoutSessions(gymId),
    getActiveProgramAssignments(gymId),
    getGymFloorLoadMap(gymId),
    getAllPTSessionsForGym(gymId)
  ]);

  const assignedMemberIds = new Set(assignments.map((a) => a.memberId));
  const unassignedMembers = members.filter((m) => !assignedMemberIds.has(m.id));
  const assignmentRate = members.length
    ? Math.round(((members.length - unassignedMembers.length) / members.length) * 100)
    : 0;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const unassignedSorted = [...unassignedMembers].sort(
    (a, b) => getJoinedDate(a.joinedAt).getTime() - getJoinedDate(b.joinedAt).getTime()
  );
  const urgentUnassignedCount = unassignedSorted.filter(
    (m) => getJoinedDate(m.joinedAt) < sevenDaysAgo
  ).length;

  const currentPTPlans = ptPlans.filter(
    (p) => p.status === "scheduled" || p.status === "active"
  );
  const activePTMembers = new Set(currentPTPlans.map((p) => p.memberId)).size;

  return (
    <main className="page odp">
      {/* ── Page header ─────────────────────────────────────────── */}
      <header className="odp-header">
        <div className="odp-header-copy">
          <Breadcrumb
            crumbs={[
              { label: isTrainer ? "Trainer" : isStaff ? "Staff" : "Owner" },
              { label: "Dashboard" }
            ]}
          />
          <p className="eyebrow">{gym?.name ?? "Gym"} workspace</p>
          <h1>Dashboard</h1>
        </div>

        <nav aria-label="Quick actions" className="odp-quick-links">
          <Link
            className={unassignedMembers.length > 0 ? "odp-ql-link is-urgent" : "odp-ql-link"}
            href="/owner/members?filter=no-plan&sort=oldest"
          >
            <Dumbbell />
            <span>{isTrainer || isStaff ? "View members" : "Assign workout"}</span>
            {unassignedMembers.length > 0 && (
              <em className="odp-ql-badge">{unassignedMembers.length}</em>
            )}
          </Link>
          <Link className="odp-ql-link" href="/owner/training?book=1">
            <Calendar />
            <span>Assign PT</span>
          </Link>
          <Link className="odp-ql-link" href="/owner/members">
            <UsersRound />
            <span>Members</span>
          </Link>
          <Link className="odp-ql-link" href="/owner/programs">
            <Activity />
            <span>Programs</span>
          </Link>
          {!isTrainer && !isStaff && (
            <Link className="odp-ql-link" href="/owner/exercises">
              <Dumbbell />
              <span>Exercises</span>
            </Link>
          )}
        </nav>
      </header>

      {/* ── Stats bar ───────────────────────────────────────────── */}
      <section aria-label="Gym overview" className="odp-stats">
        <div className="odp-stat">
          <strong>{members.length}</strong>
          <span>Members</span>
        </div>
        <div className="odp-stat-sep" />
        <div className="odp-stat">
          <strong>{assignmentRate}%</strong>
          <span>Workout coverage</span>
        </div>
        <div className="odp-stat-sep" />
        <div className="odp-stat">
          <strong>{programs.length}</strong>
          <span>Programs</span>
        </div>
        <div className="odp-stat-sep" />
        <div className="odp-stat">
          <strong>{activePTMembers}</strong>
          <span>On PT</span>
        </div>
        <div className="odp-stat-sep" />
        <div className="odp-stat">
          <strong>{workoutSessions.length}</strong>
          <span>Active now</span>
        </div>
        {urgentUnassignedCount > 0 && (
          <>
            <div className="odp-stat-sep" />
            <div className="odp-stat odp-stat--urgent">
              <strong>{urgentUnassignedCount}</strong>
              <span>Urgent</span>
            </div>
          </>
        )}
      </section>

      {/* ── Content grid ────────────────────────────────────────── */}
      <div className="odp-grid">
        {/* ── Main column ─────────────────────────── */}
        <div className="odp-main">
          <section className="list-panel">
            <div className="panel-title">
              <h2>
                <UsersRound /> Priority queue
              </h2>
              <div className="odp-panel-actions">
                {urgentUnassignedCount > 0 && (
                  <span
                    className="status-pill status-warning"
                    title={`${urgentUnassignedCount} member${urgentUnassignedCount === 1 ? "" : "s"} waiting more than 7 days`}
                  >
                    {urgentUnassignedCount} urgent
                  </span>
                )}
                <Link className="button button-secondary" href="/owner/members?filter=no-plan&sort=oldest">
                  View all
                </Link>
              </div>
            </div>
            {unassignedSorted.length === 0 ? (
              <p className="odp-empty">All members have a workout program assigned.</p>
            ) : (
              unassignedSorted.slice(0, 5).map((member) => (
                <MemberRow key={member.id} member={member} />
              ))
            )}
          </section>

          <GymFloorLoadMap slots={slots} />
        </div>

        {/* ── Side column ─────────────────────────── */}
        <aside className="odp-side">
          <section className="list-panel">
            <div className="panel-title">
              <h2>
                <Bell /> Notifications
              </h2>
              {ownerNotifications.length > 0 && (
                <span className="status-pill status-neutral">{ownerNotifications.length}</span>
              )}
            </div>
            <NotificationList items={ownerNotifications.slice(0, 5)} />
          </section>

          <section className="list-panel">
            <GymNoticeManager notices={gym?.notices ?? []} />
          </section>
        </aside>
      </div>
    </main>
  );
}
