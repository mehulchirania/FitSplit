import { notFound } from "next/navigation";
import { GymDetailsForm } from "@/components/gym-details-form";
import { GymLogoManager } from "@/components/gym-logo-manager";
import { GymNoticeManager } from "@/components/gym-notice-manager";
import { TrainerVisibilityForm } from "@/components/trainer-visibility-form";
import { requireOwnerPage } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import { updateGymLogo } from "@/lib/firebase/actions";
import { getGymDetail } from "@/lib/firebase/read-models";
import type { TrainerMemberVisibility } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function GymSettingsPage() {
  const currentUser = await requireOwnerPage();
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;

  const { gym } = await getGymDetail(gymId);

  if (!gym) return notFound();

  const trainerVisibility: TrainerMemberVisibility =
    gym.trainerMemberVisibility ?? "assigned_only";

  return (
    <div className="odp2-scroll">
      <div className="adm-page-head">
        <div>
          <div className="adm-crumb">Dashboard / Settings</div>
          <h1 className="adm-title">Gym settings</h1>
        </div>
      </div>
      <p className="adm-page-desc">Manage gym details, logo, trainer visibility, and member-facing notices.</p>

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
    </div>
  );
}
