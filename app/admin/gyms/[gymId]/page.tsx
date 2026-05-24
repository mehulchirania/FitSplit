import Link from "next/link";
import { notFound } from "next/navigation";
import { AddStaffForm } from "@/components/add-staff-form";
import { Breadcrumb } from "@/components/breadcrumb";
import { GymAccessStatusAction } from "@/components/gym-access-status-action";
import { GymArchiveAction } from "@/components/gym-archive-action";
import { GymDetailsForm } from "@/components/gym-details-form";
import { GymLogoManager } from "@/components/gym-logo-manager";
import { UsersRound, Settings } from "@/components/icons";
import { StaffAccessActions } from "@/components/staff-access-actions";
import { requireRole } from "@/lib/auth";
import { updateGymLogo } from "@/lib/firebase/actions";
import { getGymDetail, getMembers, getOwnersForGym } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function GymManagementPage({
  params
}: {
  params: Promise<{ gymId: string }>;
}) {
  await requireRole(["admin"]);

  const { gymId } = await params;
  const [{ gym }, { owners: staff }, { members }] = await Promise.all([
    getGymDetail(gymId),
    getOwnersForGym(gymId),
    getMembers(gymId)
  ]);

  if (!gym) {
    notFound();
  }

  const isGymAccessEnabled = gym.status !== "inactive" && gym.status !== "paused";

  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <Breadcrumb crumbs={[{ label: "Admin", href: "/admin" }, { label: "Gyms", href: "/admin/gyms" }, { label: gym.name }]} />
          <h1>{gym.name}</h1>
          <p>
            Control gym-wide settings, manage staff, and monitor workspace status.
          </p>
          <div className="quick-actions">
            <Link className="button button-secondary" href="/admin">
              Back to all gyms
            </Link>
          </div>
        </div>
        <aside className="summary-panel">
          <div className="panel-title">
            <h2><Settings /> Gym Status</h2>
            <span className={`status-pill ${isGymAccessEnabled ? 'status-active' : 'status-neutral'}`}>
              {isGymAccessEnabled ? "active" : gym.status}
            </span>
          </div>
          <div className="detail-window">
            <span>
              Members
              <strong>{gym.memberCount}</strong>
            </span>
            <span>
              Staff
              <strong>{staff.length}</strong>
            </span>
          </div>
        </aside>
      </section>

      <section className="content-grid">
        <GymDetailsForm gym={gym} />

        <GymLogoManager action={updateGymLogo} currentLogoUrl={gym.logoUrl} gymId={gym.id} gymName={gym.name} />

        <div className="form-panel">
          <div className="panel-title">
            <div>
              <h2>Access Control</h2>
              <p className="member-meta">
                Toggle workspace access for all gym staff and members.
              </p>
            </div>
            <GymAccessStatusAction gymId={gym.id} isEnabled={isGymAccessEnabled} />
          </div>
          <p style={{ marginTop: 12, color: "var(--text-soft)" }}>
            Disabled gyms block owner, trainer, staff, and member logins by deactivating their profiles and Firebase Auth access.
          </p>
        </div>
      </section>

      <section className="content-grid" style={{ marginTop: 16 }}>
        <AddStaffForm gymId={gym.id} />
        <div className="form-panel">
          <h2>Staff roles</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-soft)", lineHeight: 1.6 }}>
            <strong>Owner</strong> — full access to member management, programs, and settings.<br />
            <strong>Trainer</strong> — can view members and assign programs.<br />
            <strong>Staff</strong> — view-only access to member list.
          </p>
          <p style={{ fontSize: "0.82rem", color: "var(--text-faint)", marginTop: 8 }}>
            All staff log in with their email and the default password <code>password</code>. Use the reset button below to change any password.
          </p>
        </div>
      </section>

      <section className="list-panel" style={{ marginTop: 16 }}>
        <div className="panel-title">
          <h2><UsersRound /> Gym Staff</h2>
        </div>
        <div className="activity-feed">
          {staff.map((staffMember) => (
            <article className="member-row" key={staffMember.id}>
              <span className="avatar">{staffMember.avatarInitials}</span>
              <div style={{ flex: 1 }}>
                <span className="member-name">{staffMember.fullName}</span>
                <span className="member-meta">{staffMember.email}</span>
              </div>
              <span className="status-pill status-neutral">{staffMember.staffType ?? "owner"}</span>
              <span className={`status-pill ${staffMember.isActive ? "status-active" : "status-danger"}`}>
                {staffMember.isActive ? "active" : "disabled"}
              </span>
              <StaffAccessActions fullName={staffMember.fullName} gymId={gym.id} userId={staffMember.id} />
            </article>
          ))}
          {staff.length === 0 && (
            <p style={{ padding: '24px', textAlign: 'center', color: 'var(--text-soft)' }}>No staff assigned to this gym yet.</p>
          )}
        </div>
      </section>

      <section className="list-panel" style={{ marginTop: 16 }}>
        <div className="panel-title">
          <h2><UsersRound /> Gym Members</h2>
          <span className="status-pill status-neutral">{members.length} total</span>
        </div>
        <div className="activity-feed">
          {members.map((member) => (
            <article className="member-row" key={member.id}>
              <span className="avatar">{member.avatarInitials}</span>
              <div style={{ flex: 1 }}>
                <span className="member-name">{member.fullName}</span>
                <span className="member-meta">
                  {member.username ? `@${member.username}` : member.email}
                  {member.phone ? ` • ${member.phone}` : ""}
                </span>
              </div>
              <span className={`status-pill ${member.isActive ? "status-active" : "status-danger"}`}>
                {member.isActive ? "active" : "disabled"}
              </span>
              <Link
                className="button button-secondary"
                href={`/owner/members/${member.id}`}
                style={{ fontSize: "0.8rem", padding: "6px 14px" }}
              >
                View
              </Link>
            </article>
          ))}
          {members.length === 0 && (
            <p style={{ padding: "24px", textAlign: "center", color: "var(--text-soft)" }}>
              No members assigned to this gym yet.
            </p>
          )}
        </div>
      </section>

      {gym.id !== "shg" && (
        <section className="list-panel" style={{ marginTop: 16, borderColor: "var(--error, #f87171)" }}>
          <div className="panel-title">
            <h2 style={{ color: "var(--error, #f87171)" }}>Danger Zone</h2>
          </div>
          <div style={{ padding: "16px 20px" }}>
            <p style={{ color: "var(--text-soft)", fontSize: "0.88rem", marginBottom: 12 }}>
              Permanently deletes this gym and <strong>all associated members and staff</strong> — including their
              Firebase Auth accounts, workout logs, assignments, sessions, and attendance records. This cannot be undone.
            </p>
            <GymArchiveAction
              destructive
              gymId={gym.id}
              gymName={gym.name}
              label="Delete gym and all members"
            />
          </div>
        </section>
      )}
    </main>
  );
}
