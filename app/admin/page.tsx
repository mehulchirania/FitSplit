import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { requireRole } from "@/lib/auth";
import { createOwnerProfile } from "@/lib/firebase/actions";
import { getGymWorkspaces } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireRole(["admin"]);

  const { gyms } = await getGymWorkspaces();

  const totalMembers = gyms.reduce((sum, g) => sum + g.memberCount, 0);
  const activeGyms = gyms.filter((g) => g.status === "active").length;

  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <Breadcrumb crumbs={[{ label: "Admin" }]} />
          <h1>Admin Console</h1>
          <p>Manage gym workspaces, staff access, and platform-wide settings.</p>
          <div className="quick-actions">
            <Link className="button button-primary" href="/admin/gyms">
              Manage gyms
            </Link>
            <Link className="button button-secondary" href="/admin/inbox">
              Inbox
            </Link>
          </div>
        </div>
      </section>

      <div className="admin-stats-strip">
        <div className="admin-stat">
          <div className="admin-stat-value">{gyms.length}</div>
          <div className="admin-stat-label">Total gyms</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-value">{activeGyms}</div>
          <div className="admin-stat-label">Active gyms</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-value">{totalMembers}</div>
          <div className="admin-stat-label">Total members</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-value">{gyms.length - activeGyms}</div>
          <div className="admin-stat-label">Inactive / paused</div>
        </div>
      </div>

      <section className="list-panel" style={{ marginTop: 4 }}>
        <div className="panel-title">
          <h2>Gyms</h2>
          <Link className="button button-secondary" href="/admin/gyms">
            Add / manage gyms
          </Link>
        </div>
        <table className="admin-gym-table">
          <thead>
            <tr>
              <th>Gym</th>
              <th>Location</th>
              <th>Status</th>
              <th>Members</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {gyms.map((gym) => (
              <tr key={gym.id}>
                <td>
                  <span style={{ fontWeight: 600 }}>{gym.name}</span>
                  <br />
                  <span style={{ fontSize: "0.78rem", color: "var(--text-soft)" }}>
                    {gym.slug}
                  </span>
                </td>
                <td style={{ color: "var(--text-soft)", fontSize: "0.88rem" }}>
                  {gym.location || "—"}
                </td>
                <td>
                  <span
                    className={`status-pill ${gym.status === "active" ? "status-active" : "status-neutral"}`}
                  >
                    {gym.status}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>{gym.memberCount}</td>
                <td>
                  <Link
                    className="button button-secondary"
                    href={`/admin/gyms/${gym.id}`}
                    style={{ fontSize: "0.8rem", padding: "6px 14px" }}
                  >
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
            {gyms.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--text-soft)", padding: "32px" }}>
                  No gyms yet. Add the first gym to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="content-grid" style={{ marginTop: 16 }}>
        <ConfirmActionForm
          action={createOwnerProfile}
          className="form-panel"
          confirmMessage="This creates a Firebase Auth login with the email and default password 'password'. Share these credentials manually — no email is sent."
          confirmTitle="Create gym staff?"
          pendingLabel="Creating..."
          submitLabel="Create staff account"
        >
          <h2>Add Gym Staff</h2>
          <p className="member-meta" style={{ marginBottom: 16 }}>
            Creates a login for an owner, trainer, or staff member at any gym workspace.
          </p>
          <div className="form-grid">
            <label>
              Full name
              <input name="fullName" placeholder="Jane Smith" required />
            </label>
            <label>
              Email address
              <input name="email" placeholder="jane@gym.com" required type="email" />
            </label>
            <label>
              Role
              <select
                name="staffType"
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text)"
                }}
              >
                <option value="owner">Owner — full access</option>
                <option value="trainer">Trainer — view + assign programs</option>
                <option value="staff">Staff — view only</option>
              </select>
            </label>
            <label>
              Assign to gym
              <select
                name="gymId"
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text)"
                }}
              >
                {gyms.map((gym) => (
                  <option key={gym.id} value={gym.id}>
                    {gym.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-faint)", margin: "8px 0 0" }}>
            Default login password is <code>password</code>. Share it with the staff member — no email is sent automatically.
          </p>
        </ConfirmActionForm>

        <div className="form-panel">
          <h2>Staff access levels</h2>
          <div style={{ display: "grid", gap: 12, marginTop: 4 }}>
            {[
              { role: "Owner", desc: "Full gym access — members, programs, exercises, settings." },
              { role: "Trainer", desc: "View member profiles and assign workout programs." },
              { role: "Staff", desc: "Read-only access to the member list." }
            ].map(({ role, desc }) => (
              <div key={role} style={{ borderLeft: "3px solid var(--brand)", paddingLeft: 12 }}>
                <strong style={{ fontSize: "0.88rem" }}>{role}</strong>
                <p style={{ fontSize: "0.82rem", color: "var(--text-soft)", margin: "2px 0 0" }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--text-faint)", marginTop: 16 }}>
            Default login password is <code>password</code>. Staff should change it on first login. Reset is available on each gym's detail page.
          </p>
        </div>
      </section>
    </main>
  );
}
