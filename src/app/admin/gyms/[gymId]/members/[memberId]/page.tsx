import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getMemberDetail, getGymDetail } from "@/lib/firebase/read-models";
import { MemberAccessActions } from "@/components/member-access-actions";
import { MemberDeleteAction } from "@/components/member-delete-action";
import { AdminMemberProfileForm } from "@/components/admin-member-profile-form";

export const dynamic = "force-dynamic";

function fmt(iso?: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function fmtShort(iso?: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function avatarColor(id: string) {
  let n = 0;
  for (const c of id) n = ((n * 31) + c.charCodeAt(0)) & 0xfffff;
  const COLORS = ["var(--brand)", "var(--accent)", "#7C3AED", "#D97706", "var(--danger)", "#0891B2"];
  return COLORS[n % COLORS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : name.slice(0, 2)
  ).toUpperCase();
}

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ gymId: string; memberId: string }>;
}) {
  await requireRole(["admin"]);
  const { gymId, memberId } = await params;

  const [{ member }, { gym }] = await Promise.all([
    getMemberDetail(memberId),
    getGymDetail(gymId),
  ]);

  if (!member || !gym) notFound();

  const msStatus = member.membershipStatus ?? "none";
  const msTagCls =
    msStatus === "active" ? "adm-tag adm-tag--ok"
    : msStatus === "expiring_soon" ? "adm-tag adm-tag--warn"
    : msStatus === "expired" ? "adm-tag adm-tag--danger"
    : "adm-tag adm-tag--neutral";

  return (
    <div className="odp2-scroll">

      {/* ── Header ── */}
      <div className="adm-page-head">
        <div>
          <div className="adm-crumb">
            Admin /{" "}
            <Link href="/admin/gyms" style={{ color: "inherit" }}>Gyms</Link>
            {" / "}
            <Link href={`/admin/gyms/${gymId}`} style={{ color: "inherit" }}>{gym.name}</Link>
            {" / "}
            {member.fullName}
          </div>
          <h1 className="adm-title">{member.fullName}</h1>
        </div>
        <div className="adm-head-actions">
          <Link href={`/admin/gyms/${gymId}`} className="adm-btn adm-btn--ghost">← Back to gym</Link>
        </div>
      </div>

      {/* ── Member hero ── */}
      <div className="adm-card adm-gym-hero" style={{ marginBottom: 0 }}>
        <div
          className="adm-gym-hero__avatar"
          style={{ background: avatarColor(member.id), color: "#fff", fontSize: 18, fontWeight: 800 }}
        >
          {initials(member.fullName)}
        </div>
        <div className="adm-gym-hero__info">
          <h2 className="adm-gym-hero__name">{member.fullName}</h2>
          <p className="adm-gym-hero__meta">
            {[member.email, member.phone, member.username && `@${member.username}`]
              .filter(Boolean)
              .join(" · ") || "No contact info"}
          </p>
          <div className="adm-gym-hero__tags">
            <span className={member.isActive ? "adm-tag adm-tag--ok" : "adm-tag adm-tag--neutral"}>
              {member.isActive ? "ACTIVE" : "INACTIVE"}
            </span>
            {msStatus !== "none" && (
              <span className={msTagCls}>
                {msStatus.replace("_", " ").toUpperCase()}
              </span>
            )}
            {member.joinedAt && (
              <span className="adm-tag adm-tag--neutral">
                JOINED {fmtShort(member.joinedAt)}
              </span>
            )}
          </div>
        </div>
        <div className="adm-gym-hero__actions" />
      </div>

      {/* ── KPI row ── */}
      <div className="adm-kpis" style={{ gridTemplateColumns: "repeat(4, 1fr)", margin: "16px 0" }}>
        <div className={`adm-kpi ${member.isActive ? "adm-kpi--brand" : ""}`}>
          <small>ACCOUNT</small>
          <strong style={{ fontSize: 18, fontWeight: 800 }}>
            {member.isActive ? "Active" : "Suspended"}
          </strong>
          <em>member access</em>
        </div>
        <div className="adm-kpi">
          <small>PACKAGE</small>
          <strong style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
            {member.currentPackageName || "—"}
          </strong>
          <em>current plan</em>
        </div>
        <div className={`adm-kpi ${msStatus === "expired" ? "adm-kpi--danger" : msStatus === "expiring_soon" ? "adm-kpi--warn" : ""}`}>
          <small>EXPIRES</small>
          <strong style={{ fontSize: 15, fontWeight: 700 }}>
            {member.membershipEndDate ? fmtShort(member.membershipEndDate) : "—"}
          </strong>
          <em>membership end</em>
        </div>
        <div className="adm-kpi">
          <small>GOAL</small>
          <strong style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>
            {member.goal || "—"}
          </strong>
          <em>training focus</em>
        </div>
      </div>

      {/* ── Two-column workspace ── */}
      <div className="adm-grid-2" style={{ alignItems: "start" }}>

        {/* Edit profile */}
        <div className="adm-card">
          <div className="adm-card__head">
            <h3>Edit profile</h3>
          </div>
          <div className="adm-card__body">
            <AdminMemberProfileForm member={member} />
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Member info (read-only facts) */}
          <div className="adm-card">
            <div className="adm-card__head">
              <h3>Member info</h3>
            </div>
            <div className="adm-card__body" style={{ padding: 0 }}>
              {[
                ["Member ID", member.id],
                ["Gym", gym.name],
                ["Joined", fmt(member.joinedAt)],
                ["Package", member.currentPackageName || "—"],
                ["Expires", fmt(member.membershipEndDate)],
              ].map(([label, value]) => (
                <div key={label} className="adm-billing-row">
                  <span>{label}</span>
                  <strong style={{ maxWidth: 180, textAlign: "right", wordBreak: "break-all" }}>{value}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Account access */}
          <div className="adm-card">
            <div className="adm-card__head">
              <h3>Account access</h3>
            </div>
            <div className="adm-card__body">
              <MemberAccessActions
                isActive={member.isActive}
                memberId={member.id}
                username={member.username}
              />
            </div>
          </div>

          {/* Danger zone */}
          <details className="adm-details-panel adm-details-panel--danger">
            <summary className="adm-details-panel__summary adm-details-panel__summary--danger">
              Danger zone
            </summary>
            <div className="adm-details-panel__body">
              <p style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.6 }}>
                Permanently deletes this member and <strong>all associated data</strong> — lift logs,
                sessions, notifications, attendance. This cannot be undone.
              </p>
              <MemberDeleteAction memberId={member.id} />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
