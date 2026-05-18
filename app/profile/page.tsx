import { ProfileForm } from "@/components/profile-form";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { requireAuth } from "@/lib/auth";
import { getProfileMetrics, getLiftLogsForMember, getExerciseCatalog, getGymDetail, getOwnersForGym } from "@/lib/firebase/read-models";
import { ProgressiveOverloadChart } from "@/components/progressive-overload-chart";
import { ProfileAiSummary } from "@/components/profile-ai-summary";
import { changeMemberPin, changeStaffPassword } from "@/lib/firebase/actions";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const currentUser = await requireAuth();

  const passwordChangeForm = (
    <section className="list-panel" style={{ marginTop: 16 }}>
      <div className="panel-title">
        <h2>Security</h2>
        <span className="status-pill status-neutral">Change password</span>
      </div>
      <div className="notification-list">
        <ConfirmActionForm
          action={changeStaffPassword}
          className="form-panel"
          confirmMessage="This will update your login password immediately."
          confirmTitle="Change password?"
          pendingLabel="Updating password..."
          submitLabel="Change password"
        >
          <div className="form-grid">
            <label>
              New password
              <input autoComplete="new-password" minLength={6} name="newPassword" placeholder="At least 6 characters" required type="password" />
            </label>
            <label>
              Confirm new password
              <input autoComplete="new-password" minLength={6} name="confirmPassword" placeholder="Repeat new password" required type="password" />
            </label>
          </div>
        </ConfirmActionForm>
      </div>
    </section>
  );

  if (currentUser.role === "admin") {
    return (
      <main className="page">
        <section className="dashboard-header compact-header">
          <div className="header-copy">
            <p className="eyebrow">Profile</p>
            <h1>{currentUser.fullName}</h1>
            <p>You are logged in as the FitSplit platform administrator.</p>
          </div>
          <aside className="summary-panel">
            <div className="detail-window">
              <span>Email<strong>{currentUser.email}</strong></span>
              <span>Role<strong>Admin</strong></span>
              <span>User ID<strong style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>{currentUser.uid}</strong></span>
            </div>
          </aside>
        </section>
        {passwordChangeForm}
      </main>
    );
  }

  if (currentUser.role === "owner") {
    const { gym } = await getGymDetail(currentUser.gymId);
    return (
      <main className="page">
        <section className="dashboard-header compact-header">
          <div className="header-copy">
            <p className="eyebrow">Profile</p>
            <h1>{currentUser.fullName}</h1>
            <p>Gym staff profile for {gym?.name ?? "your gym"}.</p>
          </div>
          <aside className="summary-panel">
            <div className="detail-window">
              <span>Email<strong>{currentUser.email}</strong></span>
              <span>Role<strong>Gym Staff</strong></span>
              <span>Gym<strong>{gym?.name ?? currentUser.gymId}</strong></span>
              <span>User ID<strong style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>{currentUser.uid}</strong></span>
            </div>
          </aside>
        </section>
        {passwordChangeForm}
      </main>
    );
  }

  // Member profile — full view
  const memberId = currentUser.memberId ?? currentUser.uid;
  const [{ profile }, { liftLogs }, { exercises }, { owners }] = await Promise.all([
    getProfileMetrics(memberId),
    getLiftLogsForMember(memberId),
    getExerciseCatalog(),
    getOwnersForGym(currentUser.gymId)
  ]);
  const trainers = owners.filter((o) => o.staffType === "trainer" || o.staffType === "owner");

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
        <aside className="ui-cards" style={{ alignContent: "start", height: "fit-content", gap: 15 }}>
          <article className="ui-card purple">
            <p className="tip" style={{ fontSize: "1.2em" }}>
              {profile.weightKg ? `${profile.weightKg} kg` : "N/A"}
            </p>
            <p className="second-text">Current Weight</p>
          </article>
          <article className="ui-card red">
            <p className="tip" style={{ fontSize: "1.2em" }}>
              {profile.heightCm ? `${profile.heightCm} cm` : "N/A"}
            </p>
            <p className="second-text">Current Height</p>
          </article>
        </aside>
      </section>

      <ProfileForm memberId={memberId} profile={profile} trainers={trainers} />

      <section className="list-panel" style={{ marginTop: 16 }}>
        <div className="panel-title">
          <h2>Security</h2>
          <span className="status-pill status-neutral">Change PIN</span>
        </div>
        <div className="notification-list">
          <ConfirmActionForm
            action={changeMemberPin}
            className="form-panel"
            confirmMessage="This will update your 4-digit login PIN."
            confirmTitle="Change PIN?"
            pendingLabel="Updating PIN..."
            submitLabel="Change PIN"
          >
            <div className="form-grid">
              <label>
                Current PIN
                <input inputMode="numeric" maxLength={4} minLength={4} name="currentPin" pattern="\d{4}" placeholder="Current 4-digit PIN" required type="password" />
              </label>
              <label>
                New PIN
                <input inputMode="numeric" maxLength={4} minLength={4} name="newPin" pattern="\d{4}" placeholder="New 4-digit PIN" required type="password" />
              </label>
              <label>
                Confirm New PIN
                <input inputMode="numeric" maxLength={4} minLength={4} name="confirmPin" pattern="\d{4}" placeholder="Repeat new PIN" required type="password" />
              </label>
            </div>
          </ConfirmActionForm>
        </div>
      </section>

      <ProgressiveOverloadChart liftLogs={liftLogs} exercises={exercises} />

      <ProfileAiSummary memberId={memberId} />
    </main>
  );
}
