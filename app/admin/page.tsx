import Link from "next/link";
import { Bell, CalendarDays, UsersRound } from "@/components/icons";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { getGymWorkspaces, getRoleSummary } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [{ gyms }, roles] = await Promise.all([
    getGymWorkspaces(),
    getRoleSummary()
  ]);

  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <p className="eyebrow">Admin / all workspaces</p>
          <h1>Workspace control.</h1>
          <p>
            Admin users can access every gym workspace. The current pilot
            workspace is Titan V2 Fitness, with the Titan owner scoped only to
            that gym.
          </p>
        </div>
        <aside className="summary-panel">
          <WorkspaceSwitcher mode="admin" />
          <div className="membership-window">
            <span>
              Admin
              <strong>{roles.adminName}</strong>
            </span>
            <span>
              Owner scope
              <strong>{roles.ownerAccess}</strong>
            </span>
          </div>
        </aside>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <UsersRound />
          <strong>{gyms.length}</strong>
          <span>Workspaces</span>
        </article>
        <article className="stat-card">
          <CalendarDays />
          <strong>{gyms[0]?.expiryWarningDays ?? 7}</strong>
          <span>Expiry warning days</span>
        </article>
        <article className="stat-card">
          <Bell />
          <strong>Pilot</strong>
          <span>Current rollout stage</span>
        </article>
      </section>

      <section className="list-panel">
        <div className="panel-title">
          <h2>Gym workspaces</h2>
          <Link className="button button-secondary" href="/owner">
            Open owner view
          </Link>
        </div>
        {gyms.map((workspace) => (
          <article className="member-row" key={workspace.id}>
            <span className="avatar">TV</span>
            <div>
              <span className="member-name">{workspace.name}</span>
              <span className="member-meta">
                Owner: {workspace.ownerName || roles.ownerName} / Slug: {workspace.slug}
              </span>
            </div>
            <span className="status-pill status-neutral">{workspace.status}</span>
            <span className="status-pill status-active">{workspace.memberCount} members</span>
          </article>
        ))}
      </section>
    </main>
  );
}
