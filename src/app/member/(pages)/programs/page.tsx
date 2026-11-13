import { requireAuth } from "@/lib/auth";
import { getWorkoutPrograms, getProgramAssignmentForMember } from "@/lib/firebase/read-models";
import { MemberProgramsClient } from "@/components/member-programs-client";

export const dynamic = "force-dynamic";

export default async function MemberProgramsPage() {
  const currentUser = await requireAuth();

  const [{ programs }, { assignment }] = await Promise.all([
    getWorkoutPrograms(),
    getProgramAssignmentForMember(currentUser.uid),
  ]);

  return (
    <div className="m3d-subpage">
      <div className="m3d-subpage__head">
        <h1>Workout Programs</h1>
        <p>
          Pick a plan to follow, or build your own.
          {assignment ? " Your current plan is highlighted." : " You have not picked a plan yet."}
        </p>
      </div>

      <MemberProgramsClient
        programs={programs}
        assignedProgramId={assignment?.programId ?? null}
      />
    </div>
  );
}
