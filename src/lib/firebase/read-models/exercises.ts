import type { Exercise, MuscleGroup } from "@/types/domain";

import {
  catalogExercises,
  exerciseCatalogByMuscle,
  findExercise,
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

/** Resolve exercise ids (any library) to full records, skipping unknown ids. */
export function getExercisesByIds(ids: Iterable<string>): Exercise[] {
  const seen = new Set<string>();
  const found: Exercise[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const exercise = findExercise(id);
    if (exercise) found.push(exercise);
  }
  return found;
}
