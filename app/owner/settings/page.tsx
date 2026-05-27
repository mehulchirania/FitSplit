import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { GymDetailsForm } from "@/components/gym-details-form";
import { GymLogoManager } from "@/components/gym-logo-manager";
import { GymNoticeManager } from "@/components/gym-notice-manager";
import { TrainerVisibilityForm } from "@/components/trainer-visibility-form";
import { requireRole } from "@/lib/auth";
import { updateGymLogo } from "@/lib/firebase/actions";
import { getGymDetail } from "@/lib/firebase/read-models";
import type { TrainerMemberVisibility } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function GymSettingsPage() {
  const currentUser = await requireRole(["owner"]);
  const gymId = currentUser.gymId;

  const { gym } = await getGymDetail(gymId);

  if (!gym) return notFound();

  const trainerVisibility: TrainerMemberVisibility =
    gym.trainerMemberVisibility ?? "assigned_only";

  return (
    <main className="page">
      <header className="page-header">
        <Breadcrumb crumbs={[{ label: "Owner", href: "/owner" }, { label: "Gym Settings" }]} />
        <p className="eyebrow">{gym.name}</p>
        <h1>Gym Settings</h1>
      </header>

      <div className="content-grid">
        <GymDetailsForm gym={gym} />

        <GymLogoManager
          action={updateGymLogo}
          currentLogoUrl={gym.logoUrl}
          gymId={gym.id}
          gymName={gym.name}
        />

        <TrainerVisibilityForm
          gymId={gym.id}
          current={trainerVisibility}
        />

        <div className="form-panel">
          <GymNoticeManager notices={gym.notices ?? []} />
        </div>
      </div>
    </main>
  );
}
