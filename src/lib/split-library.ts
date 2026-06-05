import splitLibrarySource from "./split-library-source.json";
import workoutsData from "./workouts.json";
import type { Difficulty, WorkoutDay, WorkoutExercise, WorkoutProgram } from "@/types/domain";

type Level = "beginner" | "intermediate" | "advanced";

type RawSplitEntry = {
  name: string;
  description: string;
  workouts: string[] | Record<string, string[]>;
};

type RawSplitLibrary = Record<Level, Record<string, RawSplitEntry>>;

type CatalogExercise = {
  id: string;
  name: string;
};

type WorkoutsJson = {
  exercise_catalog: Record<string, CatalogExercise[]>;
};

const source = splitLibrarySource as RawSplitLibrary;
const workoutSource = workoutsData as WorkoutsJson;

const splitIdBySlug: Record<string, string> = {
  arnold_split: "split_04",
  bro_split: "split_03",
  ppl_upper_lower: "split_02",
  push_pull_legs: "split_01"
};

const splitTypeBySlug: Record<string, WorkoutProgram["splitType"]> = {
  arnold_split: "combo_x2",
  bro_split: "bro_split",
  ppl_upper_lower: "ppl_upper_lower",
  push_pull_legs: "ppl_x2"
};

const splitBestFor: Record<string, string[]> = {
  arnold_split: ["Advanced hypertrophy", "High-volume bodybuilding", "Members with strong recovery"],
  bro_split: ["Bodybuilding focus", "Simple muscle-group scheduling", "Members who like one focus per day"],
  conjugate_method: ["Powerlifting", "Advanced strength cycles", "Members coached closely by trainers"],
  daily_undulating_periodization: ["Strength plus hypertrophy", "Members who need rep-range variety", "Advanced progression"],
  full_body: ["New members", "2-4 day attendance", "Technique practice"],
  minimalist_split: ["Busy members", "Low-time training", "Compound lift focus"],
  phat: ["Advanced muscle gain", "Strength and volume mix", "High training tolerance"],
  phul: ["Intermediate strength", "Upper/lower routine lovers", "Power plus hypertrophy"],
  ppl_upper_lower: ["Muscle gain", "5-day weekly structure", "Balanced frequency"],
  push_pull_legs: ["Hypertrophy", "6-day training", "Clear equipment flow"],
  upper_lower: ["Beginners moving to structure", "4-day training", "Balanced recovery"]
};

const splitTags: Record<string, string[]> = {
  arnold_split: ["6 day", "high volume", "bodybuilding"],
  bro_split: ["5 day", "bodybuilding", "simple"],
  conjugate_method: ["4 day", "powerlifting", "advanced"],
  daily_undulating_periodization: ["3 day", "periodized", "strength"],
  full_body: ["3 day", "beginner", "full body"],
  minimalist_split: ["3 day", "low volume", "compound"],
  phat: ["5 day", "advanced", "hypertrophy"],
  phul: ["4 day", "strength", "hypertrophy"],
  ppl_upper_lower: ["5 day", "hybrid", "muscle gain"],
  push_pull_legs: ["6 day", "ppl", "hypertrophy"],
  upper_lower: ["4 day", "upper lower", "balanced"]
};

const dayOrderBySlug: Record<string, string[]> = {
  arnold_split: ["chest_back", "shoulders_arms", "legs", "chest_back", "shoulders_arms", "legs"],
  conjugate_method: ["max_effort_upper", "max_effort_lower", "dynamic_effort_upper", "dynamic_effort_lower"],
  daily_undulating_periodization: ["strength_day", "hypertrophy_day", "endurance_volume_day"],
  phat: ["upper_power", "lower_power", "back_shoulders_hypertrophy", "chest_arms_hypertrophy", "legs_hypertrophy"],
  phul: ["upper_power", "lower_power", "upper_hypertrophy", "lower_hypertrophy"],
  ppl_upper_lower: ["push", "pull", "legs", "upper", "lower"],
  push_pull_legs: ["push", "pull", "legs", "push", "pull", "legs"],
  upper_lower: ["upper", "lower", "upper", "lower"]
};

