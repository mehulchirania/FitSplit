import workoutsData from "./workouts.json";
import type { Exercise, MuscleGroup } from "./domain";

type RawCatalogEntry = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment?: string;
  muscle_target_description?: string;
  video_url?: string;
  gym_video_url?: string;
  movementPattern?: string;
};

const rawCatalog = (workoutsData as { exercise_catalog: Record<string, RawCatalogEntry[]> }).exercise_catalog;

/**
 * The FitSplit default exercise catalog (from workouts.json), flattened and mapped
 * to the Exercise domain type. These predefined exercises are what split-library
 * programs and most lift logs reference — they are generated from code and NOT
 * stored in Firestore. Any client resolving an exercise name must merge these with
 * the gym-scoped `exerciseCatalog` collection (gym-custom entries win on id/name
 * collision), which is exactly what the web read-model does.
 */
export const defaultExerciseCatalog: Exercise[] = Object.values(rawCatalog)
  .flat()
  .map((entry) => {
    const videoUrl = String(entry.video_url ?? "");
    const gymVideoUrl = String(entry.gym_video_url ?? "");
    return {
      id: entry.id,
      name: entry.name,
      muscleGroup: entry.muscleGroup as MuscleGroup,
      equipment: String(entry.equipment ?? ""),
      instructions: "",
      videoSource: videoUrl ? "youtube" : "none",
      videoUrl,
      gymVideoUrl,
      gymVideoSource: gymVideoUrl ? "youtube" : "none",
      thumbnailUrl: "",
      ownerOnly: false,
      source: "predefined",
      muscleTargetDescription: entry.muscle_target_description,
      movementPattern: entry.movementPattern
    };
  });

/** id → name lookup over the default catalog, for cheap name resolution. */
export const defaultExerciseNameById: ReadonlyMap<string, string> = new Map(
  defaultExerciseCatalog.map((exercise) => [exercise.id, exercise.name])
);
