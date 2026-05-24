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

  const assignedMemberIds = new Set(assignments.map((assignment) => assignment.memberId));
  const assignedMembers = members.filter((member) => assignedMemberIds.has(member.id));
  const unassignedMembers = members.filter((member) => !assignedMemberIds.has(member.id));
  const assignmentRate = members.length
    ? Math.round((assignedMembers.length / members.length) * 100)
    : 0;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const unassignedSorted = [...unassignedMembers].sort((a, b) =>
    getJoinedDate(a.joinedAt).getTime() - getJoinedDate(b.joinedAt).getTime()
  );
  const urgentUnassignedCount = unassignedSorted.filter(
    (member) => getJoinedDate(member.joinedAt) < sevenDaysAgo
  ).length;
  const currentPTPlans = ptPlans.filter((plan) => plan.status === "scheduled" || plan.status === "active");
  const activePTMembers = new Set(currentPTPlans.map((plan) => plan.memberId)).size;

  const primaryActionLabel = isTrainer || isStaff ? "View members" : "Assign workout plan";

  return (
    <main className="page owner-dashboard-page">
      <section className="owner-dashboard-hero">
        <div className="owner-dashboard-hero-copy">
          <Breadcrumb crumbs={[{ label: isTrainer ? "Trainer" : isStaff ? "Staff" : "Owner" }, { label: "Dashboard" }]} />
          <p className="eyebrow">{gym?.name ?? "Gym"} workspace</p>
          <h1>Training control room</h1>
          <p>
            Manage members, workout delivery, PT plans, and training-floor signals for {gym?.name ?? "your gym"}.
          </p>
        </div>

        <div className="owner-dashboard-actions">
          <Link className="owner-action-card is-primary" href="/owner/members?filter=no-plan&sort=oldest">
            <Dumbbell />
            <strong>{primaryActionLabel}</strong>
            <span>{unassignedMembers.length} member{unassignedMembers.length === 1 ? "" : "s"} need a workout plan</span>
          </Link>
          <Link className="owner-action-card" href="/owner/training?book=1">
            <Calendar />
            <strong>Assign PT plan</strong>
            <span>{currentPTPlans.length} current PT plan{currentPTPlans.length === 1 ? "" : "s"}</span>
          </Link>
          <Link className="owner-action-card" href="/owner/programs">
            <Activity />
            <strong>Program library</strong>
            <span>{programs.length} templates ready</span>
          </Link>
          {!isTrainer && !isStaff && (
            <Link className="owner-action-card" href="/owner/exercises">
              <Dumbbell />
              <strong>Exercise catalog</strong>
              <span>{exercises.length} exercises available</span>
            </Link>
          )}
        </div>
      </section>

      <section className="owner-metric-grid" aria-label="Owner summary">
        <article className="owner-metric-card">
          <UsersRound />
          <span>Total members</span>
          <strong>{members.length}</strong>
        </article>
        <article className="owner-metric-card">
          <Dumbbell />
          <span>Workout coverage</span>
          <strong>{assignmentRate}%</strong>
        </article>
        <article className="owner-metric-card">
          <Calendar />
          <span>Members on PT</span>
          <strong>{activePTMembers}</strong>
        </article>
        <article className="owner-metric-card">
          <Activity />
          <span>Active workouts</span>
          <strong>{workoutSessions.length}</strong>
        </article>
      </section>

      <section className="owner-dashboard-grid">
        <div className="owner-dashboard-main">
          <section className="list-panel owner-panel">
            <div className="panel-title">
              <h2>
                <UsersRound /> Priority queue
              </h2>
              <div className="owner-panel-actions">
                {urgentUnassignedCount > 0 && (
                  <span
                    className="status-pill status-warning"
                    title={`${urgentUnassignedCount} member${urgentUnassignedCount === 1 ? "" : "s"} have been waiting more than 7 days`}
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
              <p className="owner-empty-state">All members have a workout program assigned.</p>
            ) : (
              unassignedSorted.slice(0, 5).map((member) => (
                <MemberRow member={member} key={member.id} />
              ))
            )}
          </section>

          <section className="owner-tool-grid">
            <Link className="owner-tool-card" href="/owner/training?book=1">
              <Calendar />
              <div>
                <strong>PT plan assignment</strong>
                <span>Create a 30-day PT plan or change the duration before assigning.</span>
              </div>
            </Link>
            <Link className="owner-tool-card" href="/owner/members">
              <UsersRound />
              <div>
                <strong>Member roster</strong>
                <span>Review profiles, pins, trainers, and training context.</span>
              </div>
            </Link>
            <Link className="owner-tool-card" href="/owner/programs">
              <Dumbbell />
              <div>
                <strong>Workout programs</strong>
                <span>Manage predefined and custom plans without touching PT plans.</span>
              </div>
            </Link>
            <Link className="owner-tool-card" href="/owner/exercises">
              <Activity />
              <div>
                <strong>Exercise catalog</strong>
                <span>Update videos, custom exercises, and gym-specific demos.</span>
              </div>
            </Link>
          </section>

          <GymFloorLoadMap slots={slots} />
        </div>

        <aside className="owner-dashboard-side">
          <section className="list-panel owner-panel">
            <div className="panel-title">
              <h2>
                <Bell /> Notifications
              </h2>
              <span className="status-pill status-neutral">{ownerNotifications.length}</span>
            </div>
            <NotificationList items={ownerNotifications.slice(0, 5)} />
          </section>

          <section className="owner-pt-snapshot">
            <p className="eyebrow">PT snapshot</p>
            <h2>{currentPTPlans.length} active plan{currentPTPlans.length === 1 ? "" : "s"}</h2>
            <p>
              PT plans are tracked separately from normal assigned workout programs, so member scheduling stays clean.
            </p>
            <Link className="button button-primary" href="/owner/training">
              Open PT plans
            </Link>
          </section>

          <section className="list-panel owner-panel">
            <GymNoticeManager notices={gym?.notices ?? []} />
          </section>
        </aside>
      </section>
    </main>
  );
}
