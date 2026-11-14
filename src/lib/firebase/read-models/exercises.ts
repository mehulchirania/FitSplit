import type { Exercise, MuscleGroup } from "@/types/domain";

import {
  catalogExercises,
  exerciseCatalogByMuscle,
  libraryEquipment,
  muscleGroups,
  searchExerciseLibrary,
  type LibraryQuery
} from "@/lib/exercise-library";

type ExerciseCatalog = {
  exercises: Exercise[];
  catalog: Array<{ muscleGroup: MuscleGroup; exercises: Exercise[] }>;
};

/**
 * The exercise library the app ships to clients: built-ins plus the imported
 * exercises the free plans use. Static data, so no database is needed.
 */
export function getExerciseCatalog(): ExerciseCatalog {
  return { exercises: catalogExercises, catalog: exerciseCatalogByMuscle };
}

/** One page of the full ~1,300-exercise library, filtered. The full set stays on the server. */
export function getExerciseLibrary(query: LibraryQuery) {
  return { ...searchExerciseLibrary(query), muscleGroups, equipment: libraryEquipment };
}

