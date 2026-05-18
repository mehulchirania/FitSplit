import Link from "next/link";
import { AddGymForm } from "@/components/add-gym-form";
import { Breadcrumb } from "@/components/breadcrumb";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { requireRole } from "@/lib/auth";
import { deleteGymWorkspace } from "@/lib/firebase/actions";
import { getGymWorkspaces } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function ManageGymsPage() {
  await requireRole(["admin"]);

  const { gyms } = await getGymWorkspaces();

  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <Breadcrumb crumbs={[{ label: "Admin", href: "/admin" }, { label: "Gyms" }]} />
          <h1>Gym workspaces</h1>
          <p>
            Add new gym workspaces and remove ones that are no longer needed. Edit gym details and manage staff from each gym's detail page.
          </p>
          <div className="quick-actions">
            <Link className="button button-secondary" href="/admin">
              Back to dashboard
            </Link>
          </div>
        </div>
        <aside className="summary-panel">
          <div className="panel-title">
            <h2>Overview</h2>
            <span className="status-pill status-active">{gyms.length} workspace{gyms.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="detail-window">
            <span>
              Active
              <strong>{gyms.filter((g) => g.status === "active").length}</strong>
            </span>
            <span>
              Total members
              <strong>{gyms.reduce((sum, g) => sum + g.memberCount, 0)}</strong>
            </span>
          </div>
        </aside>
      </section>

      <section className="content-grid">
        <AddGymForm />

        <div className="form-panel">
          <h2>Before removing a gym</h2>
          <p className="member-meta">
            A gym can only be removed after all staff and members have been deleted or reassigned. This prevents orphaned logins.
          </p>
          <p className="member-meta" style={{ marginTop: 8 }}>
            To permanently delete a gym <em>including all its members and staff</em>, open the gym's detail page and use the Danger Zone section.
          </p>
        </div>
      </section>

      <section className="list-panel" style={{ marginTop: 16 }}>
        <div className="panel-title">
          <h2>All gyms</h2>
        </div>
        <div className="activity-feed">
          {gyms.map((gym) => (
            <article
              key={gym.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 16,
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)"
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: "1rem" }}>{gym.name}</span>
                  <span
                    className={`status-pill ${gym.status === "active" ? "status-active" : "status-neutral"}`}
                  >
                    {gym.status}
                  </span>
                  <span className="status-pill status-neutral">{gym.memberCount} members</span>
                </div>
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-soft)",
                    margin: "4px 0 0",
                    fontFamily: "monospace"
                  }}
                >
                  ID: {gym.id}{gym.location ? ` · ${gym.location}` : ""}
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <Link
                  className="button button-secondary"
                  href={`/admin/gyms/${gym.id}`}
                  style={{ fontSize: "0.82rem", padding: "6px 14px" }}
                >
                  Open details
                </Link>
                <ConfirmActionForm
                  action={deleteGymWorkspace}
                  confirmMessage={`Remove "${gym.name}"? Only allowed when no staff or members are assigned.`}
                  confirmTitle="Remove gym?"
                  pendingLabel="Removing..."
                  submitClassName="button button-secondary"
                  submitLabel="Remove"
                  successRedirect="/admin/gyms"
                  style={{ background: "none", border: "none", padding: 0 }}
                >
                  <input name="gymId" type="hidden" value={gym.id} />
                </ConfirmActionForm>
              </div>
            </article>
          ))}
          {gyms.length === 0 && (
            <p style={{ padding: "32px", textAlign: "center", color: "var(--text-soft)" }}>
              No gym workspaces yet. Add the first one above.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
