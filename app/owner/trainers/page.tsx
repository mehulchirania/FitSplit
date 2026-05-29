import Link from "next/link";
import { AddStaffForm } from "@/components/add-staff-form";
import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import { getTrainersForGym, getMembers } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

function trainerInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ["var(--brand)", "var(--accent)", "#7C3AED", "#D97706", "var(--danger)"];

export default async function TrainersPage() {
  const currentUser = await requireRole(["admin", "owner"]);
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;

  const [trainers, { members }] = await Promise.all([
    getTrainersForGym(gymId),
    getMembers(gymId),
  ]);

  const ptMembers = members.filter((m) => m.isPT);
  const unassignedPtMembers = ptMembers.filter((m) => !m.assignedTrainerId);

  const assignedCountByTrainer = ptMembers.reduce<Record<string, number>>((acc, m) => {
    if (m.assignedTrainerId) {
      acc[m.assignedTrainerId] = (acc[m.assignedTrainerId] ?? 0) + 1;
    }
    return acc;
  }, {});

  return (
    <div className="odp2-scroll">
      <div className="adm-page-head">
        <div>
          <div className="adm-crumb">Dashboard / Trainers</div>
          <h1 className="adm-title">Trainers</h1>
        </div>
        <div className="adm-head-actions">
          <a href="#add-trainer" className="adm-btn">+ Add trainer</a>
        </div>
      </div>
      <p className="adm-page-desc">
        Manage personal trainers at your gym. Assign trainers to PT members from the{" "}
        <Link href="/owner/members" className="adm-link">member detail page</Link>.
      </p>

      {/* KPI row */}
      <div className="adm-kpis" style={{ marginBottom: 20 }}>
        <div className="adm-kpi adm-kpi--brand">
          <small>TRAINERS</small>
          <strong>{trainers.length}</strong>
          <em>active staff</em>
        </div>
        <div className="adm-kpi">
          <small>PT MEMBERS</small>
          <strong>{ptMembers.length}</strong>
          <em>on PT plans</em>
        </div>
        <div className={`adm-kpi${unassignedPtMembers.length > 0 ? " adm-kpi--warn" : ""}`}>
          <small>UNASSIGNED PT</small>
          <strong>{unassignedPtMembers.length}</strong>
          <em>{unassignedPtMembers.length > 0 ? "need a trainer" : "all assigned"}</em>
        </div>
        <div className="adm-kpi">
          <small>AVG PT LOAD</small>
          <strong>{trainers.length > 0 ? Math.round(ptMembers.length / trainers.length) : "—"}</strong>
          <em>members per trainer</em>
        </div>
      </div>

      {/* Trainer roster */}
      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-card__head">
          <h3>Active trainers</h3>
          <span className="adm-inbox-tag adm-inbox-tag--ok">{trainers.length}</span>
        </div>
        <div className="adm-card__body adm-card__body--flush">
          {trainers.length === 0 ? (
            <div className="adm-empty" style={{ flexDirection: "column", gap: 8, padding: "32px 20px", textAlign: "center" }}>
              <p style={{ margin: 0, fontWeight: 700 }}>No trainers yet</p>
              <span style={{ fontSize: 13, color: "var(--text-soft)" }}>
                Add a trainer using the form below.
              </span>
              <a href="#add-trainer" className="adm-btn adm-btn--ghost" style={{ marginTop: 8, width: "fit-content", alignSelf: "center" }}>
                + Add your first trainer
              </a>
            </div>
          ) : (
            trainers.map((trainer, i) => {
              const assignedCount = assignedCountByTrainer[trainer.id] ?? 0;
              return (
                <div
                  key={trainer.id}
                  className={`adm-staff-row${i < trainers.length - 1 ? " adm-staff-row--border" : ""}`}
                  style={{ padding: "14px 20px" }}
                >
                  <span
                    className="adm-staff-row__avatar"
                    style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  >
                    {trainerInitials(trainer.fullName)}
                  </span>
                  <div className="adm-staff-row__info" style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{trainer.fullName}</strong>
                    <div style={{ display: "flex", gap: 6, marginTop: 3, alignItems: "center", flexWrap: "wrap" }}>
                      {trainer.staffType === "owner" ? (
                        <span className="adm-inbox-tag adm-inbox-tag--ok" style={{ fontSize: "0.7rem" }}>Owner</span>
                      ) : (
                        <span className="adm-inbox-tag" style={{ fontSize: "0.7rem" }}>Trainer</span>
                      )}
                      {trainer.phone && (
                        <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{trainer.phone}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 16, alignItems: "center", flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <strong style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", display: "block", lineHeight: 1 }}>{assignedCount}</strong>
                      <span style={{ fontSize: 11, color: "var(--text-faint)" }}>PT members</span>
                    </div>
                    <Link
                      href={`/owner/training?trainerId=${trainer.id}`}
                      className="adm-btn adm-btn--ghost adm-btn--sm"
                    >
                      View sessions →
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Unassigned PT members */}
      {unassignedPtMembers.length > 0 && (
        <div className="adm-card" style={{ marginBottom: 16 }}>
          <div className="adm-card__head">
            <h3>PT members without a trainer</h3>
            <span className="adm-inbox-tag adm-inbox-tag--warn">{unassignedPtMembers.length}</span>
          </div>
          <div className="adm-card__body adm-card__body--flush">
            {unassignedPtMembers.map((m, i) => (
              <div
                key={m.id}
                className={`adm-staff-row${i < unassignedPtMembers.length - 1 ? " adm-staff-row--border" : ""}`}
                style={{ padding: "12px 20px" }}
              >
                <span className="adm-staff-row__avatar" style={{ background: "var(--warning)", fontSize: 12 }}>
                  {m.avatarInitials}
                </span>
                <div className="adm-staff-row__info" style={{ flex: 1 }}>
                  <strong style={{ fontSize: 13.5, fontWeight: 700 }}>{m.fullName}</strong>
                  <span className="adm-inbox-tag adm-inbox-tag--warn" style={{ fontSize: "0.7rem", display: "inline-flex", marginTop: 3 }}>No trainer assigned</span>
                </div>
                <Link
                  href={`/owner/members/${m.id}`}
                  className="adm-btn adm-btn--ghost adm-btn--sm"
                >
                  Assign trainer →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add trainer form */}
      <details className="adm-details-panel" id="add-trainer" open={trainers.length === 0}>
        <summary className="adm-details-panel__summary">Add a trainer / staff member</summary>
        <div className="adm-details-panel__body">
          <p style={{ fontSize: 13, color: "var(--text-soft)", marginBottom: 14, lineHeight: 1.6 }}>
            Creates a FitSplit login for the new staff member. Their default password is <code>password</code> — ask them to change it on first login.
          </p>
          <AddStaffForm gymId={gymId} />
        </div>
      </details>
    </div>
  );
}
