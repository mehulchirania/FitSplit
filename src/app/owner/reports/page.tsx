import Link from "next/link";
import { requireOwnerPage } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import { AttendanceTrendChart } from "@/components/attendance-trend-chart";
import { UsersRound } from "@/components/icons";
import {
  getActiveProgramAssignments,
  getActiveWorkoutSessions,
  getAllPTSessionsForGym,
  getGymDetail,
  getGymFloorLoadMap,
  getMembers,
  getWorkoutPrograms,
  getRecentSessionCounts
} from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function OwnerReportsPage() {
  const currentUser = await requireOwnerPage();
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;

  const [
    { members },
    { programs },
    { assignments },
    { sessions: activeSessions },
    { gym },
    { slots },
    ptPlans,
    sessionCounts
  ] = await Promise.all([
    getMembers(gymId),
    getWorkoutPrograms(gymId),
    getActiveProgramAssignments(gymId),
    getActiveWorkoutSessions(gymId),
    getGymDetail(gymId),
    getGymFloorLoadMap(gymId),
    getAllPTSessionsForGym(gymId),
    getRecentSessionCounts(gymId)
  ]);

  // ── Member stats ─────────────────────────────────────────────
  const activeMembers = members.filter((m) => m.isActive);
  const inactiveMembers = members.filter((m) => !m.isActive);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  const newThisMonth = members.filter(
    (m) => m.joinedAt >= thisMonthStart.slice(0, 10)
  ).length;
  const newLastMonth = members.filter(
    (m) =>
      m.joinedAt >= lastMonthStart.slice(0, 10) &&
      m.joinedAt < thisMonthStart.slice(0, 10)
  ).length;

  // ── Workout coverage ─────────────────────────────────────────
  const assignedMemberIds = new Set(assignments.map((a) => a.memberId));
  const assignedCount = activeMembers.filter((m) => assignedMemberIds.has(m.id)).length;
  const coveragePct = activeMembers.length
    ? Math.round((assignedCount / activeMembers.length) * 100)
    : 0;
  const unassignedCount = activeMembers.length - assignedCount;
  const coverageTone = coveragePct >= 80 ? "ok" : coveragePct >= 50 ? "mid" : "low";

  // ── Program assignment counts ─────────────────────────────────
  const programAssignCount: Record<string, number> = {};
  for (const a of assignments) {
    programAssignCount[a.programId] = (programAssignCount[a.programId] ?? 0) + 1;
  }
  const programRows = programs
    .map((p) => ({ name: p.title, count: programAssignCount[p.id] ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // ── PT plan stats ─────────────────────────────────────────────
  const ptByStatus: Record<string, number> = { scheduled: 0, active: 0, completed: 0, cancelled: 0 };
  for (const s of ptPlans) {
    if (s.status in ptByStatus) ptByStatus[s.status]++;
  }
  const ptActiveMemberCount = new Set(
    ptPlans
      .filter((p) => p.status === "scheduled" || p.status === "active")
      .map((p) => p.memberId)
  ).size;

  // ── Slot distribution ─────────────────────────────────────────
  // slots is SlotLoad[] — each item has slotId ("A"|"B"|"C"|"D") and memberCount
  const totalSlotted = slots.reduce((n, s) => n + s.memberCount, 0);

  const asOfDate = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

  const pageHeader = (
    <header className="rpt-header">
      <nav aria-label="breadcrumb" className="rpt-crumbs">
        <Link href="/owner">Dashboard</Link>
        <span aria-hidden>/</span>
        <span>Reports</span>
      </nav>
      <h1 className="rpt-title">{gym?.name ?? "Gym"} — Reports</h1>
    </header>
  );

  // Zero-member empty state
  if (members.length === 0) {
    return (
      <div className="odp2-scroll rpt-root">
        {pageHeader}
        <div className="rpt-empty">
          <UsersRound />
          <h2>No members yet</h2>
          <p>Add your first member to start seeing attendance trends, workout coverage, and PT plan reports.</p>
          <Link href="/owner/members" className="adm-btn">Add a member →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="odp2-scroll rpt-root">
      {pageHeader}
      <p className="rpt-subtitle">
        As of {asOfDate} · <strong>{members.length}</strong> members · <strong>{activeSessions.length}</strong> training now
      </p>

      {/* ── Top-line KPIs ───────────────────────────────────────── */}
      <div className="rpt-kpis">
        <Link href="/owner/members" className="rpt-kpi rpt-kpi--brand">
          <span className="rpt-kpi__label">Total members</span>
          <span className="rpt-kpi__value">{members.length}</span>
          <span className="rpt-kpi__delta">{activeMembers.length} active</span>
        </Link>
        <Link
          href="/owner/members?tab=all"
          className={`rpt-kpi${inactiveMembers.length > 0 ? " rpt-kpi--warn" : ""}`}
        >
          <span className="rpt-kpi__label">Suspended</span>
          <span className="rpt-kpi__value">{inactiveMembers.length}</span>
          <span className="rpt-kpi__delta">inactive accounts</span>
        </Link>
        <Link href="/owner/members" className="rpt-kpi">
          <span className="rpt-kpi__label">New this month</span>
          <span className="rpt-kpi__value">{newThisMonth}</span>
          <span className="rpt-kpi__delta">{newLastMonth} last month</span>
        </Link>
        <div className={`rpt-kpi${activeSessions.length > 0 ? " rpt-kpi--brand" : ""}`}>
          <span className="rpt-kpi__label">Live now</span>
          <span className="rpt-kpi__value">{activeSessions.length}</span>
          <span className="rpt-kpi__delta">active sessions</span>
        </div>
      </div>

      {/* ── Attendance Trend ────────────────────────────────────── */}
      <div className="rpt-section">
        <AttendanceTrendChart data={sessionCounts} />
      </div>

      <div className="rpt-grid">

        {/* ── Workout coverage ──────────────────────────────────── */}
        <div className="adm-card">
          <div className="adm-card__head">
            <h3>Workout Coverage</h3>
            <span className="adm-inbox-tag adm-inbox-tag--ok">{coveragePct}%</span>
          </div>
          <div className="adm-card__body">
            <div className="rpt-coverage-row">
              <div
                aria-label={`${coveragePct}% workout coverage`}
                role="progressbar"
                aria-valuenow={coveragePct}
                aria-valuemin={0}
                aria-valuemax={100}
                className="rpt-progress"
              >
                <div
                  className={`rpt-progress-fill rpt-progress-fill--${coverageTone}`}
                  style={{ width: `${coveragePct}%` }}
                />
              </div>
              <span className="rpt-coverage-value">{coveragePct}%</span>
            </div>
            <div className="rpt-statline">
              <span><strong>{assignedCount}</strong> assigned</span>
              <span>
                {unassignedCount > 0 ? (
                  <Link href="/owner/members?tab=no-plan">
                    <strong>{unassignedCount}</strong> unassigned
                  </Link>
                ) : (
                  <><strong>{unassignedCount}</strong> unassigned</>
                )}
              </span>
              <span><strong>{programs.length}</strong> programs</span>
            </div>
          </div>
        </div>

        {/* ── PT Plans ──────────────────────────────────────────── */}
        <div className="adm-card">
          <div className="adm-card__head">
            <h3>PT Plans</h3>
            <span className="adm-inbox-tag">{ptPlans.length} total</span>
          </div>
          <div className="adm-card__body">
            <div className="rpt-quad">
              {(
                [
                  ["Scheduled", ptByStatus["scheduled"] ?? 0, ""],
                  ["Active",    ptByStatus["active"]    ?? 0, "rpt-quad-cell--active"],
                  ["Completed", ptByStatus["completed"] ?? 0, ""],
                  ["Cancelled", ptByStatus["cancelled"] ?? 0, "rpt-quad-cell--cancelled"],
                ] as [string, number, string][]
              ).map(([label, count, modifier]) => (
                <div key={label} className={`rpt-quad-cell${modifier ? ` ${modifier}` : ""}`}>
                  <strong>{count}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            {ptActiveMemberCount > 0 && (
              <p className="rpt-quad-footer">
                <strong>{ptActiveMemberCount}</strong>{" "}
                member{ptActiveMemberCount !== 1 ? "s" : ""} currently on a PT plan
              </p>
            )}
          </div>
        </div>

        {/* ── Program popularity ────────────────────────────────── */}
        <div className="adm-card">
          <div className="adm-card__head">
            <h3>Programs by Assignments</h3>
          </div>
          {programRows.length === 0 ? (
            <div className="adm-empty">No programs yet.</div>
          ) : (
            <>
              <ul className="rpt-bars">
                {programRows.map((row) => {
                  const barPct = programRows[0]?.count
                    ? Math.round((row.count / programRows[0].count) * 100)
                    : 0;
                  return (
                    <li key={row.name} className={`rpt-bar-row${row.count === 0 ? " rpt-bar-row--zero" : ""}`}>
                      <span className="rpt-bar-label" title={row.name}>{row.name}</span>
                      <div className="rpt-bar-track">
                        <div className="rpt-bar-fill" style={{ width: `${barPct}%` }} />
                      </div>
                      <span className="rpt-bar-count">{row.count}</span>
                    </li>
                  );
                })}
              </ul>
              {programs.length > 8 && (
                <Link href="/owner/programs" className="rpt-more-link">
                  View all {programs.length} programs →
                </Link>
              )}
            </>
          )}
        </div>

        {/* ── Slot distribution ─────────────────────────────────── */}
        <div className="adm-card">
          <div className="adm-card__head">
            <h3>Slot Distribution</h3>
            <span className="adm-inbox-tag">{totalSlotted} slotted</span>
          </div>
          {totalSlotted === 0 ? (
            <div className="adm-empty">No slot assignments yet.</div>
          ) : (
            <div className="adm-card__body rpt-slots">
              {(["A", "B", "C", "D"] as const).map((slot) => {
                const slotData = slots.find((s) => s.slotId === slot);
                const count = slotData?.memberCount ?? 0;
                const pct = totalSlotted ? Math.round((count / totalSlotted) * 100) : 0;
                return (
                  <div key={slot} className="rpt-slot-cell">
                    <strong>{count}</strong>
                    <span>Slot {slot}</span>
                    <em>{pct}%</em>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
