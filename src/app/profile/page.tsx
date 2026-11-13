import { BodyWeightLogger } from "@/components/body-weight-logger";
import { Breadcrumb } from "@/components/breadcrumb";
import { ProfileForm } from "@/components/profile-form";
import { ChangePinForm } from "@/components/change-pin-form";
import { ProgressiveOverloadChart } from "@/components/progressive-overload-chart";
import { MuscleRadarChart } from "@/components/muscle-radar-chart";
import { requireAuth } from "@/lib/auth";
import {
  getBodyMetricLogsForMember,
  getUserProfile,
  getLiftLogsForMember,
  getExerciseCatalog
} from "@/lib/firebase/read-models";
import { ProfileMetricsWidget } from "@/components/profile-metrics-widget";
import { AvatarUploader } from "@/components/avatar-uploader";
import { updateMemberAvatar } from "@/lib/firebase/actions";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const currentUser = await requireAuth();
  const uid = currentUser.uid;

  const [{ profile }, { liftLogs }, { exercises }, { logs: bodyMetricLogs }] = await Promise.all([
    getUserProfile(uid, currentUser.fullName),
    getLiftLogsForMember(uid),
    getExerciseCatalog(),
    getBodyMetricLogsForMember(uid)
  ]);

  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <Breadcrumb crumbs={[{ label: "Profile" }]} />
          <h1>Your profile</h1>
          <p>Keep your details and body metrics in one place. Only you can see them.</p>
        </div>
      </section>

      <section className="list-panel" style={{ marginBottom: 16 }}>
        <div className="panel-title">
          <h2>Profile photo</h2>
          <span className="status-pill status-neutral">Shown in the top bar</span>
        </div>
        <div className="form-panel" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <AvatarUploader
            action={updateMemberAvatar}
            currentUrl={profile.avatarUrl ?? currentUser.avatarUrl}
            name={profile.fullName}
            dataUrlField="avatarDataUrl"
            fields={{}}
          />
          <p style={{ color: "var(--text-soft)", fontSize: "0.85rem", margin: 0 }}>
            Upload a square photo. It appears on your profile menu.
          </p>
        </div>
      </section>

      <ProfileMetricsWidget profile={profile} />

      <ProfileForm profile={profile} />

      <BodyWeightLogger initialLogs={bodyMetricLogs} />

      <MuscleRadarChart liftLogs={liftLogs} exercises={exercises} />

      <ProgressiveOverloadChart liftLogs={liftLogs} exercises={exercises} />

      <section className="list-panel" style={{ marginTop: 16 }}>
        <div className="panel-title">
          <h2>Security</h2>
          <span className="status-pill status-neutral">Change PIN</span>
        </div>
        <div className="notification-list">
          <ChangePinForm />
        </div>
      </section>
    </main>
  );
}
