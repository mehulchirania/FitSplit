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

  if (programs.length === 0) {
    return (
      <div className="form-panel">
        <h2>Assign program</h2>
        <p style={{ color: "var(--text-soft)", marginBottom: 16 }}>
          No workout programs exist for this gym yet. Create a program first, then return here to assign it.
        </p>
        <a className="button button-primary" href="/owner/programs">
          Go to programs
        </a>
      </div>
    );
  }

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
      <input name="programId" type="hidden" value={selectedProgramId} />
      <div className="assignment-options" role="radiogroup" aria-label="Workout plans">
        {programs.map((program) => (
          <button
            aria-checked={selectedProgramId === program.id}
            className={selectedProgramId === program.id ? "assignment-option is-selected" : "assignment-option"}
            key={program.id}
            onClick={() => setSelectedProgramId(program.id)}
            role="radio"
            type="button"
          >
            <span className="status-pill status-neutral">{program.days.length} sessions</span>
            <strong>{program.title}</strong>
            <small>{program.goal}</small>
          </button>
        ))}
      </div>
      <p>The selected weekly schedule appears immediately on the member dashboard.</p>
    </ConfirmActionForm>
  );
}
