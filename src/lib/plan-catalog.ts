import type { WorkoutProgram } from "@/types/domain";

/**
 * The plans offered first when someone has no plan yet. They are ordinary templates
 * from the built-in library; this list only decides which ones lead and how they are
 * described in one line.
 */
const FEATURED_PLANS: ReadonlyArray<{ id: string; title: string; blurb: string }> = [
  {
    id: "split_beginner_full_body",
    title: "Full Body",
    blurb: "Train everything three times a week. The simplest way to start and keep progressing."
  },
  {
    id: "split_01",
    title: "Push / Pull / Legs",
    blurb: "Six days, each one a focus: pushing, pulling, legs. For lifters who want volume."
  },
  {
    id: "split_02",
    title: "PPL + Upper/Lower",
    blurb: "Five days: push, pull and legs, then an upper and a lower day. High frequency without a sixth day."
  },
  {
    id: "split_beginner_upper_lower",
    title: "Upper / Lower",
    blurb: "Four days that alternate upper and lower body, with a rest day between most sessions."
  },
  {
    id: "beginner-strength-3x",
    title: "Beginner Strength",
    blurb: "Squat, bench, deadlift and press in heavy sets of five. Add weight every week."
  }
];

const FEATURED_IDS = new Set(FEATURED_PLANS.map((p) => p.id));

const LEVEL_ORDER = { beginner: 0, intermediate: 1, advanced: 2 } as const;

export type PlanSummary = {
  id: string;
  title: string;
  blurb: string;
  difficulty: WorkoutProgram["difficulty"];
  daysPerWeek: number;
  exerciseCount: number;
  source: "predefined" | "custom";
  days: Array<{ id: string; title: string; exercises: Array<{ name: string; sets: number; reps: string }> }>;
};

/** Reduce a program to what the plan lists and the preview sheet need. Keeps client props small. */
export function summarizePlan(
  program: WorkoutProgram,
  nameOf: (exerciseId: string) => string
): PlanSummary {
  const featured = FEATURED_PLANS.find((p) => p.id === program.id);
  const days = program.days
    .filter((d) => d.exercises.length > 0)
    .map((d) => ({
      id: d.id,
      title: d.title,
      exercises: d.exercises.map((e) => ({ name: nameOf(e.exerciseId), sets: e.sets ?? 3, reps: e.reps ?? "" }))
    }));
  return {
    id: program.id,
    title: featured?.title ?? program.title,
    blurb: featured?.blurb ?? program.description,
    difficulty: program.difficulty,
    daysPerWeek: days.length,
    exerciseCount: days.reduce((n, d) => n + d.exercises.length, 0),
    source: program.source === "custom" ? "custom" : "predefined",
    days
  };
}

/** Featured first (in their listed order), then everything else easiest-first. */
export function orderPlans<T extends { id: string; difficulty: WorkoutProgram["difficulty"]; daysPerWeek: number }>(plans: T[]) {
  const featured = FEATURED_PLANS.flatMap((f) => plans.filter((p) => p.id === f.id));
  const rest = plans
    .filter((p) => !FEATURED_IDS.has(p.id))
    .sort((a, b) => LEVEL_ORDER[a.difficulty] - LEVEL_ORDER[b.difficulty] || a.daysPerWeek - b.daysPerWeek);
  return { featured, rest };
}
