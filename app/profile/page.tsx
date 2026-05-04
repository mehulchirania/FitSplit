import { ProfileForm } from "@/components/profile-form";
import { UsersRound } from "@/components/icons";
import { getProfileMetrics, getLiftLogsForMember, getExerciseCatalog } from "@/lib/firebase/read-models";
import { ProgressiveOverloadChart } from "@/components/progressive-overload-chart";
import { ProfileAiSummary } from "@/components/profile-ai-summary";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const memberId = cookieStore.get("fitsplit-member-id")?.value || "member-aarav";
  
  const [
    { profile },
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
            <span className="status-pill status-active">Editable</span>
          </div>
          <p>
            Height and weight are reactive here so BMI updates instantly while
            editing.
          </p>
        </aside>
      </section>

      <ProfileForm memberId={memberId} profile={profile} />
      
      <ProgressiveOverloadChart liftLogs={liftLogs} exercises={exercises} />

      <ProfileAiSummary memberId={memberId} />
    </main>
  );
}
