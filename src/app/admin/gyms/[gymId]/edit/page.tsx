import Link from "next/link";
import { notFound } from "next/navigation";
import { GymDetailsForm } from "@/components/gym-details-form";
import { GymLogoManager } from "@/components/gym-logo-manager";
import { GymArchiveAction } from "@/components/gym-archive-action";
import { GymAccessStatusAction } from "@/components/gym-access-status-action";
import { requireRole } from "@/lib/auth";
import { updateGymLogo } from "@/lib/firebase/actions";
import { getGymDetail } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

function planTier(count: number) {
  if (count > 300) return { label: "Enterprise", cls: "adm-tag adm-tag--enterprise" };
  if (count > 100) return { label: "Studio", cls: "adm-tag adm-tag--studio" };
  return { label: "Starter", cls: "adm-tag adm-tag--starter" };
}

export default async function EditGymPage({
  params,
}: {
  params: Promise<{ gymId: string }>;
}) {
  await requireRole(["admin"]);

  const { gymId } = await params;
  const { gym } = await getGymDetail(gymId);

  if (!gym) notFound();

  const plan = planTier(gym.memberCount);

  return (
    <div className="odp2-scroll">
      {/* ── Header ── */}
      <div className="adm-page-head">
        <div>
          <div className="adm-crumb">
            <Link href="/admin/gyms" style={{ color: "inherit" }}>Gyms</Link>
            {" / "}
            <Link href={`/admin/gyms/${gym.id}`} style={{ color: "inherit" }}>{gym.name}</Link>
            {" / Edit"}
          </div>
          <h1 className="adm-title">Edit gym workspace</h1>
        </div>
        <div className="adm-head-actions">
          <Link href={`/admin/gyms/${gym.id}`} className="adm-btn adm-btn--ghost">
            Cancel
          </Link>
        </div>
      </div>

      {/* ── Status strip ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          marginBottom: 20,
          fontSize: 13,
        }}
      >
        <span style={{ fontWeight: 700 }}>{gym.name}</span>
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase" as const,
            background: gym.status === "active" ? "var(--brand-soft)" : "var(--bg-subtle)",
            color: gym.status === "active" ? "var(--brand)" : "var(--text-soft)",
          }}
        >
          {gym.status}
        </span>
        <span className={plan.cls} style={{ fontSize: 10 }}>{plan.label}</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-soft)" }}>
          {gym.memberCount} member{gym.memberCount !== 1 ? "s" : ""}
        </span>
        <GymAccessStatusAction gymId={gym.id} isEnabled={gym.status === "active"} />
      </div>

      {/* ── Two-column layout: logo left, form right ── */}
      <div className="adm-grid-2" style={{ alignItems: "start", marginBottom: 20 }}>
        {/* Logo card */}
        <div className="adm-card">
          <div className="adm-card__head">
            <h3>Workspace logo</h3>
          </div>
          <div className="adm-card__body">
            <p style={{ fontSize: 12, color: "var(--text-soft)", marginBottom: 16, lineHeight: 1.5 }}>
              Square image, min 256×256. PNG or SVG recommended. Appears next to the FitSplit mark on owner and member screens.
            </p>
            <GymLogoManager
              action={updateGymLogo}
              currentLogoUrl={gym.logoUrl}
              gymId={gym.id}
              gymName={gym.name}
            />
          </div>
        </div>

        {/* Quick info card */}
        <div className="adm-card">
          <div className="adm-card__head">
            <h3>Workspace info</h3>
          </div>
          <div className="adm-card__body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Gym ID", value: gym.id },
              { label: "Owner", value: gym.ownerName ?? "—" },
              { label: "Location", value: gym.location ?? "—" },
              { label: "Members", value: String(gym.memberCount) },
              { label: "Plan tier", value: plan.label },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12.5,
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ color: "var(--text-soft)", fontWeight: 500 }}>{label}</span>
                <strong style={{ fontWeight: 700 }}>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main edit form (full width) ── */}
      <div className="adm-card" style={{ marginBottom: 20 }}>
        <div className="adm-card__head">
          <h3>Gym details &amp; settings</h3>
          <span className="adm-card__link">All fields optional except gym name</span>
        </div>
        <div className="adm-card__body">
          <GymDetailsForm gym={gym} />
        </div>
      </div>

      {/* ── Danger zone ── */}
      {gym.id !== "shg" && (
        <div
          className="adm-card"
          style={{
            borderColor: "color-mix(in srgb, var(--danger) 35%, transparent)",
            marginBottom: 20,
          }}
        >
          <div className="adm-card__head">
            <h3 style={{ color: "var(--danger)" }}>Danger zone</h3>
          </div>
          <div className="adm-card__body">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div>
                <strong style={{ fontSize: 13 }}>Archive this workspace</strong>
                <p style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 4, lineHeight: 1.5 }}>
                  Members lose access immediately. Data is retained for 90 days and can be restored on request.
                </p>
              </div>
              <GymArchiveAction
                gymId={gym.id}
                gymName={gym.name}
                label="Archive workspace"
              />
            </div>
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid color-mix(in srgb, var(--danger) 20%, transparent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div>
                <strong style={{ fontSize: 13 }}>Permanently delete</strong>
                <p style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 4, lineHeight: 1.5 }}>
                  Permanently deletes this gym and <strong>all associated members and staff</strong>. This cannot be undone.
                </p>
              </div>
              <GymArchiveAction
                destructive
                gymId={gym.id}
                gymName={gym.name}
                label="Delete gym and all members"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Footer actions ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          paddingBottom: 32,
        }}
      >
        <Link href={`/admin/gyms/${gym.id}`} className="adm-btn adm-btn--ghost">
          Back to gym detail
        </Link>
      </div>
    </div>
  );
}
