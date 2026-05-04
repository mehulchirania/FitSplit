"use client";

import { useState } from "react";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { assignProgramToMember } from "@/lib/firebase/actions";
import type { Member, WorkoutProgram } from "@/types/domain";

export function ProgramAssignmentForm({
  currentProgramId,
  member,
  programs
}: {
  currentProgramId?: string;
  member: Member;
  programs: WorkoutProgram[];
}) {
  const [selectedProgramId, setSelectedProgramId] = useState(
    currentProgramId ?? programs[0]?.id ?? ""
  );
  const selectedProgram =
    programs.find((program) => program.id === selectedProgramId) ?? programs[0];

  return (
    <ConfirmActionForm
      action={assignProgramToMember}
      className="form-panel"
      confirmMessage="This will replace the member's active workout assignment and notify them."
      confirmTitle="Assign this program?"
      pendingLabel="Assigning program..."
      submitLabel="Assign selected program"
    >
      <h2>Assign program</h2>
      <input name="memberId" type="hidden" value={member.id} />
      <input name="memberName" type="hidden" value={member.fullName} />
      <input name="programTitle" type="hidden" value={selectedProgram?.title ?? ""} />
      <label>
        Workout plan
        <select
          name="programId"
          onChange={(event) => setSelectedProgramId(event.target.value)}
          required
          value={selectedProgramId}
        >
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.title} - {program.days.length} days
            </option>
          ))}
        </select>
      </label>
      <p>
        Pick a plan from the catalog-backed workout templates. The assigned
        weekly schedule appears immediately on the member dashboard.
      </p>
    </ConfirmActionForm>
  );
}
