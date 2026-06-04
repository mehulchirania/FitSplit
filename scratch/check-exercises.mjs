import fs from "fs";

const workoutsData = JSON.parse(fs.readFileSync("lib/workouts.json", "utf8"));
const exerciseAliases = {
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
  "walking lunges": "Walking Lunges"
};

function normalize(v) { return v.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim(); }

const byName = new Map();
Object.values(workoutsData.exercise_catalog).flat().forEach(ex => byName.set(normalize(ex.name), ex));
Object.entries(exerciseAliases).forEach(([a, c]) => { const ex = byName.get(normalize(c)); if (ex) byName.set(normalize(a), ex); });

const splitSource = JSON.parse(fs.readFileSync("lib/split-library-source.json", "utf8"));
let foundMissing = false;
for (const day of ["push", "pull", "legs"]) {
  const exercises = splitSource.intermediate.push_pull_legs.workouts[day];
  exercises.forEach(n => {
    const ex = byName.get(normalize(n));
    if (!ex) {
      console.log(day, "=> MISSING:", n);
      foundMissing = true;
    }
  });
}
if (!foundMissing) console.log("All exercises in Push Pull Legs found.");
