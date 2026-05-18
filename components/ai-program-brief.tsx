"use client";

import { useState } from "react";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { generateAndAssignProgram } from "@/lib/firebase/actions";

export function AiProgramBrief({
  memberId,
  memberName,
  defaultGoal
}: {
  memberId: string;
  memberName: string;
  defaultGoal: string;
}) {
  const [brief, setBrief] = useState(
    `${defaultGoal}. 3 days per week. No injuries reported.`
  );

  return (
    <aside className="form-panel">
      <h2>AI program brief</h2>
      <label>
        Goals and constraints
        <textarea
          onChange={(e) => setBrief(e.target.value)}
          placeholder="E.g. Build strength, 3 days/week, no overhead press due to shoulder"
          rows={4}
          value={brief}
        />
      </label>
      <ConfirmActionForm
        action={generateAndAssignProgram}
        className="inline-action-form"
        confirmMessage="Gemini will review this brief against saved workout programs, pick the best fit, and assign it to the member."
        confirmTitle="Generate and assign program?"
        pendingLabel="Generating..."
        submitLabel="Generate & assign"
      >
        <input name="memberId" type="hidden" value={memberId} />
        <input name="memberName" type="hidden" value={memberName} />
        <input name="memberGoal" type="hidden" value={brief} />
      </ConfirmActionForm>
    </aside>
  );
}
