import { exercises } from "@/lib/mock-data";
import type { WorkoutExercise } from "@/types/domain";
import { Video } from "./icons";

function getPrescription(item: WorkoutExercise) {
  if (item.durationSeconds) {
    return `${item.sets ?? 1} x ${item.durationSeconds}s`;
  }

  return `${item.sets ?? "-"} x ${item.reps ?? "-"}`;
}

export function ExerciseList({ items }: { items: WorkoutExercise[] }) {
  return (
    <div className="exercise-list">
      {items.map((item, index) => {
        const exercise = exercises.find((entry) => entry.id === item.exerciseId);

        if (!exercise) {
          return null;
        }

        return (
          <article className="exercise-row" key={`${exercise.id}-${index}`}>
            <div
              className="exercise-thumb"
              style={{ backgroundImage: `url(${exercise.thumbnailUrl})` }}
            />
            <div>
              <h3>{exercise.name}</h3>
              <p>{exercise.instructions}</p>
              <span className="member-meta">
                {exercise.muscleGroup} / {exercise.equipment} / {exercise.videoSource}
              </span>
            </div>
            <span className="exercise-prescription">
              <Video className="inline-icon" /> {getPrescription(item)}
            </span>
          </article>
        );
      })}
    </div>
  );
}
