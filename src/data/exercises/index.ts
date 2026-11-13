import type { Exercise, MuscleGroup } from "@fitsplit/core";
import raw from "./exercises.json";

/** Record as imported from the MIT-licensed ExerciseDB-derived dataset. */
export type LibraryExercise = {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  secondaryMuscles: string[];
  category: string;
  instructions: string[];
};

const exercises = raw as LibraryExercise[];
const byId = new Map(exercises.map((e) => [e.id, e]));

export function getExercises(): readonly LibraryExercise[] {
  return exercises;
}

export function getExerciseById(id: string): LibraryExercise | undefined {
  return byId.get(id);
}

/** Capitalised display name ("barbell bench press" -> "Barbell bench press"). */
function displayName(e: LibraryExercise): string {
  return e.name.charAt(0).toUpperCase() + e.name.slice(1);
}

const BODY_PART_TO_MUSCLE_GROUP: Record<string, MuscleGroup> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  "upper legs": "Legs",
  "lower legs": "Legs",
  waist: "Core",
  cardio: "Cardio",
  "lower arms": "Forearms",
  neck: "Shoulders",
  "full body": "Cardio",
};

function toMuscleGroup(e: LibraryExercise): MuscleGroup {
  if (e.bodyPart === "upper arms") {
    return e.target === "triceps" ? "Triceps" : "Biceps";
  }
  return BODY_PART_TO_MUSCLE_GROUP[e.bodyPart] ?? "Core";
}

/** Map to the app's `Exercise` shape (no video/thumbnail: the dataset carries no media rights). */
export function toAppExercise(e: LibraryExercise): Exercise {
  return {
    id: `lib-${e.id}`,
    name: displayName(e),
    muscleGroup: toMuscleGroup(e),
    equipment: e.equipment,
    instructions: e.instructions.join("\n"),
    videoSource: "none",
    videoUrl: "",
    gymVideoUrl: "",
    gymVideoSource: "none",
    thumbnailUrl: "",
    ownerOnly: true, // findAlternative() only offers ownerOnly exercises as swap targets
    source: "predefined",
    muscleTargetDescription: [e.target, ...e.secondaryMuscles].join(", "),
  };
}
