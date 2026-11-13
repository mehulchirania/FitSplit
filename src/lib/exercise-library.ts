/**
 * Built-in exercise library and workout templates (the data every user starts with).
 *
 *   exercises / exerciseCatalogByMuscle  <- @fitsplit/core workouts.json (exercise_catalog)
 *   programs                             <- @fitsplit/core split library (workouts.json training_splits)
 *
 * No network or database is needed: this is plain static data, so a brand-new
 * user (and a local build without Firebase) always has a full library.
 */
import workoutsData from "@fitsplit/core/workouts.json";
import { getExerciseThumbnail } from "./exercise-thumbnails";
import { splitLibraryPrograms } from "./split-library";
import { getExerciseById, getExercises, toAppExercise } from "@/data/exercises";
import { freePlans } from "@/data/exercises/plans";
import type { Exercise, MuscleGroup, WorkoutProgram } from "@/types/domain";

type CatalogExercise = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  movementPattern: string;
  mechanic: string;
  muscle_target_description?: string;
  video_url?: string;
};

type RawSplit = {
  split_id: string;
  name: string;
  description: string;
  is_custom: boolean;
  schedule: Array<{
    day: number;
    title: string;
    workouts: Array<{
      exercise_id: string;
      sets: number;
      reps: string;
    }>;
  }>;
};

type WorkoutsJson = {
  exercise_catalog: Record<string, CatalogExercise[]>;
  training_splits: RawSplit[];
};

const workoutSource = workoutsData as WorkoutsJson;

export const muscleGroups = Object.keys(
  workoutSource.exercise_catalog
) as MuscleGroup[];

const muscleThumbnails: Record<string, string> = {
  Chest:
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=900&q=80",
  Back:
    "https://images.unsplash.com/photo-1603287681836-b174ce5074c2?auto=format&fit=crop&w=900&q=80",
  Legs:
    "https://images.unsplash.com/photo-1434682881908-b43d0467b798?auto=format&fit=crop&w=900&q=80",
  Shoulders:
    "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=900&q=80",
  Biceps:
    "https://images.unsplash.com/photo-1581009137042-c552e485697a?auto=format&fit=crop&w=900&q=80",
  Triceps:
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80"
};

function getCoachingNotes(name: string, mechanic: string, muscleGroup: string): string {
  const n = name.toLowerCase();
  if (n.includes("squat")) return "Keep chest up, drive through the heels, and maintain a neutral spine. Control the descent.";
  if (n.includes("deadlift")) return "Hinge at the hips, keep the bar close to your shins, and squeeze glutes at the top. Do not round your back.";
  if (n.includes("bench press")) return "Plant feet firmly, maintain a slight arch in your lower back, and lower the bar to your mid-chest.";
  if (n.includes("pull-up") || n.includes("pulldown")) return "Depress your shoulders first, then pull with your lats. Squeeze at the bottom.";
  if (n.includes("row")) return "Keep your torso stable. Pull your elbows back and squeeze your shoulder blades together.";
  if (n.includes("curl")) return "Keep elbows pinned to your sides. Focus on the squeeze at the top and control the eccentric.";
  if (n.includes("extension") && muscleGroup === "Triceps") return "Keep elbows tucked and stationary. Fully lock out at the bottom.";
  if (n.includes("press") && muscleGroup === "Shoulders") return "Press straight up, keeping your core tight. Don't overarch your lower back.";
  if (n.includes("lateral raise")) return "Lead with your elbows, pouring the pitcher at the top. Don't use momentum.";
  if (n.includes("leg press")) return "Don't lock your knees at the top. Push through your full foot.";
  
  return `Focus on the mind-muscle connection for the ${muscleGroup}. Control the weight on the way down and explode on the way up.`;
}

