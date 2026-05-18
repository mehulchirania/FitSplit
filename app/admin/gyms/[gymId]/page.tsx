import Link from "next/link";
import { notFound } from "next/navigation";
import { AddStaffForm } from "@/components/add-staff-form";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { UsersRound, Settings } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { deleteGymStaffProfile, deleteGymWithMembers, setGymStatus, updateGymDetails, resetPassword } from "@/lib/firebase/actions";
import { getGymDetail, getOwnersForGym } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function GymManagementPage({
  params
}: {
  params: Promise<{ gymId: string }>;
}) {
  await requireRole(["admin"]);

  const { gymId } = await params;
  const [{ gym }, { owners: staff }] = await Promise.all([
    getGymDetail(gymId),
    getOwnersForGym(gymId)
  ]);

  if (!gym) {
    notFound();
  }

  const isGymAccessEnabled = gym.status !== "inactive" && gym.status !== "paused";

  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <p className="eyebrow">Admin / Gym Management</p>
          <h1>{gym.name}</h1>
          <p>
            Control gym-wide settings, manage staff, and monitor rollout status.
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
              {gym.status}
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
        <ConfirmActionForm
          action={updateGymDetails}
          className="form-panel"
          confirmMessage="Save changes to gym contact and social information?"
          confirmTitle="Update Gym Details?"
          pendingLabel="Saving..."
          submitLabel="Save Details"
        >
          <h2>Gym Details</h2>
          <input name="gymId" type="hidden" value={gym.id} />
          <div className="form-grid">
            <label>
              Gym Name
              <input name="name" defaultValue={gym.name} required />
            </label>
            <label>
              Location
              <input name="location" defaultValue={gym.location} placeholder="City, State" />
            </label>
            <label>
              Contact Phone
              <input name="phone" defaultValue={gym.phone} />
            </label>
            <label>
              Contact Email
              <input name="email" defaultValue={gym.email} type="email" />
            </label>
          </div>
          <h3 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-soft)' }}>Social Profiles</h3>
          <div className="form-grid">
            <label>
              Instagram
              <input name="instagram" defaultValue={gym.instagram} placeholder="@username" />
            </label>
            <label>
              LinkedIn
              <input name="linkedin" defaultValue={gym.linkedin} placeholder="company URL" />
            </label>
            <label>
              YouTube
              <input name="youtube" defaultValue={gym.youtube} placeholder="channel URL" />
            </label>
          </div>
        </ConfirmActionForm>

        <div className="form-panel">
          <div className="panel-title">
            <div>
              <h2>Access Control</h2>
              <p className="member-meta">
                Toggle workspace access for all gym staff and members.
              </p>
            </div>
            <ConfirmActionForm
              action={setGymStatus}
              confirmMessage={`This will ${isGymAccessEnabled ? 'disable' : 'enable'} access for this gym's staff and members.`}
              confirmTitle={isGymAccessEnabled ? "Disable Gym Access?" : "Enable Gym Access?"}
              pendingLabel="Updating..."
              submitLabel={isGymAccessEnabled ? "Enabled" : "Disabled"}
              submitClassName={`access-toggle ${isGymAccessEnabled ? 'is-on' : 'is-off'}`}
              style={{
                padding: 0,
                background: "none",
                border: "none",
                width: "auto"
              }}
            >
              <input name="gymId" type="hidden" value={gym.id} />
              <input name="status" type="hidden" value={isGymAccessEnabled ? 'inactive' : 'active'} />
            </ConfirmActionForm>
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
              <ConfirmActionForm
                action={resetPassword}
                confirmMessage={`Reset password for ${staffMember.fullName}? Default is 'password'.`}
                confirmTitle="Reset Staff Password"
                pendingLabel="Resetting..."
                submitLabel="Reset Pwd"
                style={{ padding: 0, background: 'none', border: 'none' }}
              >
                <input name="userId" type="hidden" value={staffMember.id} />
                <input name="newPassword" type="hidden" value="password" />
              </ConfirmActionForm>
              <ConfirmActionForm
                action={deleteGymStaffProfile}
                confirmMessage={`Delete ${staffMember.fullName}? This removes their Firebase Auth login and staff profile.`}
                confirmTitle="Delete Gym Staff?"
                pendingLabel="Deleting..."
                submitLabel="Delete"
                style={{ padding: 0, background: 'none', border: 'none' }}
              >
                <input name="userId" type="hidden" value={staffMember.id} />
                <input name="gymId" type="hidden" value={gym.id} />
              </ConfirmActionForm>
            </article>
          ))}
          {staff.length === 0 && (
            <p style={{ padding: '24px', textAlign: 'center', color: 'var(--text-soft)' }}>No staff assigned to this gym yet.</p>
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
            <ConfirmActionForm
              action={deleteGymWithMembers}
              confirmMessage={`Delete "${gym.name}" and all its members and staff permanently? This cannot be undone.`}
              confirmTitle="Delete gym and all members?"
              confirmLabel="Yes, delete everything"
              pendingLabel="Deleting..."
              submitClassName="button button-danger"
              submitLabel="Delete gym and all members"
              successRedirect="/admin/gyms"
              style={{ background: "none", border: "none", padding: 0 }}
            >
              <input name="gymId" type="hidden" value={gym.id} />
            </ConfirmActionForm>
          </div>
        </section>
      )}
    </main>
  );
}
