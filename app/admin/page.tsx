import Link from "next/link";
import { Bell, Dumbbell, UsersRound } from "@/components/icons";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { requireRole } from "@/lib/auth";
import { createOwnerProfile } from "@/lib/firebase/actions";
import { getGymWorkspaces, getRoleSummary } from "@/lib/firebase/read-models";
import { ConfirmActionForm } from "@/components/confirm-action-form";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireRole(["admin"]);

  const [{ gyms }, roles] = await Promise.all([
    getGymWorkspaces(),
    getRoleSummary()
  ]);

  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <p className="eyebrow">Admin / all gyms</p>
          <h1>Gym control.</h1>
          <p>
            Review gym workspaces, staff access, and rollout status from one admin console.
          </p>
          <div className="quick-actions">
            <Link className="button button-primary" href="/admin/gyms">
              Manage gyms
            </Link>
          </div>
        </div>
        <aside className="summary-panel">
          <WorkspaceSwitcher mode="admin" />
          <div className="detail-window">
            <span>
              Admin
              <strong>{roles.adminName}</strong>
            </span>
          </div>
        </aside>
      </section>

      <section className="ui-cards" style={{ marginTop: 16 }}>
        <article className="ui-card purple">
          <p className="tip"><UsersRound /> {gyms.length}</p>
          <p className="second-text">Gyms</p>
        </article>
        <article className="ui-card blue">
          <p className="tip"><Dumbbell /> Training</p>
          <p className="second-text">FitSplit focus</p>
        </article>
        <article className="ui-card green">
          <p className="tip"><Bell /> Pilot</p>
          <p className="second-text">Current rollout stage</p>
        </article>
      </section>

      <section className="list-panel">
        <div className="panel-title">
          <h2>Gyms</h2>
          <Link className="button button-secondary" href="/admin/gyms">
            Manage gyms
          </Link>
        </div>
        {gyms.map((workspace) => (
          <Link href={`/admin/gyms/${workspace.id}`} key={workspace.id} style={{ textDecoration: 'none', color: 'inherit' }}>
            <article className="member-row">
              <span className="avatar">{workspace.name.substring(0, 2).toUpperCase()}</span>
              <div>
                <span className="member-name" style={{ color: "var(--primary)" }}>{workspace.name}</span>
                <span className="member-meta">
                  Slug: {workspace.slug} / ID: {workspace.id}
                </span>
              </div>
              <span className={`status-pill ${workspace.status === 'active' ? 'status-active' : 'status-neutral'}`}>
                {workspace.status}
              </span>
              <span className="status-pill status-active">{workspace.memberCount} members</span>
              <div className="button button-secondary">Manage Gym</div>
            </article>
          </Link>
        ))}
      </section>

      <section className="content-grid" style={{ marginTop: 16 }}>
        <ConfirmActionForm
          action={createOwnerProfile}
          className="form-panel"
          confirmMessage="This will create a new gym staff profile and allow them to access the selected gym workspace."
          confirmTitle="Create Gym Staff?"
          pendingLabel="Creating staff..."
          submitLabel="Create Staff"
        >
          <h2>Add Gym Staff</h2>
          <div className="form-grid">
            <label>
              Full name
              <input name="fullName" placeholder="e.g. John Smith" required />
            </label>
            <label>
              Email address
              <input name="email" type="email" placeholder="e.g. owner@gym.com" required />
            </label>
            <label>
              Staff category
              <select name="staffType" required style={{ width: '100%', padding: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}>
                <option value="owner">Owner</option>
                <option value="trainer">Trainer</option>
                <option value="staff">Staff</option>
              </select>
            </label>
            <label>
              Assign to Gym
              <select name="gymId" required style={{ width: '100%', padding: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}>
                {gyms.map(gym => (
                  <option key={gym.id} value={gym.id}>{gym.name}</option>
                ))}
              </select>
            </label>
          </div>
        </ConfirmActionForm>
      </section>
    </main>
  );
}
