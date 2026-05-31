import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getGymWorkspaces } from "@/lib/firebase/read-models";
import { getAdminNotifications } from "@/lib/firebase/read-models/notifications";

export const dynamic = "force-dynamic";

// Relative time helper
function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

// Gym initials from name
function gymInitials(name: string) {
  return name.split(/[\s·\-]+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

// Status badge
function statusBadge(status: string) {
  const cls = status === "active" ? "adm-tag adm-tag--ok"
    : status === "paused" || status === "inactive" ? "adm-tag adm-tag--neutral"
    : "adm-tag adm-tag--neutral";
  return <span className={cls}>{status.toUpperCase()}</span>;
}

// Notification type label
function notifLabel(type: string): string {
  if (type === "member_created") return "New member";
  if (type.startsWith("membership")) return "Membership";
  if (type.startsWith("pt_")) return "PT session";
  if (type === "program_assigned") return "Program";
  if (type === "contact_message") return "Contact";
  return type.replace(/_/g, " ");
}

export default async function AdminPage() {
  await requireRole(["admin"]);

  const [{ gyms }, { notifications }] = await Promise.all([
    getGymWorkspaces(),
    getAdminNotifications(),
  ]);

  const totalMembers = gyms.reduce((s, g) => s + g.memberCount, 0);
  const activeGyms = gyms.filter((g) => g.status === "active").length;

  // Sort gyms by member count for the top list
  const topGyms = [...gyms].sort((a, b) => b.memberCount - a.memberCount).slice(0, 6);
  const maxMembers = topGyms[0]?.memberCount ?? 1;

  // Avatar palette — cycles for coloring gym initials
  const PALETTE = ["var(--brand)", "var(--accent)", "#D97706", "var(--danger)", "#7C3AED", "var(--text-soft)"];

  return (
    <div className="odp2-scroll">
      {/* ── Header ── */}
      <div className="adm-page-head">
        <div>
          <div className="adm-crumb">Admin / Overview</div>
          <h1 className="adm-title">Platform overview</h1>
        </div>
        <div className="adm-head-actions">
          <Link href="/admin/inbox" className="adm-btn adm-btn--ghost">Inbox</Link>
          <Link href="/admin/gyms" className="adm-btn">+ Add gym</Link>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="adm-kpis">
        <div className="adm-kpi adm-kpi--brand">
          <small>TOTAL GYMS</small>
          <strong>{gyms.length}</strong>
          <em>{activeGyms} active · {gyms.length - activeGyms} other</em>
        </div>
        <div className="adm-kpi adm-kpi--accent">
          <small>TOTAL MEMBERS</small>
          <strong>{totalMembers.toLocaleString("en-IN")}</strong>
          <em>across all gyms</em>
        </div>
        <div className="adm-kpi adm-kpi--warn">
          <small>ACTIVE GYMS</small>
          <strong>{activeGyms}</strong>
          <em>of {gyms.length} workspaces</em>
        </div>
        <div className="adm-kpi adm-kpi--danger">
          <small>INBOX</small>
          <strong>{notifications.filter((n) => !n.readAt).length || 0}</strong>
          <em>unread notifications</em>
        </div>
      </div>

      {/* ── Two-column grid ── */}
      <div className="adm-grid-2">
        {/* Top gyms */}
        <div className="adm-card">
          <div className="adm-card__head">
            <h3>Top gyms by members</h3>
            <Link href="/admin/gyms" className="adm-card__link">All gyms →</Link>
          </div>
          <div className="adm-card__body adm-card__body--flush">
            {topGyms.length === 0 ? (
              <div className="adm-empty">No gyms yet — <Link href="/admin/gyms">add the first gym</Link></div>
            ) : (
              topGyms.map((gym, i) => (
                <Link
                  key={gym.id}
                  href={`/admin/gyms/${gym.id}`}
                  className={`adm-gym-row${i < topGyms.length - 1 ? " adm-gym-row--border" : ""}`}
                >
                  {/* Avatar / logo */}
                  {gym.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <span className="adm-gym-row__avatar" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", padding: 2 }}>
                      <img src={gym.logoUrl} alt={gym.name} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 5 }} />
                    </span>
                  ) : (
                    <span className="adm-gym-row__avatar" style={{ background: PALETTE[i % PALETTE.length] }}>
                      {gymInitials(gym.name)}
                    </span>
                  )}
                  {/* Name + location */}
                  <div className="adm-gym-row__info">
                    <strong>{gym.name}</strong>
                    <small>{gym.location ?? "—"} · {gym.ownerName}</small>
                  </div>
                  {/* Bar */}
                  <div className="adm-gym-row__bar">
                    <div
                      className="adm-gym-row__bar-fill"
                      style={{ width: `${Math.round((gym.memberCount / maxMembers) * 100)}%` }}
                    />
                  </div>
                  {/* Count */}
                  <strong className="adm-gym-row__count">{gym.memberCount}</strong>
                  {/* Status */}
                  {statusBadge(gym.status)}
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="adm-card">
          <div className="adm-card__head">
            <h3>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 5 }}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              Recent activity
            </h3>
          </div>
          <div className="adm-card__body">
            {notifications.length === 0 ? (
              <div className="adm-empty">All quiet — no recent activity.</div>
            ) : (
              notifications.slice(0, 8).map((n, i) => (
                <div
                  key={n.id}
                  className={`adm-activity-row${i < Math.min(7, notifications.length - 1) ? " adm-activity-row--border" : ""}`}
                >
                  <div className="adm-activity-row__label">{notifLabel(n.type)}</div>
                  <div className="adm-activity-row__body">{n.body}</div>
                  <div className="adm-activity-row__time">{relTime(n.createdAt)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