const exerciseAliases: Record<string, string> = {
  "bench press": "Barbell Bench Press",
  "bulgarian split squat": "Bulgarian Split Squats",
  "calf raise": "Standing Calf Raises",
  "cable curl": "Cable Bicep Curl",
  "cable fly": "Cable Crossover",
  "chin-up": "Chin-Ups",
  "close-grip bench press": "Close Grip Bench Press",
  "core work": "Cable Crunch",
  "crunches": "Cable Crunch",
  "deadlift": "Romanian Deadlift",
  "decline bench press": "Decline Barbell Press",
  "dips": "Tricep Dips",
  "dumbbell curl": "Incline Dumbbell Curl",
  "dumbbell fly": "Pec Deck Fly",
  "dumbbell press": "Machine Chest Press",
  "dumbbell shoulder press": "Overhead Press",
  "floor press": "Barbell Bench Press",
  "glute bridge": "Hip Thrust",
  "glute ham raise": "Lying Hamstring Curls",
  "good morning": "Romanian Deadlift",
  "goblet squat": "Goblet Squat",
  "hanging knee raise": "Cable Crunch",
  "hanging leg raise": "Cable Crunch",
  "incline bench press": "Incline Dumbbell Press",
  "incline dumbbell curl": "Incline Dumbbell Curl",
  "incline press": "Incline Dumbbell Press",
  "lat pulldown": "Lat Pulldown",
  "leg curl": "Lying Hamstring Curls",
  "lunges": "Walking Lunges",
  "machine preacher curl": "Machine Preacher Curl",
  "max bench press variation": "Barbell Bench Press",
  "max deadlift variation": "Romanian Deadlift",
  "max squat variation": "Barbell Squat",
  "one-arm dumbbell row": "Single Arm Dumbbell Row",
  "overhead triceps extension": "Overhead Tricep Extension",
  "paused bench press": "Barbell Bench Press",
  "plank": "Cable Crunch",
  "pull-up": "Pull-Ups",
  "push-up": "Push-Ups",
  "reverse hyper": "Hyperextensions",
  "seated calf raise": "Seated Calf Raises",
  "seated row": "Seated Cable Row",
  "shoulder press": "Overhead Press",
  "speed bench press": "Barbell Bench Press",
  "speed box squat": "Barbell Squat",
  "speed deadlift": "Romanian Deadlift",
  "squat": "Barbell Squat",
  "stiff-leg deadlift": "Romanian Deadlift",
  "triceps extension": "Overhead Tricep Extension",
  "triceps pushdown": "Tricep Pushdown (Straight Bar)",
  "weighted abs": "Cable Crunch",
  "weighted pull-up": "Pull-Ups",
  "walking lunges": "Walking Lunges",
  "lateral raise": "Dumbbell Lateral Raise",
  "front raise": "Dumbbell Front Raise",
  "rear delt fly": "Reverse Pec Deck",
  "shrugs": "Barbell Shrugs",
  "preacher curl": "EZ Bar Preacher Curl",
  "hip thrust": "Romanian Deadlift",
  "standing calf raise": "Standing Calf Raises"
};

const exercisesByName = new Map<string, CatalogExercise>();
const exercisesById = new Map<string, CatalogExercise>();

Object.values(workoutSource.exercise_catalog).flat().forEach((exercise) => {
  exercisesById.set(exercise.id, exercise);
  exercisesByName.set(normalize(exercise.name), exercise);
});

Object.entries(exerciseAliases).forEach(([alias, canonical]) => {
  const exercise = exercisesByName.get(normalize(canonical));
  if (exercise) {
    exercisesByName.set(normalize(alias), exercise);
  }
});

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveExercise(name: string) {
  return exercisesByName.get(normalize(name));
}

function inferSplitType(slug: string): WorkoutProgram["splitType"] {
  return splitTypeBySlug[slug] ?? "custom";
}

function demandFor(level: Level): "low" | "medium" | "high" {
  if (level === "beginner") return "low";
  if (level === "advanced") return "high";
  return "medium";
}

function setsFor(level: Level, index: number) {
  if (level === "beginner") return index < 2 ? 3 : 2;
  if (level === "advanced") return index < 2 ? 4 : 3;
  return 3;
}

function repsFor(level: Level, title: string, index: number) {
  const text = title.toLowerCase();
  if (text.includes("power") || text.includes("max effort") || text.includes("strength")) {
    return index < 2 ? "4-6" : "6-8";
  }
  if (level === "beginner") return index < 2 ? "10-12" : "12-15";
  if (level === "advanced") return index < 2 ? "6-8" : "10-12";
  return index < 2 ? "8-10" : "10-12";
}

function restFor(level: Level, index: number) {
  if (index < 2) return level === "advanced" ? 120 : 90;
  return 60;
}

function uniqueExercises(names: string[]) {
  const seen = new Set<string>();
  return names
    .map(resolveExercise)
    .filter((exercise): exercise is CatalogExercise => Boolean(exercise))
    .filter((exercise) => {
      if (seen.has(exercise.id)) return false;
      seen.add(exercise.id);
      return true;
    });
}

