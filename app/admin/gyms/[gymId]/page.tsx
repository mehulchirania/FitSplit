import Link from "next/link";
import { notFound } from "next/navigation";
import { AddStaffForm } from "@/components/add-staff-form";
import { GymAccessStatusAction } from "@/components/gym-access-status-action";
import { GymArchiveAction } from "@/components/gym-archive-action";
import { StaffAccessActions } from "@/components/staff-access-actions";
import { requireRole } from "@/lib/auth";
import { getGymDetail, getMembers, getOwnersForGym } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

function planTier(count: number) {
  if (count > 300) return { label: "ENTERPRISE", cls: "adm-tag adm-tag--enterprise" };
  if (count > 100) return { label: "STUDIO", cls: "adm-tag adm-tag--studio" };
  return { label: "STARTER", cls: "adm-tag adm-tag--starter" };
}

function gymInitials(name: string) {
  return name.split(/[\s·\-]+/).filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function staffInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ["var(--brand)", "var(--accent)", "#7C3AED", "#D97706", "var(--danger)"];

export default async function GymDetailPage({
  params,
}: {
  params: Promise<{ gymId: string }>;
}) {
  await requireRole(["admin"]);

  const { gymId } = await params;
  const [{ gym }, { owners: staff }, { members }] = await Promise.all([
    getGymDetail(gymId),
    getOwnersForGym(gymId),
    getMembers(gymId),
  ]);

  if (!gym) notFound();

  const isActive = gym.status === "active";
  const plan = planTier(gym.memberCount);
  const initials = gymInitials(gym.name);

  return (
    <div className="odp2-scroll">
      {/* Header */}
      <div className="adm-page-head">
        <div>
          <div className="adm-crumb">Admin / Gyms / {gym.name}</div>
          <h1 className="adm-title">{gym.name}{gym.location ? ` · ${gym.location.split(",")[0]}` : ""}</h1>
        </div>
        <div className="adm-head-actions">
          <Link href="/admin/inbox" className="adm-btn adm-btn--ghost">Inbox</Link>
        </div>
      </div>

      {/* Gym hero card */}
      <div className="adm-card adm-gym-hero">
        <div className="adm-gym-hero__avatar" style={{ background: "linear-gradient(135deg, #D97706, color-mix(in srgb, #D97706 60%, transparent))" }}>
          {initials}
        </div>
        <div className="adm-gym-hero__info">
          <h2 className="adm-gym-hero__name">{gym.name}</h2>
          <p className="adm-gym-hero__meta">
            {gym.location ?? "—"} · owned by {gym.ownerName}
          </p>
          <div className="adm-gym-hero__tags">
            <span className="adm-tag adm-tag--ok">{gym.status.toUpperCase()}</span>
            <span className={plan.cls}>{plan.label}</span>
            <span className="adm-tag adm-tag--neutral">{gym.memberCount} MEMBERS</span>
          </div>
        </div>
        <div className="adm-gym-hero__actions">
          <GymAccessStatusAction gymId={gym.id} isEnabled={isActive} />
          <Link href={`/admin/gyms/${gym.id}/edit`} className="adm-btn">Edit details</Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="adm-kpis adm-kpis--4" style={{ margin: "16px 0" }}>
        <div className="adm-kpi adm-kpi--brand">
          <small>MEMBERS</small>
          <strong>{gym.memberCount}</strong>
          <em>{members.filter(m => m.isActive).length} active</em>
        </div>
        <div className="adm-kpi">
          <small>TRAINERS</small>
          <strong>{staff.filter(s => s.staffType === "trainer").length}</strong>
          <em>{staff.length} total staff</em>
        </div>
        <div className="adm-kpi adm-kpi--warn">
          <small>MRR</small>
          <strong>—</strong>
          <em>billing not configured</em>
        </div>
        <div className="adm-kpi adm-kpi--danger">
          <small>SUPPORT TICKETS</small>
          <strong>0</strong>
          <em>open</em>
        </div>
      </div>

      {/* Two-column: Staff + Billing */}
      <div className="adm-grid-2" style={{ marginBottom: 20 }}>
        {/* Staff card */}
        <div className="adm-card">
          <div className="adm-card__head">
            <h3>Staff</h3>
            <span className="adm-card__link">{staff.length} member{staff.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="adm-card__body adm-card__body--flush">
            {staff.length === 0 ? (
              <div className="adm-empty">No staff assigned to this gym yet.</div>
            ) : (
              staff.map((s, i) => (
                <div
                  key={s.id}
                  className={`adm-staff-row${i < staff.length - 1 ? " adm-staff-row--border" : ""}`}
                >
                  <span
                    className="adm-staff-row__avatar"
                    style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  >
                    {staffInitials(s.fullName)}
                  </span>
                  <div className="adm-staff-row__info">
                    <strong>
                      {s.fullName}
                      {s.username && <span style={{ color: "var(--text-faint)", fontWeight: 500 }}> (@{s.username})</span>}
                    </strong>
                    <small>
                      {s.staffType ? (s.staffType.charAt(0).toUpperCase() + s.staffType.slice(1)) : "Owner"}
                      {s.phone && ` · ${s.phone}`}
                    </small>
                  </div>
                  <StaffAccessActions
                    fullName={s.fullName}
                    gymId={gym.id}
                    userId={s.id}
                    phone={s.phone ?? ""}
                    staffType={(s.staffType as "owner" | "trainer" | "staff") ?? "owner"}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Billing card */}
        <div className="adm-card">
          <div className="adm-card__head">
            <h3>Billing</h3>
          </div>
          <div className="adm-card__body">
            <div className="adm-billing-row">
              <span>Plan</span>
              <strong>{plan.label.charAt(0) + plan.label.slice(1).toLowerCase()} (standard)</strong>
            </div>
            <div className="adm-billing-row">
              <span>Billing email</span>
              <strong>{gym.email ?? "—"}</strong>
            </div>
            <div className="adm-billing-row">
              <span>Next renewal</span>
              <strong>—</strong>
            </div>
            <div className="adm-billing-row">
              <span>Payment method</span>
              <strong>—</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Members card */}
      <div className="adm-card" style={{ marginBottom: 20 }}>
        <div className="adm-card__head">
          <h3>Members</h3>
          <span className="adm-card__link">{members.length} member{members.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="adm-card__body adm-card__body--flush">
          {members.length === 0 ? (
            <div className="adm-empty">No members joined this gym yet.</div>
          ) : (
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {members.map((m, i) => (
                <Link
                  key={m.id}
                  href={`/owner/members/${m.id}`}
                  className={`adm-staff-row${i < members.length - 1 ? " adm-staff-row--border" : ""}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <span
                    className="adm-staff-row__avatar"
                    style={{ background: "var(--brand)", color: "var(--primary-foreground)" }}
                  >
                    {staffInitials(m.fullName)}
                  </span>
                  <div className="adm-staff-row__info">
                    <strong>
                      {m.fullName}
                      {m.username && <span style={{ color: "var(--text-faint)", fontWeight: 500 }}> (@{m.username})</span>}
                    </strong>
                    <small>{m.phone || m.email || "No contact info"}</small>
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={`adm-tag ${m.isActive ? "adm-tag--ok" : "adm-tag--neutral"}`}>
                      {m.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit & Staff actions */}
      <div className="adm-grid-2" style={{ marginBottom: 16 }}>
        <Link
          href={`/admin/gyms/${gym.id}/edit`}
          className="adm-card"
          style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}
        >
          <div>
            <strong style={{ fontSize: 13, fontWeight: 700 }}>Edit gym details &amp; logo</strong>
            <p style={{ fontSize: 12, color: "var(--text-soft)", margin: "3px 0 0" }}>
              Name, location, contact info, social links, logo
            </p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="9 18 15 12 9 6"/></svg>
        </Link>

        <details className="adm-details-panel" style={{ margin: 0 }}>
          <summary className="adm-details-panel__summary" style={{ borderRadius: 14 }}>Add staff member</summary>
          <div className="adm-details-panel__body">
            <AddStaffForm gymId={gym.id} />
          </div>
        </details>
      </div>

      {/* Danger zone */}
      {gym.id !== "shg" && (
        <details className="adm-details-panel adm-details-panel--danger">
          <summary className="adm-details-panel__summary adm-details-panel__summary--danger">Danger zone</summary>
          <div className="adm-details-panel__body">
            <p style={{ fontSize: 13, color: "var(--text-soft)", marginBottom: 12, lineHeight: 1.6 }}>
              Permanently deletes this gym and <strong>all associated members and staff</strong>. This cannot be undone.
            </p>
            <GymArchiveAction
              destructive
              gymId={gym.id}
              gymName={gym.name}
              label="Delete gym and all members"
            />
          </div>
        </details>
      )}
    </div>
  );
}
