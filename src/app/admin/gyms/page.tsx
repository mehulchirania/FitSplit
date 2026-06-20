import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getGymWorkspaces } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

function planTier(count: number) {
  if (count > 300) return { label: "ENTERPRISE", cls: "adm-plan adm-plan--enterprise" };
  if (count > 100) return { label: "STUDIO", cls: "adm-plan adm-plan--studio" };
  return { label: "STARTER", cls: "adm-plan adm-plan--starter" };
}

function gymInitials(name: string) {
  return name.split(/[\s·\-]+/).filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

const PALETTE = ["var(--brand)", "var(--accent)", "#D97706", "var(--danger)", "#7C3AED", "var(--text-soft)"];

export default async function ManageGymsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireRole(["admin"]);
  const { filter = "all" } = await searchParams;
  const { gyms: allGyms } = await getGymWorkspaces();

  const activeCount   = allGyms.filter(g => g.status === "active").length;
  const trialCount    = allGyms.filter(g => g.status === "paused").length;  // paused = trial-ish
  const archivedCount = allGyms.filter(g => g.status === "inactive").length;

  const gyms = filter === "active"   ? allGyms.filter(g => g.status === "active")
             : filter === "trial"    ? allGyms.filter(g => g.status === "paused")
             : filter === "archived" ? allGyms.filter(g => g.status === "inactive")
             : allGyms;

  const CHIPS = [
    { v: "all",      label: `All ${allGyms.length}` },
    { v: "active",   label: `Active ${activeCount}` },
    { v: "trial",    label: `Trial ${trialCount}` },
    { v: "archived", label: `Archived ${archivedCount}` },
  ];

  return (
    <div className="odp2-scroll">
      {/* Header */}
      <div className="adm-page-head">
        <div>
          <div className="adm-crumb">Admin / Gyms</div>
          <h1 className="adm-title">Gym workspaces</h1>
        </div>
        <div className="adm-head-actions">
          <Link href="/admin/inbox" className="adm-btn adm-btn--ghost">Inbox</Link>
          <Link href="#add-gym" className="adm-btn">+ Add gym</Link>
        </div>
      </div>

      <p className="adm-page-desc">
        Manage gym workspaces — add new ones, archive inactive, edit details, manage staff.
      </p>

      {/* Filter bar */}
      <div className="adm-filter-bar">
        <div className="adm-search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
          </svg>
          <span>Search gyms…</span>
        </div>
        <div className="adm-chips">
          {CHIPS.map(c => (
            <Link
              key={c.v}
              href={`/admin/gyms?filter=${c.v}`}
              className={`adm-chip${filter === c.v ? " adm-chip--on" : ""}`}
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Gyms table */}
      <div className="adm-card">
        {/* Table header */}
        <div className="adm-gym-table-head" style={{ gridTemplateColumns: "30px 1.6fr 1fr 80px 100px 80px" }}>
          <span /><span>GYM</span><span>OWNER</span>
          <span>MEMBERS</span><span>PLAN</span><span>STATUS</span>
        </div>

        {gyms.length === 0 ? (
          <div className="adm-empty">No gyms match this filter.</div>
        ) : (
          gyms.map((gym, i) => {
            const plan = planTier(gym.memberCount);
            const statusCls = gym.status === "active" ? "adm-tag adm-tag--ok"
              : gym.status === "paused" ? "adm-tag adm-tag--trial"
              : "adm-tag adm-tag--neutral";
            return (
              <Link
                key={gym.id}
                href={`/admin/gyms/${gym.id}`}
                className={`adm-gym-table-row${gym.status === "inactive" ? " adm-gym-table-row--dim" : ""}${i < gyms.length - 1 ? " adm-gym-table-row--border" : ""}`}
                style={{ textDecoration: "none", color: "inherit", cursor: "pointer", gridTemplateColumns: "30px 1.6fr 1fr 80px 100px 80px" }}
              >
                {gym.logoUrl ? (
                  <span className="adm-gym-row__avatar" style={{ background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", padding: 2 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={gym.logoUrl} alt={gym.name} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 6 }} />
                  </span>
                ) : (
                  <span className="adm-gym-row__avatar" style={{ background: PALETTE[i % PALETTE.length] }}>
                    {gymInitials(gym.name)}
                  </span>
                )}
                <div className="adm-gym-row__info">
                  <strong>{gym.name}</strong>
                  <small>{gym.location ?? "—"}</small>
                </div>
                <span className="adm-gym-table-row__owner">{gym.ownerName}</span>
                <strong className="adm-gym-row__count">{gym.memberCount}</strong>
                <span className={plan.cls}>{plan.label}</span>
                <span className={statusCls}>{gym.status.toUpperCase()}</span>
              </Link>
            );
          })
        )}
      </div>

      {/* Add gym section (preserved) */}
      <div id="add-gym" style={{ marginTop: 32 }}>
        {/* AddGymForm kept accessible via anchor */}
        <div className="adm-section-head">
          <h2>Add a gym workspace</h2>
        </div>
        {/* Inline link to trigger — real form is in AddGymForm */}
        <p className="adm-page-desc" style={{ marginTop: 0 }}>
          <Link href="/admin" className="adm-link">Go to admin overview</Link> to use the Add Gym Staff form, or contact <code>admin</code> to provision a new workspace.
        </p>
      </div>
    </div>
  );
}
