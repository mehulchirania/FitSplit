import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { UserRound, UsersRound } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import { getTrainersForGym, getMembers } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function TrainersPage() {
  const currentUser = await requireRole(["admin", "owner"]);
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;

  const [trainers, { members }] = await Promise.all([
    getTrainersForGym(gymId),
    getMembers(gymId),
  ]);

  const ptMembers = members.filter((m) => m.isPT);
  const unassignedPtMembers = ptMembers.filter((m) => !m.assignedTrainerId);

  // Build a map of trainerId → assigned PT members
  const assignedCountByTrainer = ptMembers.reduce<Record<string, number>>((acc, m) => {
    if (m.assignedTrainerId) {
      acc[m.assignedTrainerId] = (acc[m.assignedTrainerId] ?? 0) + 1;
    }
    return acc;
  }, {});

  return (
    <main className="page">
      <header className="page-header">
        <Breadcrumb crumbs={[{ label: "Dashboard", href: "/owner" }, { label: "Trainers" }]} />
        <p className="eyebrow">Staff</p>
        <h1>Trainers</h1>
        <p>
          Manage personal trainers at your gym. Assign trainers to PT members from the{" "}
          <Link href="/owner/members" style={{ color: "var(--brand)" }}>
            member detail page
          </Link>.
        </p>
      </header>

      {/* Stats */}
      <div className="billing-stats">
        <StatCard
          label="Trainers"
          value={trainers.length}
          accent="blue"
        />
        <StatCard
          label="PT members"
          value={ptMembers.length}
          accent="green"
        />
        <StatCard
          label="Unassigned PT members"
          value={unassignedPtMembers.length}
          accent={unassignedPtMembers.length > 0 ? "amber" : "default"}
        />
      </div>

      {/* Trainer list */}
      <div className="list-panel" style={{ padding: 0 }}>
        <div className="panel-title" style={{ padding: "14px 20px 12px" }}>
          <h2><UsersRound /> Active trainers</h2>
          <span className="status-pill status-neutral" style={{ fontSize: "0.72rem" }}>{trainers.length}</span>
        </div>

        {trainers.length === 0 ? (
          <div style={{ padding: "32px 20px" }}>
            <EmptyState
              icon={<UserRound />}
              heading="No trainers yet"
              body="Add a trainer by creating a staff account with the Trainer role."
              action={{ label: "Manage staff →", href: "/owner/settings" }}
            />
          </div>
        ) : (
          <div className="trainer-list">
            {trainers.map((trainer) => {
              const assignedCount = assignedCountByTrainer[trainer.id] ?? 0;
              return (
                <div key={trainer.id} className="trainer-row">
                  <div className="trainer-row-avatar">
                    {trainer.avatarInitials}
                  </div>
                  <div className="trainer-row-info">
                    <div className="trainer-row-name">{trainer.fullName}</div>
                    <div className="trainer-row-meta">
                      {trainer.staffType === "owner" ? (
                        <span className="status-pill status-active" style={{ fontSize: "0.7rem" }}>Owner</span>
                      ) : (
                        <span className="status-pill status-neutral" style={{ fontSize: "0.7rem" }}>Trainer</span>
                      )}
                      {trainer.phone && <span className="trainer-row-phone">{trainer.phone}</span>}
                    </div>
                  </div>
                  <div className="trainer-row-stats">
                    <div className="trainer-row-stat">
                      <strong>{assignedCount}</strong>
                      <span>PT members</span>
                    </div>
                  </div>
                  <div className="trainer-row-actions">
                    <Link
                      href={`/owner/training?trainerId=${trainer.id}`}
                      className="button button-secondary button-sm"
                    >
                      View sessions →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unassigned PT members */}
      {unassignedPtMembers.length > 0 && (
        <div className="list-panel" style={{ padding: 0, marginTop: 16 }}>
          <div className="panel-title" style={{ padding: "14px 20px 12px" }}>
            <h2>PT members without a trainer</h2>
            <span className="status-pill status-warning" style={{ fontSize: "0.72rem" }}>{unassignedPtMembers.length}</span>
          </div>
          <div className="trainer-list">
            {unassignedPtMembers.map((m) => (
              <div key={m.id} className="trainer-row">
                <div className="trainer-row-avatar">{m.avatarInitials}</div>
                <div className="trainer-row-info">
                  <div className="trainer-row-name">{m.fullName}</div>
                  <div className="trainer-row-meta">
                    <span className="status-pill status-expiring" style={{ fontSize: "0.7rem" }}>No trainer assigned</span>
                  </div>
                </div>
                <div className="trainer-row-actions">
                  <Link
                    href={`/owner/members/${m.id}`}
                    className="button button-secondary button-sm"
                  >
                    Assign trainer →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