function rotate<T>(items: T[], by: number) {
  if (items.length === 0) return [];
  const offset = ((by % items.length) + items.length) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function exerciseTargetCount(level: Level, exerciseCount: number) {
  const cap = level === "beginner" ? 6 : level === "advanced" ? 7 : 6;
  return Math.min(cap, Math.max(3, exerciseCount));
}

function buildWorkoutExercises(
  names: string[],
  level: Level,
  week: number,
  dayIndex: number,
  dayTitle: string
): WorkoutExercise[] {
  const pool = uniqueExercises(names);
  const rotated = rotate(pool, (week - 1) * 2 + dayIndex);
  const selected = rotated.slice(0, exerciseTargetCount(level, rotated.length));

  return selected.map((exercise, index) => ({
    exerciseId: exercise.id,
    sets: setsFor(level, index),
    reps: repsFor(level, dayTitle, index),
    restSeconds: restFor(level, index),
    variationLabel: `Week ${week}`,
    notes: week === 1
      ? undefined
      : `Week ${week} variation for variety while keeping the same split structure.`
  }));
}

function workoutBuckets(entry: RawSplitEntry): Record<string, string[]> {
  if (Array.isArray(entry.workouts)) {
    return { full_body: entry.workouts };
  }

  return entry.workouts;
}

function orderedDayKeys(slug: string, buckets: Record<string, string[]>) {
  if (dayOrderBySlug[slug]) {
    return dayOrderBySlug[slug].filter((key) => buckets[key]);
  }

  if (buckets.full_body) {
    return ["full_body", "full_body", "full_body"];
  }

  return Object.keys(buckets);
}

function dayTitle(slug: string, key: string, index: number, keys: string[]) {
  const base = titleCase(key)
    .replace("Ppl", "PPL")
    .replace("Phat", "PHAT")
    .replace("Phul", "PHUL");
  const duplicateCount = keys.filter((item) => item === key).length;

  if (duplicateCount > 1) {
    const occurrence = keys.slice(0, index + 1).filter((item) => item === key).length;
    return key === "full_body"
      ? `${base} ${String.fromCharCode(64 + occurrence)}`
      : `${base} ${occurrence}`;
  }

  return base;
}

function buildDays(slug: string, entry: RawSplitEntry, level: Level, week: number): WorkoutDay[] {
  const buckets = workoutBuckets(entry);
  const keys = orderedDayKeys(slug, buckets);
  return keys.map((key, index) => {
    const title = dayTitle(slug, key, index, keys);
    return {
      id: `${splitIdBySlug[slug] ?? `split_${level}_${slug}`}-w${week}-day-${index + 1}`,
      title,
      dayNumber: index + 1,
      focus: title,
      exercises: buildWorkoutExercises(buckets[key] ?? [], level, week, index, title)
    };
  });
}

function buildProgram(level: Level, slug: string, entry: RawSplitEntry): WorkoutProgram {
  const id = splitIdBySlug[slug] ?? `split_${level}_${slug}`;
  const weeklyVariations = [1, 2, 3, 4].map((week) => ({
    week,
    title: `Week ${week}`,
    days: buildDays(slug, entry, level, week)
  }));
  const daysPerWeek = weeklyVariations[0]?.days.filter((day) => day.exercises.length > 0).length ?? 0;
  const bestFor = splitBestFor[slug] ?? [`${level} members`, "Structured training", "Trainer-led progression"];

  return {
    id,
    title: entry.name,
    description: entry.description,
    goal: bestFor[0] ?? "Structured training",
    difficulty: level as Difficulty,
    daysPerWeek,
    source: "predefined",
    splitType: inferSplitType(slug),
    days: weeklyVariations[0]?.days ?? [],
    bestFor,
    programStyle: titleCase(slug),
    selectionHints: {
      equipmentDemand: slug.includes("minimalist") || slug.includes("full_body") ? "low" : demandFor(level),
      frequency: `${daysPerWeek} training day${daysPerWeek === 1 ? "" : "s"} per week`,
      idealFor: bestFor,
      recoveryDemand: demandFor(level),
      trainerNotes:
        "Exercise selection rotates across four weeks while preserving the same split pattern, so members get variety without losing progression."
    },
    tags: splitTags[slug] ?? [level, `${daysPerWeek} day`],
    weeklyVariations
  };
}

export const splitLibraryPrograms: WorkoutProgram[] = (Object.entries(source) as Array<[Level, Record<string, RawSplitEntry>]>)
  .flatMap(([level, splits]) =>
    Object.entries(splits).map(([slug, entry]) => buildProgram(level, slug, entry))
  )
  .filter((program) => program.days.length > 0);

export function applyCurrentWeeklyVariation(program: WorkoutProgram, date = new Date()): WorkoutProgram {
  if (!program.weeklyVariations?.length) {
    return program;
  }

  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const daysSinceYearStart = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  const weekIndex = Math.floor(daysSinceYearStart / 7) % program.weeklyVariations.length;
  const activeVariation = program.weeklyVariations[weekIndex] ?? program.weeklyVariations[0];

  return {
    ...program,
    days: activeVariation.days
  };
}
