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

      <ProfileForm memberId={memberId} profile={profile} />
      
      <ProgressiveOverloadChart liftLogs={liftLogs} exercises={exercises} />

      <ProfileAiSummary memberId={memberId} />
    </main>
  );
}
