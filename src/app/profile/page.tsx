import { BodyWeightLogger } from "@/components/body-weight-logger";
import { Breadcrumb } from "@/components/breadcrumb";
import { ProfileForm } from "@/components/profile-form";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { ProgressiveOverloadChart } from "@/components/progressive-overload-chart";
import { MuscleRadarChart } from "@/components/muscle-radar-chart";
import { requireAuth } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import {
  getBodyMetricLogsForMember,
  getProfileMetrics,
  getLiftLogsForMember,
  getExerciseCatalog,
  getGymDetail,
  getGymWorkspaces,
  getOwnersForGym
} from "@/lib/firebase/read-models";
import { ProfileMetricsWidget } from "@/components/profile-metrics-widget";
import { AvatarUploader } from "@/components/avatar-uploader";
import { changeMemberPin, changeStaffPassword, changeAdminEmail, updateAdminDisplayName, updateStaffImage } from "@/lib/firebase/actions";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams
}: {
  searchParams?: Promise<{ forceChange?: string }>;
}) {
  const currentUser = await requireAuth();
  const params = (await searchParams) ?? {};
  const forceChange = params.forceChange === "1" || currentUser.mustChangePassword === true;

  const forceChangeBanner = forceChange ? (
    <section
      className="form-panel"
      style={{
        background: "color-mix(in srgb, var(--warning, #f5b945) 14%, transparent)",
        border: "1px solid color-mix(in srgb, var(--warning, #f5b945) 40%, var(--border))",
        marginBottom: 16
      }}
    >
      <h2 style={{ margin: 0, fontSize: "1rem" }}>Change your password to continue</h2>
      <p style={{ margin: "6px 0 0", fontSize: "0.88rem", color: "var(--text-soft)" }}>
        Your account is using the default password <code>password</code>. Please choose a new password
        below before using the rest of the app. You&apos;ll be redirected here on every page until this
        is done.
      </p>
    </section>
  ) : null;

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
    const { gyms } = await getGymWorkspaces();
    const initials = currentUser.fullName
      .split(" ")
      .map((p: string) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const shortUid = `${currentUser.uid.slice(0, 12)}…`;

    return (
      <main className="page">
        <section className="dashboard-header compact-header">
          <div className="header-copy">
            <Breadcrumb crumbs={[{ label: "Profile" }]} />
            <h1>Admin account</h1>
            <p>Platform-level administrator. Manages all gym workspaces and staff access.</p>
          </div>
        </section>

        {forceChangeBanner}

        {/* Profile card */}
        <div className="profile-card-admin">
          <div className="profile-avatar-lg">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: "1.2rem" }}>{currentUser.fullName}</h2>
            <p style={{ color: "var(--text-soft)", fontSize: "0.85rem", margin: "4px 0 8px" }}>
              {currentUser.email}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="status-pill status-active">Platform Admin</span>
              <span className="status-pill status-neutral">{gyms.length} gym{gyms.length !== 1 ? "s" : ""} managed</span>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontSize: "0.72rem", color: "var(--text-faint)", fontFamily: "monospace", margin: 0 }}>
              UID
            </p>
            <p
              style={{
                fontSize: "0.72rem",
                color: "var(--text-soft)",
                fontFamily: "monospace",
                margin: "2px 0 0",
                maxWidth: 160,
                wordBreak: "break-all"
              }}
              title={currentUser.uid}
            >
              {shortUid}
            </p>
          </div>
        </div>

        <div className="content-grid" style={{ marginTop: 16 }}>
          {/* Display name */}
          <section className="list-panel">
            <div className="panel-title">
              <h2>Display name</h2>
            </div>
            <div className="notification-list">
              <ConfirmActionForm
                action={updateAdminDisplayName}
                className="form-panel"
                confirmMessage="Update your display name?"
                confirmTitle="Change display name?"
                pendingLabel="Updating..."
                submitLabel="Update name"
              >
                <label>
                  Full name
                  <input defaultValue={currentUser.fullName} name="displayName" placeholder="Your name" required />
                </label>
              </ConfirmActionForm>
            </div>
          </section>

          {/* Change email */}
          <section className="list-panel">
            <div className="panel-title">
              <h2>Email address</h2>
            </div>
            <div className="notification-list">
              <ConfirmActionForm
                action={changeAdminEmail}
                className="form-panel"
                confirmMessage="This changes your login email immediately. You will need to log in again."
                confirmTitle="Change login email?"
                pendingLabel="Updating..."
                submitLabel="Change email"
              >
                <div className="form-grid">
                  <label>
                    New email address
                    <input name="newEmail" placeholder="new@email.com" required type="email" />
                  </label>
                  <label>
                    Confirm new email
                    <input name="confirmEmail" placeholder="Repeat email address" required type="email" />
                  </label>
                </div>
              </ConfirmActionForm>
            </div>
          </section>
        </div>

        {/* Password change */}
        <section className="list-panel" style={{ marginTop: 16 }}>
          <div className="panel-title">
            <h2>Security</h2>
            <span className="status-pill status-neutral">Change password</span>
          </div>
          <div className="notification-list">
            <ConfirmActionForm
              action={changeStaffPassword}
              className="form-panel"
              confirmMessage="This updates your login password immediately."
              confirmTitle="Change password?"
              pendingLabel="Updating..."
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
      </main>
    );
  }

  if (currentUser.role === "owner") {
    const { gym } = await getGymDetail(currentUser.gymId ?? PRIMARY_GYM_ID);
    return (
      <main className="page">
        <section className="dashboard-header compact-header">
          <div className="header-copy">
            <Breadcrumb crumbs={[{ label: "Profile" }]} />
            <h1>{currentUser.fullName}</h1>
            <p>Gym staff profile for {gym?.name ?? "your gym"}.</p>
          </div>
          <aside className="summary-panel">
            <div className="detail-window">
              <span>Email<strong>{currentUser.email}</strong></span>
              <span>Role<strong style={{ textTransform: "capitalize" }}>{currentUser.staffType ?? "Owner"}</strong></span>
              <span>Gym<strong>{gym?.name ?? currentUser.gymId}</strong></span>
              <span>User ID<strong style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>{currentUser.uid}</strong></span>
            </div>
          </aside>
        </section>
        {forceChangeBanner}

        <section className="list-panel" style={{ marginTop: 16 }}>
          <div className="panel-title">
            <h2>Profile photo</h2>
            <span className="status-pill status-neutral">Shown in the top bar</span>
          </div>
          <div className="form-panel" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <AvatarUploader
              action={updateStaffImage}
              currentUrl={currentUser.avatarUrl}
              name={currentUser.fullName}
              dataUrlField="imageDataUrl"
              fields={{ userId: currentUser.uid, gymId: currentUser.gymId ?? PRIMARY_GYM_ID }}
            />
            <p style={{ color: "var(--text-soft)", fontSize: "0.85rem", margin: 0 }}>
              Upload a square photo. It appears on your profile menu and across the gym workspace.
            </p>
          </div>
        </section>

        {passwordChangeForm}
      </main>
    );
  }

  // Member profile — full view
  const memberId = currentUser.memberId ?? currentUser.uid;
  const [{ profile }, { liftLogs }, { exercises }, { owners }, { logs: bodyMetricLogs }] = await Promise.all([
    getProfileMetrics(memberId),
    getLiftLogsForMember(memberId, currentUser.gymId),
    getExerciseCatalog(currentUser.gymId),
    getOwnersForGym(currentUser.gymId),
    getBodyMetricLogsForMember(memberId)
  ]);
  const trainers = owners.filter((o) => o.staffType === "trainer" || o.staffType === "owner");

  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <Breadcrumb crumbs={[{ label: "Profile" }]} />
          <h1>Your profile</h1>
          <p>
            Keep basic contact and body metrics in one place for owner review
            and future AI-assisted workout planning.
          </p>
        </div>
      </section>

      <ProfileMetricsWidget profile={profile} />

      <ProfileForm memberId={memberId} profile={profile} trainers={trainers} isReadOnlyTrainer={true} />



      <BodyWeightLogger initialLogs={bodyMetricLogs} memberId={memberId} />

      <MuscleRadarChart liftLogs={liftLogs} exercises={exercises} />

      <ProgressiveOverloadChart liftLogs={liftLogs} exercises={exercises} />

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
    </main>
  );
}
