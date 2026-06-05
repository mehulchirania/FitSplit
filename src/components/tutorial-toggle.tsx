"use client";

import { useOptimistic, useTransition } from "react";
import type { FormActionState } from "@/types/action-state";

type ToggleAction = (prev: FormActionState, formData: FormData) => Promise<FormActionState>;

// ── Per-exercise toggle ──────────────────────────────────────────────────────

export function TutorialToggleButton({
  exerciseId,
  showTutorial,
  action,
}: {
  exerciseId: string;
  showTutorial: boolean;
  action: ToggleAction;
}) {
  const [optimistic, setOptimistic] = useOptimistic(showTutorial);
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    // Don't let the click bubble up to the parent <summary> which would toggle
    // the exercise edit <details> panel.
    e.stopPropagation();
    e.preventDefault();

    const next = !optimistic;
    startTransition(async () => {
      setOptimistic(next);
      const fd = new FormData();
      fd.append("exerciseId", exerciseId);
      fd.append("showTutorial", String(next));
      await action({} as FormActionState, fd);
    });
  }

  return (
    <button
      aria-label={optimistic ? "Hide tutorial from members" : "Show tutorial to members"}
      className={`tutorial-toggle-btn${optimistic ? " is-on" : " is-off"}${isPending ? " is-pending" : ""}`}
      onClick={handleClick}
      title={optimistic ? "Tutorial visible to members — click to hide" : "Tutorial hidden from members — click to show"}
      type="button"
    >
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
      <span className="toggle-label">Tutorial</span>
    </button>
  );
}

// ── Per-muscle-group master toggle ───────────────────────────────────────────

export function MuscleGroupTutorialToggle({
  exerciseIds,
  allOn,
  action,
}: {
  /** All exercise IDs in this muscle group. */
  exerciseIds: string[];
  /** True when every exercise in the group has showTutorial !== false. */
  allOn: boolean;
  action: ToggleAction;
}) {
  const [optimisticAllOn, setOptimistic] = useOptimistic(allOn);
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    const next = !optimisticAllOn;
    startTransition(async () => {
      setOptimistic(next);
      const fd = new FormData();
      fd.append("exerciseIds", exerciseIds.join(","));
      fd.append("showTutorial", String(next));
      await action({} as FormActionState, fd);
    });
  }

  return (
    <button
      aria-label={optimisticAllOn ? "Hide all tutorials in this group" : "Show all tutorials in this group"}
      className={`group-tutorial-toggle${optimisticAllOn ? " is-on" : " is-off"}${isPending ? " is-pending" : ""}`}
      onClick={handleClick}
      title={optimisticAllOn ? "All tutorials on — click to hide for this group" : "Some tutorials hidden — click to enable all"}
      type="button"
    >
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
      <span className="toggle-label">{optimisticAllOn ? "Tutorials on" : "Tutorials off"}</span>
    </button>
  );
}
