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
  const predefinedPrograms = programs.filter((program) => program.source !== "gym");
  const gymPrograms = programs.filter((program) => program.source === "gym");
  const selectedTrainingDays =
    selectedProgram?.days.filter((day) => day.exercises.length > 0) ?? [];

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
      <h2>{currentProgramId ? "Change program" : "Assign program"}</h2>
      <input name="memberId" type="hidden" value={member.id} />
      <input name="memberName" type="hidden" value={member.fullName} />
      <input name="programTitle" type="hidden" value={selectedProgram?.title ?? ""} />
      <label>
        Workout program
        <select
          name="programId"
          onChange={(event) => setSelectedProgramId(event.target.value)}
          required
          value={selectedProgramId}
        >
          {predefinedPrograms.length ? (
            <optgroup label="Predefined plans">
              {predefinedPrograms.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.title} - {program.days.length} sessions
                </option>
              ))}
            </optgroup>
          ) : null}
          {gymPrograms.length ? (
            <optgroup label="Saved gym plans">
              {gymPrograms.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.title} - {program.days.length} sessions
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </label>
      {selectedProgram ? (
        <div className="assignment-preview">
          <span className="status-pill status-neutral">
            {selectedProgram.source === "gym" ? "Saved gym plan" : "Predefined plan"}
          </span>
          <strong>{selectedProgram.title}</strong>
          <small>
            {selectedProgram.goal} · {selectedProgram.days.length} weekly sessions · {selectedProgram.difficulty}
          </small>
          <small>
            {selectedTrainingDays
              .slice(0, 3)
              .map((day) => day.title)
              .join(" / ")}
            {selectedTrainingDays.length > 3 ? " / ..." : ""}
          </small>
        </div>
      ) : null}
      <p>The selected weekly schedule appears immediately on the member dashboard after confirmation.</p>
    </ConfirmActionForm>
  );
}
