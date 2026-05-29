import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { UserRound, UsersRound } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import { getGymDetail, getMembersForTrainer } from "@/lib/firebase/read-models";
import type { TrainerMemberVisibility } from "@/types/domain";

export const dynamic = "force-dynamic";

const VISIBILITY_LABEL: Record<TrainerMemberVisibility, string> = {
  assigned_only: "Assigned PT members only",
  all_pt_members: "All PT members in gym",
  all_members: "All members in gym",
};

export default async function TrainerMembersPage() {
  const currentUser = await requireRole(["owner", "trainer"]);
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
  const trainerId = currentUser.uid;

  const [{ gym }] = await Promise.all([getGymDetail(gymId)]);

  const visibility: TrainerMemberVisibility =
    gym?.trainerMemberVisibility ?? "assigned_only";

  const members = await getMembersForTrainer(gymId, trainerId, visibility);

  const activeCount = members.filter((m) => m.isActive).length;
  const ptCount = members.filter((m) => m.isPT).length;
  const assignedToMeCount = members.filter((m) => m.assignedTrainerId === trainerId).length;

  return (
    <div className="odp2-scroll">
      <div className="adm-page-head">
        <div>
          <div className="adm-crumb">Trainer / My Members</div>
          <h1 className="adm-title">My members</h1>
        </div>
        <div className="adm-head-actions">
          <a href="/trainer" className="adm-btn adm-btn--ghost">← My schedule</a>
        </div>
      </div>
      <p className="adm-page-desc">
        Visibility mode: <strong>{VISIBILITY_LABEL[visibility]}</strong>
      </p>

      {/* Stats */}
      <div className="billing-stats" style={{ marginBottom: 20 }}>
        <StatCard label="Visible members" value={members.length} accent="blue" />
        <StatCard label="Active" value={activeCount} accent="green" />
        <StatCard label="PT members" value={ptCount} accent="blue" />
        {visibility !== "assigned_only" && (
          <StatCard
            label="Assigned to me"
            value={assignedToMeCount}
            accent={assignedToMeCount > 0 ? "green" : "default"}
          />
        )}
      </div>

      {/* Member list */}
      <div className="list-panel" style={{ padding: 0 }}>
        <div className="panel-title" style={{ padding: "14px 20px 12px" }}>
          <h2><UsersRound /> Members</h2>
          <span className="status-pill status-neutral" style={{ fontSize: "0.72rem" }}>{members.length}</span>
        </div>

        {members.length === 0 ? (
          <div style={{ padding: "32px 20px" }}>
            <EmptyState
              icon={<UserRound />}
              heading="No members visible"
              body={
                visibility === "assigned_only"
                  ? "You have no PT members assigned to you yet. Ask your gym owner to assign members."
                  : "No members found for this gym."
              }
            />
          </div>
        ) : (
          <div className="trainer-list">
            {members.map((m) => {
              const isAssignedToMe = m.assignedTrainerId === trainerId;
              return (
                <div key={m.id} className="trainer-row">
                  <div className="trainer-row-avatar">{m.avatarInitials}</div>
                  <div className="trainer-row-info">
                    <div className="trainer-row-name">{m.fullName}</div>
                    <div className="trainer-row-meta">
                      {m.isPT && (
                        <span className="status-pill status-active" style={{ fontSize: "0.7rem" }}>PT</span>
                      )}
                      {isAssignedToMe && (
                        <span className="status-pill status-neutral" style={{ fontSize: "0.7rem" }}>Assigned to me</span>
                      )}
                      {m.membershipStatus && (
                        <StatusBadge status={m.membershipStatus} />
                      )}
                      {m.currentPackageName && (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-soft)" }}>{m.currentPackageName}</span>
                      )}
                    </div>
                    {m.goal && (
                      <div style={{ fontSize: "0.78rem", color: "var(--text-soft)", marginTop: 2 }}>
                        Goal: {m.goal}
                      </div>
                    )}
                  </div>
                  <div className="trainer-row-actions">
                    <Link
                      href={`/trainer?book=1&memberId=${m.id}`}
                      className="button button-secondary button-sm"
                    >
                      Assign PT →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
