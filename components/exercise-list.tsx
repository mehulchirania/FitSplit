import type { Exercise, WorkoutExercise } from "@/types/domain";
import { Video } from "./icons";

function getPrescription(item: WorkoutExercise) {
  if (item.durationSeconds) {
    return `${item.sets ?? 1} x ${item.durationSeconds}s`;
  }

  return `${item.sets ?? "-"} x ${item.reps ?? "-"}`;
}

function getSecondaryMuscles(exercise: Exercise) {
  const text = `${exercise.name} ${exercise.instructions}`.toLowerCase();
  const secondaryByPrimary: Record<string, string[]> = {
    Back: ["Biceps", "Rear delts", "Core"],
    Biceps: ["Forearms"],
    Cardio: ["Legs", "Core"],
    Chest: ["Triceps", "Shoulders"],
    Core: ["Hip flexors", "Lower back"],
    Legs: ["Glutes", "Hamstrings", "Core"],
    Shoulders: ["Triceps", "Upper traps"],
    Triceps: ["Chest", "Shoulders"]
  };

  if (text.includes("incline") && exercise.muscleGroup === "Chest") {
    return ["Upper chest", "Front delts", "Triceps"];
  }

  if (text.includes("deadlift")) {
    return ["Glutes", "Hamstrings", "Core"];
  }

  if (text.includes("squat") || text.includes("lunge") || text.includes("leg press")) {
    return ["Glutes", "Hamstrings", "Core"];
  }

  if (text.includes("row") || text.includes("pulldown") || text.includes("pull-up")) {
    return ["Biceps", "Rear delts", "Core"];
  }

  if (text.includes("press") && exercise.muscleGroup === "Shoulders") {
    return ["Triceps", "Upper chest"];
  }

  return secondaryByPrimary[exercise.muscleGroup] ?? [];
}

export function ExerciseList({
  exercises,
  items
}: {
  exercises: Exercise[];
  items: WorkoutExercise[];
}) {
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
              <div className="muscle-targets" aria-label={`${exercise.name} muscle targets`}>
                <span>Primary: {exercise.muscleGroup}</span>
                <span>Secondary: {getSecondaryMuscles(exercise).join(", ") || "Stabilizers"}</span>
              </div>
              <span className="member-meta">
                {[exercise.muscleGroup, exercise.equipment, exercise.videoSource]
                  .filter(v => v && v !== "none" && v !== "null")
                  .join(" / ")}
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
