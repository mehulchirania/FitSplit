import type { Exercise, MuscleTargetId } from "@/types/domain";
import { getExerciseTargetSummary, getMuscleTargetLabel } from "@/lib/muscle-targets";

function TargetChip({
  id,
  kind
}: {
  id: MuscleTargetId;
  kind: "primary" | "secondary";
}) {
  return (
    <span className={`muscle-target-chip muscle-target-chip--${kind}`} title={id}>
      {getMuscleTargetLabel(id)}
    </span>
  );
}

export function MuscleTargetPills({
  exercise,
  compact = false,
  showDescription = false,
  emptyLabel,
}: {
  exercise: Exercise;
  compact?: boolean;
  showDescription?: boolean;
  emptyLabel?: string;
}) {
  const summary = getExerciseTargetSummary(exercise);
  const hasTargets = summary.primaryTargets.length > 0 || summary.secondaryTargets.length > 0;

  if (!hasTargets && !emptyLabel) return null;

  return (
    <div className={`muscle-target-block${compact ? " muscle-target-block--compact" : ""}`}>
      {hasTargets ? (
        <div className="muscle-target-chip-row">
          {summary.primaryTargets.map((id) => (
            <TargetChip id={id} key={`primary-${id}`} kind="primary" />
          ))}
          {summary.secondaryTargets.map((id) => (
            <TargetChip id={id} key={`secondary-${id}`} kind="secondary" />
          ))}
        </div>
      ) : (
        <span className="muscle-target-chip muscle-target-chip--missing">{emptyLabel}</span>
      )}
      {showDescription && summary.muscleTargetDescription ? (
        <p className="muscle-target-description">{summary.muscleTargetDescription}</p>
      ) : null}
    </div>
  );
}

