/* eslint-disable @typescript-eslint/no-unused-vars */
import { Breadcrumb } from "@/components/breadcrumb";
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

  return (
    <main className="page">
      <header style={{ marginBottom: "1.5rem" }}>
        <Breadcrumb
          crumbs={[
            { label: "Owner", href: "/owner" },
            { label: "Reports" }
          ]}
        />
        <h1 style={{ marginTop: "0.5rem" }}>{gym?.name ?? "Gym"} — Reports</h1>
        <p style={{ color: "var(--color-text-secondary, #a0a0a0)", marginTop: "0.25rem" }}>
          As of {now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        </p>
      </header>

      {/* ── Top-line stats ──────────────────────────────────────── */}
      <section aria-label="Top-line stats" className="odp-stats" style={{ marginBottom: "1.5rem" }}>
        <div className="odp-stat">
          <strong>{members.length}</strong>
          <span>Total members</span>
        </div>
        <div className="odp-stat-sep" />
        <div className="odp-stat">
          <strong>{activeMembers.length}</strong>
          <span>Active</span>
        </div>
        <div className="odp-stat-sep" />
        <div className="odp-stat">
          <strong style={inactiveMembers.length > 0 ? { color: "var(--color-warning, #f59e0b)" } : undefined}>
            {inactiveMembers.length}
          </strong>
          <span>Suspended</span>
        </div>
        <div className="odp-stat-sep" />
        <div className="odp-stat">
          <strong style={{ color: "var(--color-success, #22c55e)" }}>{newThisMonth}</strong>
          <span>New this month</span>
        </div>
        <div className="odp-stat-sep" />
        <div className="odp-stat">
          <strong>{newLastMonth}</strong>
          <span>New last month</span>
        </div>
        <div className="odp-stat-sep" />
        <div className="odp-stat">
          <strong>{activeSessions.length}</strong>
          <span>Live now</span>
        </div>
      </section>

      {/* ── Attendance Trend ────────────────────────────────────── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <AttendanceTrendChart data={sessionCounts} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 22rem), 1fr))",
          gap: "1rem"
        }}
      >
        {/* ── Workout coverage ──────────────────────────────────── */}
        <section className="list-panel">
          <div className="panel-title">
            <h2>Workout Coverage</h2>
          </div>
          <div style={{ padding: "0.75rem 1rem 0.5rem" }}>
            {/* Progress bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "0.75rem"
              }}
            >
              <div
                aria-label={`${coveragePct}% workout coverage`}
                role="progressbar"
                aria-valuenow={coveragePct}
                aria-valuemin={0}
                aria-valuemax={100}
                style={{
                  flex: 1,
                  height: "0.625rem",
                  borderRadius: "9999px",
                  background: "var(--color-surface-raised, #2a2a2a)",
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    width: `${coveragePct}%`,
                    height: "100%",
                    borderRadius: "9999px",
                    background:
                      coveragePct >= 80
                        ? "var(--color-success, #22c55e)"
                        : coveragePct >= 50
                        ? "var(--color-accent, #6d28d9)"
                        : "var(--color-warning, #f59e0b)",
                    transition: "width 0.3s ease"
                  }}
                />
              </div>
              <span style={{ fontWeight: 700, fontSize: "1.0625rem", minWidth: "2.5rem", textAlign: "right" }}>
                {coveragePct}%
              </span>
            </div>

            <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.875rem", color: "var(--color-text-secondary, #a0a0a0)" }}>
              <span>
                <strong style={{ color: "var(--color-text, #f0f0f0)" }}>{assignedCount}</strong> assigned
              </span>
              <span style={unassignedCount > 0 ? { color: "var(--color-warning, #f59e0b)" } : undefined}>
                <strong>{unassignedCount}</strong> unassigned
              </span>
              <span>
                <strong>{programs.length}</strong> programs
              </span>
            </div>
          </div>
        </section>

        {/* ── PT Plans ──────────────────────────────────────────── */}
        <section className="list-panel">
          <div className="panel-title">
            <h2>PT Plans</h2>
            <span className="status-pill status-neutral">{ptPlans.length} total</span>
          </div>
          <div style={{ padding: "0.75rem 1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {(
                [
                  ["Scheduled", ptByStatus["scheduled"] ?? 0, "status-neutral"],
                  ["Active", ptByStatus["active"] ?? 0, "status-success"],
                  ["Completed", ptByStatus["completed"] ?? 0, "status-neutral"],
                  ["Cancelled", ptByStatus["cancelled"] ?? 0, "status-warning"]
                ] as [string, number, string][]
              ).map(([label, count, pill]) => (
                <div
                  key={label}
                  style={{
                    background: "var(--color-surface-raised, #2a2a2a)",
                    borderRadius: "0.5rem",
                    padding: "0.625rem 0.75rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.125rem"
                  }}
                >
                  <strong style={{ fontSize: "1.25rem" }}>{count}</strong>
                  <span
                    style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary, #a0a0a0)" }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
            {ptActiveMemberCount > 0 && (
              <p
                style={{
                  marginTop: "0.75rem",
                  fontSize: "0.875rem",
                  color: "var(--color-text-secondary, #a0a0a0)"
                }}
              >
                <strong style={{ color: "var(--color-text, #f0f0f0)" }}>{ptActiveMemberCount}</strong>{" "}
                member{ptActiveMemberCount !== 1 ? "s" : ""} currently on a PT plan
              </p>
            )}
          </div>
        </section>

        {/* ── Program popularity ────────────────────────────────── */}
        <section className="list-panel">
          <div className="panel-title">
            <h2>Programs by Assignments</h2>
          </div>
          {programRows.length === 0 ? (
            <p style={{ padding: "1rem", color: "var(--color-text-secondary, #a0a0a0)", fontSize: "0.875rem" }}>
              No programs yet.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: "0.25rem 0" }}>
              {programRows.map((row) => {
                const barPct = programRows[0]?.count
                  ? Math.round((row.count / programRows[0].count) * 100)
                  : 0;
                return (
                  <li
                    key={row.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.5rem 1rem"
                    }}
                  >
                    <span
                      style={{
                        flex: "0 0 10rem",
                        fontSize: "0.875rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                      title={row.name}
                    >
                      {row.name}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: "0.375rem",
                        borderRadius: "9999px",
                        background: "var(--color-surface-raised, #2a2a2a)",
                        overflow: "hidden"
                      }}
                    >
                      <div
                        style={{
                          width: `${barPct}%`,
                          height: "100%",
                          borderRadius: "9999px",
                          background: "var(--color-accent, #6d28d9)"
                        }}
                      />
                    </div>
                    <span
                      style={{
                        flex: "0 0 2rem",
                        textAlign: "right",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "var(--color-text-secondary, #a0a0a0)"
                      }}
                    >
                      {row.count}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Slot distribution ─────────────────────────────────── */}
        <section className="list-panel">
          <div className="panel-title">
            <h2>Slot Distribution</h2>
            <span className="status-pill status-neutral">{totalSlotted} slotted</span>
          </div>
          {totalSlotted === 0 ? (
            <p
              style={{
                padding: "1rem",
                color: "var(--color-text-secondary, #a0a0a0)",
                fontSize: "0.875rem"
              }}
            >
              No slot assignments yet.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "0.5rem",
                padding: "0.75rem 1rem"
              }}
            >
              {(["A", "B", "C", "D"] as const).map((slot) => {
                const slotData = slots.find((s) => s.slotId === slot);
                const count = slotData?.memberCount ?? 0;
                const pct = totalSlotted ? Math.round((count / totalSlotted) * 100) : 0;
                return (
                  <div
                    key={slot}
                    style={{
                      background: "var(--color-surface-raised, #2a2a2a)",
                      borderRadius: "0.5rem",
                      padding: "0.75rem",
                      textAlign: "center"
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        marginBottom: "0.125rem"
                      }}
                    >
                      {count}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8125rem",
                        color: "var(--color-text-secondary, #a0a0a0)"
                      }}
                    >
                      Slot {slot}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--color-text-tertiary, #666)",
                        marginTop: "0.125rem"
                      }}
                    >
                      {pct}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
