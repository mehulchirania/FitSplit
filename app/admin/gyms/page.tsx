import Link from "next/link";
import { AddGymForm } from "@/components/add-gym-form";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { Settings, UsersRound } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { deleteGymWorkspace, updateGymDetails } from "@/lib/firebase/actions";
import { getGymWorkspaces } from "@/lib/firebase/read-models";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";

export const dynamic = "force-dynamic";

export default async function ManageGymsPage() {
  await requireRole(["admin"]);

  const { gyms } = await getGymWorkspaces();

  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <p className="eyebrow">Admin / manage gyms</p>
          <h1>Manage gyms</h1>
          <p>
            Add new gym workspaces, update gym details, and remove unused gyms when they no longer have assigned staff or members.
          </p>
          <div className="quick-actions">
            <Link className="button button-secondary" href="/admin">
              Back to admin
            </Link>
          </div>
        </div>
        <aside className="summary-panel">
          <div className="panel-title">
            <h2>
              <UsersRound /> Workspace count
            </h2>
            <span className="status-pill status-active">{gyms.length} gyms</span>
          </div>
          <div className="detail-window">
            <span>
              Active pilot
              <strong>Sri Shakti Hanuman Gym</strong>
            </span>
          </div>
        </aside>
      </section>

      <section className="content-grid">
        <AddGymForm />

        <div className="form-panel">
          <h2>How removal works</h2>
          <p className="member-meta">
            A gym can be removed only after staff and members are reassigned or deleted. This avoids orphaned logins and member records.
          </p>
          <p className="member-meta">
            Sri Shakti Hanuman Gym is protected as the active pilot gym.
          </p>
        </div>
      </section>

      <section className="list-panel" style={{ marginTop: 16 }}>
        <div className="panel-title">
          <h2>
            <Settings /> Existing gyms
          </h2>
        </div>
        <div className="activity-feed">
          {gyms.map((gym) => (
            <article className="form-panel" key={gym.id}>
              <div className="panel-title">
                <div>
                  <h2>{gym.name}</h2>
                  <p className="member-meta">Slug: {gym.slug} / ID: {gym.id}</p>
                </div>
                <span className={`status-pill ${gym.status === "active" ? "status-active" : "status-neutral"}`}>
                  {gym.status}
                </span>
              </div>

              <ConfirmActionForm
                action={updateGymDetails}
                confirmMessage={`Save updates for ${gym.name}?`}
                confirmTitle="Update gym?"
                pendingLabel="Saving..."
                submitLabel="Save gym"
              >
                <input name="gymId" type="hidden" value={gym.id} />
                <div className="form-grid">
                  <label>
                    Gym name
                    <input name="name" defaultValue={gym.name} required />
                  </label>
                  <label>
                    Location
                    <input name="location" defaultValue={gym.location} />
                  </label>
                  <label>
                    Contact phone
                    <input name="phone" defaultValue={gym.phone} inputMode="tel" />
                  </label>
                  <label>
                    Contact email
                    <input name="email" defaultValue={gym.email} type="email" />
                  </label>
                  <label>
                    Instagram
                    <input name="instagram" defaultValue={gym.instagram} />
                  </label>
                  <label>
                    LinkedIn
                    <input name="linkedin" defaultValue={gym.linkedin} />
                  </label>
                  <label>
                    YouTube
                    <input name="youtube" defaultValue={gym.youtube} />
                  </label>
                </div>
              </ConfirmActionForm>

              <div className="quick-actions">
                <Link className="button button-secondary" href={`/admin/gyms/${gym.id}`}>
                  Open details
                </Link>
                <ConfirmActionForm
                  action={deleteGymWorkspace}
                  confirmMessage={`Remove ${gym.name}? This is only allowed after staff and members are no longer assigned.`}
                  confirmTitle="Remove gym?"
                  pendingLabel="Removing..."
                  submitClassName="button button-secondary"
                  submitLabel="Remove gym"
                  style={{ background: "none", border: "none", padding: 0 }}
                >
                  <input name="gymId" type="hidden" value={gym.id} />
                  {gym.id === PRIMARY_GYM_ID ? (
                    <input disabled name="protectedGym" type="hidden" value="protected" />
                  ) : null}
                </ConfirmActionForm>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
