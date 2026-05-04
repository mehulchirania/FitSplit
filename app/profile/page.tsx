import { ProfileForm } from "@/components/profile-form";
import { UsersRound } from "@/components/icons";
import { getProfileMetrics, getLiftLogsForMember, getExerciseCatalog } from "@/lib/firebase/read-models";
import { ProgressiveOverloadChart } from "@/components/progressive-overload-chart";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const memberId = "member-aarav";
  
  const [
    { profile, isPersisted },
    { liftLogs },
    { exercises }
  ] = await Promise.all([
    getProfileMetrics(memberId),
    getLiftLogsForMember(memberId),
    getExerciseCatalog()
  ]);

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
            <span className={`status-pill ${isPersisted ? "status-active" : "status-neutral"}`}>
              {isPersisted ? "Firestore profile" : "Fallback profile"}
            </span>
          </div>
          <p>
            Height and weight are reactive here so BMI updates instantly while
            editing.
          </p>
        </aside>
      </section>

      <ProfileForm memberId={memberId} profile={profile} />
      
      <ProgressiveOverloadChart liftLogs={liftLogs} exercises={exercises} />
    </main>
  );
}
