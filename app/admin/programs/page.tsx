import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getWorkoutPrograms, getGymWorkspaces, getActiveProgramAssignments } from "@/lib/firebase/read-models";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";

export const dynamic = "force-dynamic";

const PROGRAM_COLORS = [
  "linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 55%, transparent))",
  "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 55%, transparent))",
  "linear-gradient(135deg, #D97706, color-mix(in srgb, #D97706 55%, transparent))",
  "linear-gradient(135deg, var(--danger), color-mix(in srgb, var(--danger) 55%, transparent))",
  "linear-gradient(135deg, #7C3AED, color-mix(in srgb, #7C3AED 55%, transparent))",
  "linear-gradient(135deg, #0891B2, color-mix(in srgb, #0891B2 55%, transparent))",
  "linear-gradient(135deg, #B45309, color-mix(in srgb, #B45309 55%, transparent))",
  "linear-gradient(135deg, #BE185D, color-mix(in srgb, #BE185D 55%, transparent))",
];

export default async function AdminProgramsPage() {
  await requireRole(["admin"]);

  const [{ gyms }, { programs }, { assignments }] = await Promise.all([
    getGymWorkspaces(),
    getWorkoutPrograms(PRIMARY_GYM_ID),
    getActiveProgramAssignments(PRIMARY_GYM_ID),
  ]);

  const presetPrograms = programs.filter(p => p.source === "predefined" || p.source !== "gym");
  const mostUsed = programs.length > 0
    ? programs.reduce((best, p) =>
        (assignments.filter(a => a.programId === p.id).length > assignments.filter(a => a.programId === best.id).length) ? p : best
      , programs[0])
    : null;

  const gymUsingPreset = gyms.filter(g => g.status === "active").length;

  return (
    <div className="odp2-scroll">
      {/* Header */}
      <div className="adm-page-head">
        <div>
          <div className="adm-crumb">Admin / Programs</div>
          <h1 className="adm-title">Preset program catalog</h1>
        </div>
        <div className="adm-head-actions">
          <Link href="/admin/inbox" className="adm-btn adm-btn--ghost">Inbox</Link>
          <Link href={`/owner/programs`} className="adm-btn">+ New preset</Link>
        </div>
      </div>

      <p className="adm-page-desc">
        Master library of presets available to all gyms. Edit to update across the platform.
      </p>

      {/* KPI row */}
      <div className="adm-kpis" style={{ marginBottom: 20 }}>
        <div className="adm-kpi adm-kpi--brand">
          <small>PRESETS</small>
          <strong>{programs.length}</strong>
        </div>
        <div className="adm-kpi">
          <small>GYMS USING</small>
          <strong>{gymUsingPreset}/{gyms.length}</strong>
        </div>
        <div className="adm-kpi adm-kpi--accent">
          <small>MOST POPULAR</small>
          <strong>{mostUsed?.title ?? "—"}</strong>
        </div>
        <div className="adm-kpi adm-kpi--warn">
          <small>NEW REQUESTS</small>
          <strong>—</strong>
        </div>
      </div>

      {/* Program card grid */}
      {programs.length === 0 ? (
        <div className="adm-card">
          <div className="adm-empty">
            No programs yet.{" "}
            <Link href="/owner/programs" className="adm-link">Create one from the owner dashboard.</Link>
          </div>
        </div>
      ) : (
        <div className="adm-program-grid">
          {programs.map((p, i) => {
            const gymCount = assignments.filter(a => a.programId === p.id).length;
            return (
              <Link key={p.id} href={`/owner/programs/${p.id}`} className="adm-program-card">
                <div
                  className="adm-program-card__header"
                  style={{ background: PROGRAM_COLORS[i % PROGRAM_COLORS.length] }}
                >
                  <span className="adm-program-card__title">{p.title}</span>
                </div>
                <div className="adm-program-card__body">
                  <span className="adm-program-card__meta">
                    {p.difficulty ?? "All levels"} · {p.days?.length ?? 0} day
                  </span>
                  <strong className="adm-program-card__count">{gymCount} gyms</strong>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
