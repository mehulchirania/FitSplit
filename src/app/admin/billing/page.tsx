import Link from "next/link";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  await requireRole(["admin"]);

  return (
    <div className="odp2-scroll">
      <div className="adm-page-head">
        <div>
          <div className="adm-crumb">Admin / Billing</div>
          <h1 className="adm-title">Platform billing</h1>
        </div>
      </div>
      <p className="adm-page-desc">
        Platform-level subscription and revenue management for all gyms on FitSplit.
      </p>

      <div className="adm-card" style={{ marginTop: 24 }}>
        <div className="adm-card__body" style={{ padding: "64px 32px", textAlign: "center" }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: "var(--brand-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em" }}>
            Coming Soon
          </h2>
          <p style={{ color: "var(--text-soft)", fontSize: 14, maxWidth: 420, margin: "0 auto 24px", lineHeight: 1.6 }}>
            Platform-level billing — subscription tiers, MRR tracking, invoice management and automatic plan upgrades
            — is currently in development. Gym-level billing is already available.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/admin/gyms" className="adm-btn">
              View gym workspaces →
            </Link>
            <Link href="/admin" className="adm-btn adm-btn--ghost">
              Back to admin
            </Link>
          </div>
        </div>
      </div>

      <div className="adm-kpis" style={{ marginTop: 24 }}>
        <div className="adm-kpi adm-kpi--brand">
          <small>PLATFORM MRR</small>
          <strong>—</strong>
          <em>coming soon</em>
        </div>
        <div className="adm-kpi">
          <small>TOTAL GYMS</small>
          <strong>—</strong>
          <em>billing not configured</em>
        </div>
        <div className="adm-kpi adm-kpi--accent">
          <small>ACTIVE PLANS</small>
          <strong>—</strong>
          <em>coming soon</em>
        </div>
        <div className="adm-kpi adm-kpi--warn">
          <small>OVERDUE</small>
          <strong>—</strong>
          <em>coming soon</em>
        </div>
      </div>
    </div>
  );
}
