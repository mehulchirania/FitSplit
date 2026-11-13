import type { Difficulty } from "@fitsplit/core";

/** Exercise ids refer to `exercises.json` (see ./index.ts getExerciseById). */
type PlanExercise = {
  exerciseId: string;
  sets: number;
  reps: string;
  restSeconds?: number;
};

type PlanDay = {
  id: string;
  title: string;
  dayNumber: number;
  focus: string;
  exercises: PlanExercise[];
};

export type FreePlan = {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  daysPerWeek: number;
  equipment: string;
  days: PlanDay[];
};

const x = (exerciseId: string, sets: number, reps: string, restSeconds = 75): PlanExercise => ({
  exerciseId,
  sets,
  reps,
  restSeconds,
});

const day = (n: number, title: string, focus: string, exercises: PlanExercise[]): PlanDay => ({
  id: `d${n}`,
  title,
  dayNumber: n,
  focus,
  exercises,
});

export const freePlans: FreePlan[] = [
  {
    id: "bodyweight-home-3x",
    title: "Bodyweight at Home",
    description: "No equipment needed. Push-ups, squats, rows and core work you can do in a living room.",
    difficulty: "beginner",
    daysPerWeek: 3,
    equipment: "None",
    days: [
      day(1, "Push + Core", "Chest, triceps, core", [
        x("0662", 4, "8-15", 60), // push-up
        x("0493", 3, "12-15", 60), // incline push-up
        x("0129", 3, "10-15", 60), // bench dip (knees bent)
        x("0274", 3, "15-20", 45), // crunch floor
        x("0276", 3, "10 / side", 45), // dead bug
      ]),
      day(2, "Legs + Glutes", "Lower body", [
        x("0514", 3, "12", 60), // jump squat
        x("1460", 3, "12 / leg", 60), // walking lunge
        x("2368", 3, "10 / leg", 60), // split squats
        x("3013", 3, "15", 45), // low glute bridge on floor
        x("1373", 4, "20", 45), // bodyweight standing calf raise
      ]),
      day(3, "Pull + Cardio", "Back, core, conditioning", [
        x("0499", 4, "8-12", 75), // inverted row
        x("0489", 3, "12-15", 60), // hyperextension
        x("0630", 3, "40s", 45), // mountain climber
        x("1160", 3, "10", 60), // burpee
        x("0687", 3, "20", 45), // russian twist
      ]),
    ],
  },
  {
    id: "dumbbell-only-3x",
    title: "Dumbbell Only",
    description: "A complete three-day program that needs nothing but a pair of dumbbells and a bench.",
    difficulty: "beginner",
    daysPerWeek: 3,
    equipment: "Dumbbells",
    days: [
      day(1, "Push", "Chest, shoulders, triceps", [
        x("0289", 4, "8-10"),
        x("0314", 3, "10"),
        x("0405", 3, "10"),
        x("0334", 3, "12-15", 60),
        x("0351", 3, "12"),
      ]),
      day(2, "Pull + Arms", "Back, biceps", [
        x("0293", 4, "8-10"),
        x("0292", 3, "10 / arm"),
        x("0383", 3, "12-15", 60),
        x("0294", 3, "10-12"),
        x("0313", 3, "10-12"),
      ]),
      day(3, "Legs", "Lower body", [
        x("1760", 4, "10"),
        x("1459", 3, "10"),
        x("0336", 3, "10 / leg"),
        x("0431", 3, "10 / leg"),
        x("0417", 4, "15", 60),
      ]),
    ],
  },
  {
    id: "core-strength-3x",
    title: "Core Strength",
    description: "Short, focused ab and trunk sessions. Add them to any plan or run them on their own.",
    difficulty: "beginner",
    daysPerWeek: 3,
    equipment: "None",
    days: [
      day(1, "Core A", "Abs", [
        x("0274", 3, "15-20", 45),
        x("0872", 3, "12-15", 45),
        x("0459", 3, "30s", 45),
        x("0276", 3, "10 / side", 45),
      ]),
      day(2, "Core B", "Obliques and hips", [
        x("0687", 3, "20", 45),
        x("0464", 3, "10 / side", 45),
        x("0705", 3, "30s / side", 45),
        x("0620", 3, "12", 45),
      ]),
      day(3, "Core C", "Lower abs and stability", [
        x("0472", 3, "8-12", 60),
        x("0630", 3, "40s", 45),
        x("0735", 3, "15", 45),
        x("0489", 3, "12-15", 45),
      ]),
    ],
  },
  {
    id: "strength-foundations-3x",
    title: "Strength Foundations",
    description:
      "Heavy barbell basics with low reps and long rests. Squat, bench, deadlift and press, three days a week.",
    difficulty: "intermediate",
    daysPerWeek: 3,
    equipment: "Barbell, rack, bench",
    days: [
      day(1, "Squat + Bench", "Strength", [
        x("0043", 5, "5", 180),
        x("0025", 5, "5", 180),
        x("0027", 3, "8", 120),
        x("0472", 3, "10"),
      ]),
      day(2, "Deadlift + Press", "Strength", [
        x("0032", 3, "5", 210),
        x("0091", 4, "6", 150),
        x("0652", 3, "AMRAP", 120),
        x("0031", 3, "10"),
      ]),
      day(3, "Squat + Row", "Strength", [
        x("0043", 4, "6", 180),
        x("0025", 3, "8", 150),
        x("0118", 4, "8", 120),
        x("0054", 3, "10 / leg"),
      ]),
    ],
  },
  {
    id: "arms-shoulders-3x",
    title: "Arms and Shoulders",
    description:
      "Bigger arms and rounder shoulders: three focused sessions on the muscles you see in the mirror.",
    difficulty: "intermediate",
    daysPerWeek: 3,
    equipment: "Dumbbells, cable",
    days: [
      day(1, "Shoulders", "Delts", [
        x("0405", 4, "8-10"),
        x("0334", 4, "12-15", 60),
        x("0310", 3, "12", 60),
        x("0383", 4, "12-15", 60),
        x("0406", 3, "12"),
      ]),
      day(2, "Biceps + Back", "Biceps", [
        x("0294", 4, "10"),
        x("0318", 3, "10-12"),
        x("0313", 3, "10-12"),
        x("0868", 3, "12"),
        x("0861", 3, "10-12"),
      ]),
      day(3, "Triceps + Chest", "Triceps", [
        x("0201", 4, "10-12"),
        x("0351", 3, "10-12"),
        x("0194", 3, "12"),
        x("0289", 3, "8-10"),
        x("0814", 3, "10-15"),
      ]),
    ],
  },
];
