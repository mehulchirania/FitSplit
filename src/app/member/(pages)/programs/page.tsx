import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import {
  getGymDetail,
  getWorkoutPrograms,
  getProgramAssignmentForMember,
} from "@/lib/firebase/read-models";
import { MemberProgramsClient } from "@/components/member-programs-client";

export const dynamic = "force-dynamic";

export default async function MemberProgramsPage() {
  const currentUser = await requireRole(["member"]);
  const memberId = currentUser.memberId ?? currentUser.uid;
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;

  const [{ programs }, { gym }, { assignment }] = await Promise.all([
    getWorkoutPrograms(gymId),
    getGymDetail(gymId),
    getProgramAssignmentForMember(memberId, gymId),
  ]);

  const gymShort = (gym?.name ?? "Gym").split(" · ")[0];

  return (
    <div className="m3d-subpage">
      <div className="m3d-subpage__head">
        <h1>Workout Programs</h1>
        <p>
        Browse all plans at {gym?.name ?? "your gym"}.
        {assignment ? " Your current plan is highlighted." : " No plan assigned yet."}
      </p>

      </div>

      <MemberProgramsClient
        programs={programs}
        assignedProgramId={assignment?.programId ?? null}
        gymName={gymShort}
      />
    </div>
  );
}
