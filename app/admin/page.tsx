import Link from "next/link";
import { Bell, Dumbbell, UsersRound } from "@/components/icons";
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
          <p className="eyebrow">Admin / all gyms</p>
          <h1>Gym control.</h1>
          <p>
            Admin users can access every gym. The current pilot gym is Titan V2
            Fitness, with the Titan owner scoped only to that gym.
          </p>
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

      <section className="stats-grid">
        <article className="stat-card">
          <UsersRound />
          <strong>{gyms.length}</strong>
          <span>Gyms</span>
        </article>
        <article className="stat-card">
          <Dumbbell />
          <strong>Training</strong>
          <span>FitSplit focus</span>
        </article>
        <article className="stat-card">
          <Bell />
          <strong>Pilot</strong>
          <span>Current rollout stage</span>
        </article>
      </section>

      <section className="list-panel">
        <div className="panel-title">
          <h2>Gyms</h2>
          <Link className="button button-secondary" href="/owner">
            Open owner view
          </Link>
        </div>
        {gyms.map((workspace) => (
          <Link href="/owner/dashboard" key={workspace.id} style={{ textDecoration: 'none', color: 'inherit' }}>
            <article className="member-row">
              <span className="avatar">TV</span>
              <div>
                <span className="member-name" style={{ color: "var(--primary)" }}>{workspace.name}</span>
                <span className="member-meta">
                  Owner: {workspace.ownerName || roles.ownerName} / Slug: {workspace.slug}
                </span>
              </div>
              <span className="status-pill status-neutral">{workspace.status}</span>
              <span className="status-pill status-active">{workspace.memberCount} members</span>
            </article>
          </Link>
        ))}
      </section>
    </main>
  );
}