export const exercises: Exercise[] = Object.entries(workoutSource.exercise_catalog)
  .flatMap(([muscleGroup, catalogExercises]) =>
    catalogExercises.map((catalogExercise) => ({
      id: catalogExercise.id,
      name: catalogExercise.name,
      muscleGroup: muscleGroup as MuscleGroup,
      equipment: catalogExercise.equipment,
      movementPattern: catalogExercise.movementPattern,
      instructions: getCoachingNotes(catalogExercise.name, catalogExercise.mechanic, muscleGroup),
      videoSource: catalogExercise.video_url ? "youtube" as const : "none" as const,
      videoUrl: catalogExercise.video_url ?? "",
      gymVideoUrl: "",
      gymVideoSource: "none" as const,
      thumbnailUrl: getExerciseThumbnail(catalogExercise.name, muscleGroup as MuscleGroup),
      muscleTargetDescription: catalogExercise.muscle_target_description,
      ownerOnly: true
    }))
  ).concat([
    {
      id: "stretch-band-pulls",
      name: "Band Pull-Aparts",
      muscleGroup: "Shoulders",
      equipment: "band",
      movementPattern: "fly",
      instructions: "Hold band at chest height, pull apart, squeezing shoulder blades.",
      muscleTargetDescription: "A mobility move for the rear delts and mid-traps that opens the chest and warms up the shoulders.",
      videoSource: "none",
      videoUrl: "",
      gymVideoUrl: "",
      gymVideoSource: "none",
      thumbnailUrl: muscleThumbnails["Shoulders"],
      ownerOnly: false
    },
    {
      id: "stretch-cat-cow",
      name: "Cat-Cow Stretch",
      muscleGroup: "Back",
      equipment: "bodyweight",
      movementPattern: "spinal_flexion",
      instructions: "On all fours, arch back up, then dip back down slowly.",
      muscleTargetDescription: "A spinal mobility stretch that mobilises the spinal erectors and warms up the back through flexion and extension.",
      videoSource: "none",
      videoUrl: "",
      gymVideoUrl: "",
      gymVideoSource: "none",
      thumbnailUrl: muscleThumbnails["Back"],
      ownerOnly: false
    },
    {
      id: "stretch-quad",
      name: "Standing Quad Stretch",
      muscleGroup: "Legs",
      equipment: "bodyweight",
      movementPattern: "knee_flexion",
      instructions: "Stand on one leg, pull other foot to glutes, keep knees together.",
      muscleTargetDescription: "A static stretch for the quadriceps and hip flexors to improve flexibility after leg training.",
      videoSource: "none",
      videoUrl: "",
      gymVideoUrl: "",
      gymVideoSource: "none",
      thumbnailUrl: muscleThumbnails["Legs"],
      ownerOnly: false
    }
  ]);

export const exerciseCatalogByMuscle = muscleGroups.map((muscleGroup) => ({
  muscleGroup,
  exercises: exercises.filter((exerciseItem) => exerciseItem.muscleGroup === muscleGroup)
}));

const libId = (id: string) => `lib-${id}`;

/** Free plans from the imported dataset, as ordinary predefined programs. */
const freePrograms: WorkoutProgram[] = freePlans.map((plan) => ({
  id: plan.id,
  title: plan.title,
  description: plan.description,
  goal: plan.equipment,
  difficulty: plan.difficulty,
  daysPerWeek: plan.daysPerWeek,
  source: "predefined",
  splitType: "custom",
  days: plan.days.map((d) => ({
    ...d,
    exercises: d.exercises.map((e) => ({ ...e, exerciseId: libId(e.exerciseId) }))
  }))
}));

export const programs: WorkoutProgram[] = [...splitLibraryPrograms, ...freePrograms];

const planExerciseIds = new Set(freePrograms.flatMap((p) => p.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))));

/** Built-ins plus the imported exercises the free plans use: small enough for client props. */
export const catalogExercises: Exercise[] = [
  ...exercises,
  ...[...planExerciseIds].flatMap((id) => {
    const record = getExerciseById(id.slice(4));
    return record ? [toAppExercise(record)] : [];
  })
];

/** Name key that ignores case, punctuation, plurals and word order ("Close-Grip Press" == "close grip press"). */
const nameKey = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").map((t) => t.replace(/s$/, "")).sort().join(" ");

/**
 * The whole library to browse, one entry per exercise: built-ins first, then imported ones whose
 * name doesn't clash (plans still resolve their own copy through catalogExercises).
 * Server-only: never pass this to a client component.
 */
const fullLibrary: Exercise[] = (() => {
  const seen = new Set<string>();
  return [...exercises, ...getExercises().map(toAppExercise)].filter((e) => {
    const key = nameKey(e.name);
    return !seen.has(key) && seen.add(key);
  });
})();

export const libraryEquipment = [...new Set(fullLibrary.map((e) => e.equipment.toLowerCase()))].sort();

export const LIBRARY_PAGE_SIZE = 48;

export type LibraryQuery = { q?: string; muscleGroup?: string; equipment?: string; page?: number };

/** Search + filter the full library by name, muscle group and equipment, 48 per page. */
export function searchExerciseLibrary({ q = "", muscleGroup = "", equipment = "", page = 1 }: LibraryQuery) {
  const needle = q.trim().toLowerCase();
  const hits = fullLibrary.filter(
    (e) =>
      (!needle || e.name.toLowerCase().includes(needle)) &&
      (!muscleGroup || e.muscleGroup === muscleGroup) &&
      (!equipment || e.equipment.toLowerCase() === equipment)
  );
  const start = (Math.max(1, page) - 1) * LIBRARY_PAGE_SIZE;
  return { total: hits.length, results: hits.slice(start, start + LIBRARY_PAGE_SIZE) };
}
