import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Exercise, ExerciseRequest, MuscleGroup } from "@/types/domain";

import {
  exerciseCatalogByMuscle as mockExerciseCatalogByMuscle,
  exercises as mockExercises
} from "@/lib/mock-data";
import { getExerciseThumbnail, isGenericExerciseThumbnail } from "@/lib/exercise-thumbnails";
import { collectionPaths, gymScopedCollectionPaths, PRIMARY_GYM_ID } from "../collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "../admin";
import { gymCollection, gymTag } from "./shared";

export async function getExerciseCatalogUncached(gymId?: string): Promise<{
  exercises: Exercise[];
  catalog: Array<{ muscleGroup: MuscleGroup; exercises: Exercise[] }>;
  isPersisted: boolean;
}> {
  const targetGymId = gymId ?? PRIMARY_GYM_ID;

  if (!hasFirebaseAdminConfig()) {
    return {
      exercises: mockExercises,
      catalog: mockExerciseCatalogByMuscle,
      isPersisted: false
    };
  }

  let snapshot;

  try {
    const { db } = getFirebaseAdminServices();
    const scopedSnapshot = await gymCollection(db, targetGymId, "exerciseCatalog")
      .where("isActive", "==", true)
      .get();
    snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.exerciseCatalog)
          .where("gymId", "==", targetGymId)
          .where("isActive", "==", true)
          .get()
      : scopedSnapshot;
  } catch {
    return {
      exercises: mockExercises,
      catalog: mockExerciseCatalogByMuscle,
      isPersisted: false
    };
  }

  const defaultExercisesById = new Map<string, Exercise>();
  const defaultExercisesByName = new Map<string, Exercise>();
  mockExercises.forEach((exercise) => defaultExercisesById.set(exercise.id, exercise));
  mockExercises.forEach((exercise) => defaultExercisesByName.set(exercise.name.toLowerCase().trim(), exercise));

  const persistedExercises: Array<Exercise & { skipDefaultOverride?: boolean }> = snapshot.docs.map((doc) => {
    const data = doc.data();
    const defaultExercise = defaultExercisesById.get(doc.id) || defaultExercisesByName.get(String(data.name ?? "").toLowerCase().trim());
    const hasDefaultExercise = Boolean(defaultExercise);
    const isMirroredDefault = data.mirroredFromRootCollection === true && data.scope !== "custom";
    const persistedVideoUrl = String(data.videoUrl ?? "").trim();
    const videoUrl = persistedVideoUrl || defaultExercise?.videoUrl || "";
    const persistedVideoSource = String(data.videoSource ?? "").trim() as Exercise["videoSource"];
    const gymVideoUrl = String(data.gymVideoUrl ?? "").trim();
    const persistedGymVideoSource = String(data.gymVideoSource ?? "").trim() as Exercise["gymVideoSource"];
    const muscleGroup = String(data.muscleGroup ?? "Chest") as MuscleGroup;
    const storedThumbnailUrl = String(data.thumbnailUrl ?? "").trim();
    return {
      id: doc.id,
      name: String(data.name),
      muscleGroup,
      equipment: String(data.equipment ?? ""),
      instructions: String(data.instructions ?? ""),
      videoSource: videoUrl ? (persistedVideoSource === "none" ? "youtube" : persistedVideoSource || "youtube") : "none",
      videoUrl,
      gymVideoUrl,
      gymVideoSource: gymVideoUrl ? (persistedGymVideoSource === "none" ? "youtube" : persistedGymVideoSource || "youtube") : "none",
      thumbnailUrl: isGenericExerciseThumbnail(storedThumbnailUrl)
        ? getExerciseThumbnail(String(data.name), muscleGroup)
        : storedThumbnailUrl,
      ownerOnly: true,
      source: hasDefaultExercise ? "predefined" : "custom",
      showTutorial: data.showTutorial !== false,
      skipDefaultOverride: isMirroredDefault && hasDefaultExercise
    };
  });

  // Merge mock + persisted exercises. Use name-based deduplication so that
  // exercises added via createCatalogExercise don't appear twice alongside the
  // same entry from workouts.json (which uses stable slug IDs, not UUIDs).
  // Firebase-persisted version wins when names collide (it may have custom video/notes).
  // Mock exercises never carry gym-specific demo videos — strip gymVideoUrl so one
  // gym's demo footage is never visible to another gym's users.
  const exercisesByName = new Map<string, Exercise>();
  mockExercises.forEach((ex) => exercisesByName.set(ex.name.toLowerCase().trim(), { ...ex, gymVideoUrl: "", gymVideoSource: "none", source: "predefined" as const, showTutorial: true }));
  persistedExercises.forEach((ex) => {
    if (ex.skipDefaultOverride && exercisesByName.has(ex.name.toLowerCase().trim())) {
      return;
    }
    const { skipDefaultOverride: _skipDefaultOverride, ...cleanExercise } = ex;
    exercisesByName.set(ex.name.toLowerCase().trim(), cleanExercise);
  });
  const allExercises = Array.from(exercisesByName.values()).sort((left, right) =>
    left.name.localeCompare(right.name)
  );
  const muscleGroups = Array.from(
    new Set(allExercises.map((exercise) => exercise.muscleGroup))
  );

  return {
    exercises: allExercises,
    catalog: muscleGroups.map((muscleGroup) => ({
      muscleGroup,
      exercises: allExercises.filter((exercise) => exercise.muscleGroup === muscleGroup)
    })),
    isPersisted: true
  };
}

export async function getExerciseCatalog(gymId?: string) {
  return unstable_cache(
    getExerciseCatalogRequestCached,
    ["read:getExerciseCatalog", gymId ?? "default"],
    { tags: ["exercises", gymTag(gymId, "exercises")], revalidate: 300 }
  )(gymId);
}

const getExerciseCatalogRequestCached = cache(getExerciseCatalogUncached);

export const getPendingExerciseRequests = cache(async function getPendingExerciseRequests(): Promise<{
  requests: ExerciseRequest[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return { requests: [], isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const scopedSnapshot = await db
      .collectionGroup(gymScopedCollectionPaths.exerciseRequests)
      .where("status", "==", "pending")
      .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.exerciseRequests)
          .where("status", "==", "pending")
          .get()
      : scopedSnapshot;

    const requests: ExerciseRequest[] = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          gymId: String(data.gymId ?? ""),
          gymName: data.gymName ? String(data.gymName) : undefined,
          requestedBy: String(data.requestedBy ?? ""),
          name: String(data.name ?? ""),
          muscleGroup: String(data.muscleGroup ?? ""),
          equipment: data.equipment ? String(data.equipment) : undefined,
          instructions: data.instructions ? String(data.instructions) : undefined,
          status: "pending" as const,
          createdAt: String(data.createdAt ?? new Date().toISOString()),
          updatedAt: data.updatedAt ? String(data.updatedAt) : undefined
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { requests, isPersisted: true };
  } catch {
    return { requests: [], isPersisted: false };
  }
});
