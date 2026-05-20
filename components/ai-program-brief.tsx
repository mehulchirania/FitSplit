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
  const [brief, setBrief] = useState(defaultGoal ?? "");

  return (
    <aside className="form-panel">
      <h2>AI program match</h2>
      <p className="eyebrow" style={{ marginBottom: 12, marginTop: -4 }}>Gemini-assisted saved-plan picker</p>
      <label>
        Training brief
        <textarea
          onChange={(e) => setBrief(e.target.value)}
          placeholder={`Describe ${memberName}'s goals, available days per week, any injuries or movement limitations, and preferred training style. The more specific, the better the program match.`}
          rows={5}
          value={brief}
        />
      </label>
      <ConfirmActionForm
        action={generateAndAssignProgram}
        className="inline-action-form"
        confirmMessage="Gemini will compare this brief with saved workout programs, choose the closest match, and assign it after you confirm."
        confirmTitle="Generate best program match?"
        pendingLabel="Generating..."
        submitLabel="Generate & assign match"
      >
        <input name="memberId" type="hidden" value={memberId} />
        <input name="memberName" type="hidden" value={memberName} />
        <input name="memberGoal" type="hidden" value={brief} />
      </ConfirmActionForm>
    </aside>
  );
}
