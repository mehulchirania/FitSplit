import Link from "next/link";
import { OwnerQuickLinks } from "@/components/owner-quick-links";
import { Bell, UsersRound } from "@/components/icons";
import { Breadcrumb } from "@/components/breadcrumb";
import { MemberRow } from "@/components/member-row";
import { NotificationList } from "@/components/notification-list";
import { GymNoticeManager } from "@/components/gym-notice-manager";
import { GymFloorLoadMap } from "@/components/gym-floor-load-map-lazy";
import { AttendanceTrendChart } from "@/components/attendance-trend-chart-lazy";
import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import {
  getActiveProgramAssignments,
  getActiveWorkoutSessions,
  getGymDetail,
  getMembers,
  getOwnerNotifications,
  getGymFloorLoadMap,
  getRecentSessionCounts,
  getPendingPaymentRequests,
  getGymDashboardSummary,
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
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;

  const [
    { members },
    { notifications: ownerNotifications },
    { gym },
    { sessions: workoutSessions },
    { assignments },
    { slots },
    sessionCounts,
    pendingPayments,
    dashboardSummary,
  ] = await Promise.all([
    getMembers(gymId),
    getOwnerNotifications(gymId),
    getGymDetail(gymId),
    getActiveWorkoutSessions(gymId),
    getActiveProgramAssignments(gymId),
    getGymFloorLoadMap(gymId),
    getRecentSessionCounts(gymId),
    getPendingPaymentRequests(gymId),
    getGymDashboardSummary(gymId),
  ]);

  const assignedMemberIds = new Set(assignments.map((a) => a.memberId));
  const unassignedMembers = members.filter((m) => !assignedMemberIds.has(m.id));


  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const unassignedSorted = [...unassignedMembers].sort(
    (a, b) => getJoinedDate(a.joinedAt).getTime() - getJoinedDate(b.joinedAt).getTime()
  );
  const urgentUnassignedCount = unassignedSorted.filter(
    (m) => getJoinedDate(m.joinedAt) < sevenDaysAgo
  ).length;



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
          <p className="eyebrow">{gym?.name ?? "Gym"}</p>
          <h1>Dashboard</h1>
        </div>

        <OwnerQuickLinks
          unassignedMembersCount={unassignedMembers.length}
          pendingPaymentCount={pendingPayments.length}
          isTrainer={isTrainer}
          isStaff={isStaff}
        />
      </header>

      {/* ── Action Banner for Trainers ──────────────────────────── */}
      {(isTrainer || isStaff) && unassignedMembers.length > 0 && (
        <div className="ui-card red" style={{ marginBottom: "20px", padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "16px" }}>
          <div>
            <h2 style={{ color: "#fff", margin: 0, fontSize: "1.2rem" }}>{unassignedMembers.length} Members Need Workouts</h2>
            <p style={{ color: "rgba(255,255,255,0.8)", margin: "4px 0 0", fontSize: "0.9rem" }}>Tap here to assign them a plan.</p>
          </div>
          <Link href="/owner/members?filter=no-plan&sort=oldest" className="button button-primary" style={{ flexShrink: 0 }}>
            Review Now
          </Link>
        </div>
      )}

      {/* ── Stats bar ───────────────────────────────────────────── */}
      <section aria-label="Gym overview" className="odp-stats">
        <div className="odp-stat">
          <strong>{dashboardSummary?.totalMembers ?? members.length}</strong>
          <span>All Members</span>
        </div>
        <div className="odp-stat-sep" />
        <div className={unassignedMembers.length > 0 ? "odp-stat odp-stat--urgent" : "odp-stat"}>
          <strong>{unassignedMembers.length}</strong>
          <span>Need Workouts</span>
        </div>
        <div className="odp-stat-sep" />
        <div className={workoutSessions.length > 0 ? "odp-stat odp-stat--active" : "odp-stat"}>
          <strong>{workoutSessions.length}</strong>
          <span>In Gym Now</span>
        </div>
        <div className="odp-stat-sep" />
        {dashboardSummary?.expiringThisWeek !== undefined && dashboardSummary.expiringThisWeek > 0 ? (
          <Link href="/owner/billing" className={`odp-stat odp-stat--urgent odp-stat-link`} style={{ textDecoration: "none" }}>
            <strong>{dashboardSummary.expiringThisWeek}</strong>
            <span>Expiring Soon</span>
          </Link>
        ) : (
          <div className="odp-stat">
            <strong>{dashboardSummary?.activeMembers ?? assignedMemberIds.size}</strong>
            <span>Active Members</span>
          </div>
        )}
        {dashboardSummary?.totalRevenueMTD !== undefined && (
          <>
            <div className="odp-stat-sep" />
            <Link href="/owner/billing" className="odp-stat odp-stat-link" style={{ textDecoration: "none" }}>
              <strong>{dashboardSummary.currency} {dashboardSummary.totalRevenueMTD.toLocaleString("en-IN")}</strong>
              <span>Revenue MTD</span>
            </Link>
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
                <UsersRound /> Needs Attention
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

          {!isTrainer && !isStaff && (
            <>
              <GymFloorLoadMap slots={slots} />
              {/* C10: Attendance-over-time LineChart */}
              <AttendanceTrendChart data={sessionCounts} />
            </>
          )}
        </div>

        {/* ── Side column ─────────────────────────── */}
        <aside className="odp-side">
          <section className="list-panel">
            <div className="panel-title">
              <h2>
                <Bell /> Notifications
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {ownerNotifications.length > 0 && (
                  <span className="status-pill status-neutral">{ownerNotifications.length}</span>
                )}
                <Link href="/owner/notifications" style={{ fontSize: "0.8rem", color: "var(--text-soft)" }}>
                  See all →
                </Link>
              </div>
            </div>
            <NotificationList items={ownerNotifications.slice(0, 8)} />
          </section>

          <section className="list-panel">
            <GymNoticeManager notices={gym?.notices ?? []} />
          </section>
        </aside>
      </div>
    </main>
  );
}
