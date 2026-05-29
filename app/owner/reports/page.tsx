/* eslint-disable @typescript-eslint/no-unused-vars */
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import { AttendanceTrendChart } from "@/components/attendance-trend-chart-lazy";
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
  const currentUser = await requireRole(["admin", "owner"]);
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

  const pageHeader = (
    <div className="adm-page-head">
      <div>
        <div className="adm-crumb">Dashboard / Reports</div>
        <h1 className="adm-title">{gym?.name ?? "Gym"} — Reports</h1>
      </div>
    </div>
  );

  // Zero-member empty state
  if (members.length === 0) {
    return (
      <div className="odp2-scroll">
        {pageHeader}
        <div className="adm-card" style={{ marginTop: 16 }}>
          <div className="adm-empty" style={{ flexDirection: "column", gap: 12, padding: "48px 32px", textAlign: "center" }}>
            <p style={{ fontWeight: 700, fontSize: "1.05rem", margin: 0 }}>No members yet</p>
            <span style={{ fontSize: "0.875rem", lineHeight: 1.6 }}>
              Add your first member to start seeing attendance trends, workout coverage, and PT plan reports.
            </span>
            <Link href="/owner/members" className="adm-btn" style={{ marginTop: 8 }}>Add a member →</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="odp2-scroll">
      {pageHeader}
      <p className="adm-page-desc">
        As of {now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
      </p>

      {/* ── Top-line KPIs ───────────────────────────────────────── */}
      <div className="adm-kpis adm-kpis--4" style={{ marginBottom: "1.25rem" }}>
        <div className="adm-kpi adm-kpi--brand">
          <small>TOTAL MEMBERS</small>
          <strong>{members.length}</strong>
          <em>{activeMembers.length} active</em>
        </div>
        <div className={`adm-kpi${inactiveMembers.length > 0 ? " adm-kpi--warn" : ""}`}>
          <small>SUSPENDED</small>
          <strong>{inactiveMembers.length}</strong>
          <em>inactive accounts</em>
        </div>
        <div className="adm-kpi adm-kpi--accent">
          <small>NEW THIS MONTH</small>
          <strong>{newThisMonth}</strong>
          <em>{newLastMonth} last month</em>
        </div>
        <div className={`adm-kpi${activeSessions.length > 0 ? " adm-kpi--brand" : ""}`}>
          <small>LIVE NOW</small>
          <strong>{activeSessions.length}</strong>
          <em>active sessions</em>
        </div>
      </div>

      {/* ── Attendance Trend ────────────────────────────────────── */}
      <div style={{ marginBottom: "1.25rem" }}>
        <AttendanceTrendChart data={sessionCounts} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 22rem), 1fr))", gap: "1rem" }}>

        {/* ── Workout coverage ──────────────────────────────────── */}
        <div className="adm-card">
          <div className="adm-card__head">
            <h3>Workout Coverage</h3>
            <span className="adm-inbox-tag adm-inbox-tag--ok">{coveragePct}%</span>
          </div>
          <div className="adm-card__body">
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div
                aria-label={`${coveragePct}% workout coverage`}
                role="progressbar"
                aria-valuenow={coveragePct}
                aria-valuemin={0}
                aria-valuemax={100}
                style={{ flex: 1, height: 8, borderRadius: 999, background: "var(--bg-muted)", overflow: "hidden" }}
              >
                <div
                  style={{
                    width: `${coveragePct}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: coveragePct >= 80 ? "#22c55e" : coveragePct >= 50 ? "var(--accent)" : "var(--warning)",
                    transition: "width 0.3s ease"
                  }}
                />
              </div>
              <span style={{ fontWeight: 700, fontSize: "1rem", minWidth: "2.5rem", textAlign: "right", color: "var(--text)" }}>
                {coveragePct}%
              </span>
            </div>
            <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.875rem", color: "var(--text-soft)" }}>
              <span><strong style={{ color: "var(--text)" }}>{assignedCount}</strong> assigned</span>
              <span style={unassignedCount > 0 ? { color: "var(--warning)", fontWeight: 600 } : undefined}>
                <strong>{unassignedCount}</strong> unassigned
              </span>
              <span><strong style={{ color: "var(--text)" }}>{programs.length}</strong> programs</span>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
              {(
                [
                  ["Scheduled", ptByStatus["scheduled"] ?? 0, "var(--bg-muted)", "var(--text-soft)"],
                  ["Active",    ptByStatus["active"]    ?? 0, "var(--brand-soft)", "var(--brand)"],
                  ["Completed", ptByStatus["completed"] ?? 0, "var(--bg-muted)", "var(--text-soft)"],
                  ["Cancelled", ptByStatus["cancelled"] ?? 0, "var(--danger-soft)", "var(--danger)"],
                ] as [string, number, string, string][]
              ).map(([label, count, bg, color]) => (
                <div key={label} style={{ background: bg, borderRadius: 8, padding: "10px 12px" }}>
                  <strong style={{ fontSize: "1.25rem", color: "var(--text)", display: "block" }}>{count}</strong>
                  <span style={{ fontSize: "0.8125rem", color }}>{label}</span>
                </div>
              ))}
            </div>
            {ptActiveMemberCount > 0 && (
              <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-soft)" }}>
                <strong style={{ color: "var(--text)" }}>{ptActiveMemberCount}</strong>{" "}
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
            <ul style={{ listStyle: "none", margin: 0, padding: "4px 0" }}>
              {programRows.map((row) => {
                const barPct = programRows[0]?.count
                  ? Math.round((row.count / programRows[0].count) * 100)
                  : 0;
                return (
                  <li key={row.name} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "8px 16px" }}>
                    <span style={{ flex: "0 0 9rem", fontSize: "0.875rem", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.name}>
                      {row.name}
                    </span>
                    <div style={{ flex: 1, height: 5, borderRadius: 999, background: "var(--bg-muted)", overflow: "hidden" }}>
                      <div style={{ width: `${barPct}%`, height: "100%", borderRadius: 999, background: "var(--brand)" }} />
                    </div>
                    <span style={{ flex: "0 0 2rem", textAlign: "right", fontSize: "0.875rem", fontWeight: 700, color: "var(--text-soft)" }}>
                      {row.count}
                    </span>
                  </li>
                );
              })}
            </ul>
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
            <div className="adm-card__body" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
              {(["A", "B", "C", "D"] as const).map((slot) => {
                const slotData = slots.find((s) => s.slotId === slot);
                const count = slotData?.memberCount ?? 0;
                const pct = totalSlotted ? Math.round((count / totalSlotted) * 100) : 0;
                return (
                  <div key={slot} style={{ background: "var(--bg-subtle)", borderRadius: 8, padding: "0.75rem", textAlign: "center", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text)", marginBottom: 2 }}>{count}</div>
                    <div style={{ fontSize: "0.8125rem", color: "var(--text-soft)", fontWeight: 600 }}>Slot {slot}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-faint)", marginTop: 2 }}>{pct}%</div>
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
