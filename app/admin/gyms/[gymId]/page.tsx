import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { UsersRound, Bell, Settings } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { setGymStatus, updateGymDetails, resetPassword } from "@/lib/firebase/actions";
import { getGymDetail, getOwnersForGym } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function GymManagementPage({
  params
}: {
  params: Promise<{ gymId: string }>;
}) {
  await requireRole(["admin"]);

  const { gymId } = await params;
  const [{ gym }, { owners }] = await Promise.all([
    getGymDetail(gymId),
    getOwnersForGym(gymId)
  ]);

  if (!gym) {
    notFound();
  }

  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <p className="eyebrow">Admin / Gym Management</p>
          <h1>{gym.name}</h1>
          <p>
            Control gym-wide settings, manage owners, and monitor rollout status.
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
            <span className={`status-pill ${gym.status === 'active' ? 'status-active' : 'status-neutral'}`}>
              {gym.status}
            </span>
          </div>
          <div className="detail-window">
            <span>
              Members
              <strong>{gym.memberCount}</strong>
            </span>
            <span>
              Owners
              <strong>{owners.length}</strong>
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
          <h3 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Social Profiles</h3>
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

        <ConfirmActionForm
          action={setGymStatus}
          className="form-panel"
          confirmMessage={`This will set the gym status to ${gym.status === 'active' ? 'inactive' : 'active'}.`}
          confirmTitle="Change Gym Status?"
          pendingLabel="Updating..."
          submitLabel={gym.status === 'active' ? "Deactivate Gym" : "Activate Gym"}
        >
          <h2>Availability</h2>
          <p style={{ marginBottom: "16px", color: "var(--text-muted)" }}>
            Deactivating a gym will prevent owners and members from accessing their dashboards for this workspace.
          </p>
          <input name="gymId" type="hidden" value={gym.id} />
          <input name="status" type="hidden" value={gym.status === 'active' ? 'inactive' : 'active'} />
        </ConfirmActionForm>
      </section>

      <section className="list-panel" style={{ marginTop: 16 }}>
        <div className="panel-title">
          <h2><UsersRound /> Gym Owners</h2>
        </div>
        <div className="activity-feed">
          {owners.map((owner) => (
            <article className="member-row" key={owner.id}>
              <span className="avatar">{owner.avatarInitials}</span>
              <div style={{ flex: 1 }}>
                <span className="member-name">{owner.fullName}</span>
                <span className="member-meta">{owner.email}</span>
              </div>
              <ConfirmActionForm
                action={resetPassword}
                confirmMessage={`Reset password for ${owner.fullName}? Default is 'password'.`}
                confirmTitle="Reset Owner Password"
                pendingLabel="Resetting..."
                submitLabel="Reset Pwd"
                style={{ padding: 0, background: 'none', border: 'none' }}
              >
                <input name="userId" type="hidden" value={owner.id} />
                <input name="newPassword" type="hidden" value="password" />
              </ConfirmActionForm>
            </article>
          ))}
          {owners.length === 0 && (
            <p style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No owners assigned to this gym yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
