import { ProfileForm } from "@/components/profile-form";
import { UsersRound } from "@/components/icons";

export default function ProfilePage() {
  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <p className="eyebrow">Profile</p>
          <h1>View Profile</h1>
          <p>
            Keep basic contact and body metrics in one place for owner review
            and future AI-assisted workout planning.
          </p>
        </div>
        <aside className="summary-panel">
          <div className="panel-title">
            <h2>
              <UsersRound /> Member profile
            </h2>
            <span className="status-pill status-neutral">Demo form</span>
          </div>
          <p>
            Height and weight are reactive here so BMI updates instantly while
            editing.
          </p>
        </aside>
      </section>

      <ProfileForm />
    </main>
  );
}
