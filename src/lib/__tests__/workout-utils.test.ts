import { describe, it, expect } from "vitest";
import {
  getWeekStart,
  getDefaultDayIndex,
  getInjuryRule,
  isContraindicated,
  findAlternative,
  getExerciseName,
  getDayMuscleTargets,
  resolveTodaysSession,
  getTrainedDateKeys,
  estimateSessionMinutes,
  SKIP_REASONS,
  dayNames
} from "@/lib/workout-utils";
import type { Exercise, WorkoutExercise } from "@/types/domain";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeExercise(overrides: Partial<Exercise> & { id: string; name: string }): Exercise {
  return {
    muscleGroup: "Core",
    equipment: "bodyweight",
    instructions: "",
    videoSource: "none",
    videoUrl: "",
    gymVideoUrl: "",
    gymVideoSource: "none",
    thumbnailUrl: "",
    ownerOnly: false,
    ...overrides
  };
}

function makeWorkoutExercise(exerciseId: string): WorkoutExercise {
  return { exerciseId };
}

// ─── getWeekStart ─────────────────────────────────────────────────────────────

describe("getWeekStart", () => {
  it("returns the Monday of the current week for a Wednesday", () => {
    // 2026-05-20 is a Wednesday
    const result = getWeekStart(new Date("2026-05-20"));
    expect(result).toBe("2026-05-18"); // Monday
  });

  it("returns the same Monday when the input is a Monday", () => {
    // 2026-05-18 is a Monday
    const result = getWeekStart(new Date("2026-05-18"));
    expect(result).toBe("2026-05-18");
  });

  it("returns the previous Monday when the input is a Sunday", () => {
    // 2026-05-24 is a Sunday
    const result = getWeekStart(new Date("2026-05-24"));
    expect(result).toBe("2026-05-18");
  });

  it("returns a string in YYYY-MM-DD format", () => {
    const result = getWeekStart(new Date("2026-01-01"));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ─── getInjuryRule ────────────────────────────────────────────────────────────

describe("getInjuryRule", () => {
  it("returns shoulder rule for 'shoulder pain'", () => {
    const rule = getInjuryRule("shoulder pain");
    expect(rule.avoidMuscles).toContain("Shoulders");
    expect(rule.avoidMuscles).toContain("Chest");
    expect(rule.preferredMuscles).toContain("Legs");
  });

  it("returns knee rule for 'knee injury'", () => {
    const rule = getInjuryRule("knee injury");
    expect(rule.avoidMuscles).toContain("Legs");
    expect(rule.avoidTerms).toContain("squat");
  });

  it("returns back rule for 'lower back strain'", () => {
    const rule = getInjuryRule("lower back strain");
    expect(rule.avoidMuscles).toContain("Back");
    expect(rule.avoidTerms).toContain("deadlift");
  });

  it("returns back rule for 'spine'", () => {
    const rule = getInjuryRule("spine");
    expect(rule.avoidMuscles).toContain("Back");
  });

  it("returns generic recovery rule for unknown injury", () => {
    const rule = getInjuryRule("ankle");
    expect(rule.avoidMuscles).toHaveLength(0);
    expect(rule.avoidTerms).toHaveLength(0);
    expect(rule.preferredMuscles.length).toBeGreaterThan(0);
  });

  it("is case-insensitive", () => {
    const lower = getInjuryRule("shoulder");
    const upper = getInjuryRule("SHOULDER");
    expect(lower.avoidMuscles).toEqual(upper.avoidMuscles);
  });
});

// ─── isContraindicated ────────────────────────────────────────────────────────

describe("isContraindicated", () => {
  const exercises: Exercise[] = [
    makeExercise({ id: "e1", name: "Overhead Press", muscleGroup: "Shoulders", instructions: "press overhead" }),
    makeExercise({ id: "e2", name: "Bench Press",    muscleGroup: "Chest",     instructions: "flat bench press" }),
    makeExercise({ id: "e3", name: "Squat",          muscleGroup: "Legs",      instructions: "squat down" }),
    makeExercise({ id: "e4", name: "Plank",          muscleGroup: "Core",      instructions: "hold position" }),
  ];

  it("flags a Shoulders exercise as contraindicated for shoulder injury", () => {
    const item = makeWorkoutExercise("e1");
    expect(isContraindicated(item, "shoulder", exercises)).toBe(true);
  });

  it("flags a Chest exercise (Bench Press) as contraindicated for shoulder injury", () => {
    const item = makeWorkoutExercise("e2");
    expect(isContraindicated(item, "shoulder", exercises)).toBe(true);
  });

  it("flags a Legs exercise as contraindicated for knee injury", () => {
    const item = makeWorkoutExercise("e3");
    expect(isContraindicated(item, "knee", exercises)).toBe(true);
  });

  it("does NOT flag a Core exercise as contraindicated for shoulder injury", () => {
    const item = makeWorkoutExercise("e4");
    expect(isContraindicated(item, "shoulder", exercises)).toBe(false);
  });

  it("returns false when the exercise ID is not in the catalog", () => {
    const item = makeWorkoutExercise("unknown-id");
    expect(isContraindicated(item, "shoulder", exercises)).toBe(false);
  });

  it("flags an exercise via avoidTerms when its instructions contain a banned term", () => {
    // e.g. a 'Core' exercise whose instructions mention 'deadlift' should be flagged for back injury
    const coreWithDeadliftCue = makeExercise({
      id: "e5",
      name: "Stiff-Leg Deadlift",
      muscleGroup: "Core",
      instructions: "perform a deadlift with straight legs"
    });
    const catalog = [...exercises, coreWithDeadliftCue];
    const item = makeWorkoutExercise("e5");
    expect(isContraindicated(item, "back", catalog)).toBe(true);
  });

  it("does NOT flag an exercise whose muscle group and instructions are both safe", () => {
    const safeCoreExercise = makeExercise({
      id: "e6",
      name: "Bird Dog",
      muscleGroup: "Core",
      instructions: "extend opposite arm and leg while on all fours"
    });
    const catalog = [...exercises, safeCoreExercise];
    const item = makeWorkoutExercise("e6");
    expect(isContraindicated(item, "back", catalog)).toBe(false);
  });
});

// ─── getExerciseName ─────────────────────────────────────────────────────────

describe("getExerciseName", () => {
  const exercises: Exercise[] = [
    makeExercise({ id: "ex1", name: "Pull-up" }),
    makeExercise({ id: "ex2", name: "Push-up" }),
  ];

  it("returns the name when the exercise exists", () => {
    expect(getExerciseName("ex1", exercises)).toBe("Pull-up");
  });

  it("returns 'Exercise' as a fallback for an unknown ID", () => {
    expect(getExerciseName("not-found", exercises)).toBe("Exercise");
  });

  it("returns 'Exercise' for an empty catalog", () => {
    expect(getExerciseName("ex1", [])).toBe("Exercise");
  });
});

// ─── getDayMuscleTargets ──────────────────────────────────────────────────────

describe("getDayMuscleTargets", () => {
  const exercises: Exercise[] = [
    makeExercise({ id: "a", name: "Bench Press",  muscleGroup: "Chest" }),
    makeExercise({ id: "b", name: "Incline Press", muscleGroup: "Chest" }),
    makeExercise({ id: "c", name: "Pull-up",       muscleGroup: "Back" }),
    makeExercise({ id: "d", name: "Plank",         muscleGroup: "Core" }),
  ];

  it("returns the most-common muscle group as primary", () => {
    const items = ["a", "b", "c"].map(makeWorkoutExercise);
    const result = getDayMuscleTargets(items, exercises);
    expect(result.primary).toBe("Chest"); // 2 Chest vs 1 Back
  });

  it("returns secondary groups in descending order", () => {
    const items = ["a", "b", "c", "d"].map(makeWorkoutExercise);
    const result = getDayMuscleTargets(items, exercises);
    expect(result.secondary).toContain("Back");
    expect(result.secondary).toContain("Core");
  });

  it("returns 'Full body' primary when the list is empty", () => {
    const result = getDayMuscleTargets([], exercises);
    expect(result.primary).toBe("Full body");
    expect(result.secondary).toHaveLength(0);
  });

  it("ignores items whose IDs are not in the exercise catalog", () => {
    const items = [makeWorkoutExercise("not-in-catalog")];
    const result = getDayMuscleTargets(items, exercises);
    expect(result.primary).toBe("Full body");
  });
});

// ─── Constants ────────────────────────────────────────────────────────────────

describe("SKIP_REASONS", () => {
  it("has exactly 5 entries", () => {
    expect(SKIP_REASONS).toHaveLength(5);
  });

  it("contains a 'rest' option", () => {
    expect(SKIP_REASONS.some(r => r.value === "rest")).toBe(true);
  });
});

describe("dayNames", () => {
  it("starts on Monday", () => {
    expect(dayNames[0]).toBe("Monday");
  });

  it("ends on Sunday", () => {
    expect(dayNames[6]).toBe("Sunday");
  });

  it("has exactly 7 entries", () => {
    expect(dayNames).toHaveLength(7);
  });
});

// ─── getDefaultDayIndex ───────────────────────────────────────────────────────

describe("getDefaultDayIndex", () => {
  it("returns 0 when dayCount is 0 (no program days)", () => {
    expect(getDefaultDayIndex(0)).toBe(0);
  });

  it("returns 0 when dayCount is 1 (only one day)", () => {
    expect(getDefaultDayIndex(1)).toBe(0);
  });

  it("returns a value in [0, dayCount-1] for typical program lengths", () => {
    for (const dayCount of [3, 4, 5, 6, 7]) {
      const result = getDefaultDayIndex(dayCount);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(dayCount);
    }
  });

  it("never returns a negative value regardless of input", () => {
    expect(getDefaultDayIndex(0)).toBeGreaterThanOrEqual(0);
    expect(getDefaultDayIndex(1)).toBeGreaterThanOrEqual(0);
    expect(getDefaultDayIndex(7)).toBeGreaterThanOrEqual(0);
  });
});

// ─── findAlternative ──────────────────────────────────────────────────────────

describe("findAlternative", () => {
  // ownerOnly=true = custom gym exercise (eligible as swap target)
  const catalog: Exercise[] = [
    makeExercise({ id: "alt1", name: "Leg Press",      muscleGroup: "Legs",       ownerOnly: true }),
    makeExercise({ id: "alt2", name: "Plank",           muscleGroup: "Core",       ownerOnly: true }),
    makeExercise({ id: "alt3", name: "Cable Row",       muscleGroup: "Back",       ownerOnly: true }),
    makeExercise({ id: "alt4", name: "Default Plank",   muscleGroup: "Core",       ownerOnly: false }),
    makeExercise({ id: "alt5", name: "Incline Press",   muscleGroup: "Chest",      ownerOnly: true }),
  ];

  it("returns an exercise from a preferred muscle group", () => {
    // shoulder: preferredMuscles = Legs, Core, Back
    const result = findAlternative(new Set(), "shoulder", catalog);
    expect(result).toBeDefined();
    expect(["Legs", "Core", "Back"]).toContain(result?.muscleGroup);
  });

  it("skips exercises whose IDs are already used", () => {
    // Mark all Legs/Core/Back ownerOnly exercises as used; nothing should be returned for shoulder
    const used = new Set(["alt1", "alt2", "alt3"]);
    const result = findAlternative(used, "shoulder", catalog);
    expect(result).toBeUndefined();
  });

  it("skips exercises where ownerOnly is false (default catalog)", () => {
    // alt4 is Core but ownerOnly=false — should never be picked
    const used = new Set(["alt1", "alt2", "alt3"]); // all ownerOnly preferred are used
    const result = findAlternative(used, "shoulder", catalog);
    expect(result).toBeUndefined();
  });

  it("prevents a pull-muscle replacement for a push-muscle original", () => {
    // For knee injury, preferred = Chest, Back, Core
    // If original is Chest (push), Back (pull) alternatives should be skipped
    const used = new Set<string>();
    const result = findAlternative(used, "knee", catalog, "Chest");
    expect(result).toBeDefined();
    expect(result?.muscleGroup).not.toBe("Back");
  });

  it("prevents a push-muscle replacement for a pull-muscle original", () => {
    // For knee injury, preferred = Chest, Back, Core
    // If original is Back (pull), Chest (push) alternatives should be skipped
    const used = new Set<string>();
    const result = findAlternative(used, "knee", catalog, "Back");
    expect(result).toBeDefined();
    expect(result?.muscleGroup).not.toBe("Chest");
  });

  it("allows cross-mechanic swap when the original muscle is itself contraindicated", () => {
    // Shoulder injury avoids Chest; so if original is Chest (push), push/pull guard is lifted
    // because Chest is in rule.avoidMuscles. Any preferred ownerOnly exercise is fair game.
    const used = new Set<string>();
    const result = findAlternative(used, "shoulder", catalog, "Chest");
    expect(result).toBeDefined();
  });
});

// ─── resolveTodaysSession ─────────────────────────────────────────────────────

describe("resolveTodaysSession", () => {
  const days = [
    { id: "day-1", dayNumber: 1 },
    { id: "day-2", dayNumber: 2 },
  ];
  const program = { days };
  const weekStart = "2026-05-18"; // Monday (see getWeekStart tests above)

  it("returns no_program when program is null", () => {
    expect(resolveTodaysSession(null, [], [], weekStart)).toEqual({
      dayIndex: 0,
      reason: "no_program",
      isCompletedThisWeek: false
    });
  });

  it("returns no_program when program has no days", () => {
    const result = resolveTodaysSession({ days: [] }, [], [], weekStart);
    expect(result.reason).toBe("no_program");
  });

  it("returns no_program when program.days is undefined", () => {
    const result = resolveTodaysSession({}, [], [], weekStart);
    expect(result.reason).toBe("no_program");
  });

  it("returns next_up for the first day when nothing is completed and there's no recent activity", () => {
    const result = resolveTodaysSession(program, [], [], weekStart);
    expect(result).toEqual({ dayIndex: 0, reason: "next_up", isCompletedThisWeek: false });
  });

  it("returns next_up for the second day once the first day is completed this week", () => {
    const dayLogs = [{ dayId: "day-1", status: "completed", weekStart }];
    const result = resolveTodaysSession(program, dayLogs, [], weekStart);
    expect(result).toEqual({ dayIndex: 1, reason: "next_up", isCompletedThisWeek: false });
  });

  it("ignores a completed dayLog from a different week", () => {
    const dayLogs = [{ dayId: "day-1", status: "completed", weekStart: "2026-05-11" }];
    const result = resolveTodaysSession(program, dayLogs, [], weekStart);
    expect(result).toEqual({ dayIndex: 0, reason: "next_up", isCompletedThisWeek: false });
  });

  it("returns in_progress when lift logs exist this week but the day isn't completed yet", () => {
    const liftLogs = [{ exerciseId: "ex1", loggedAt: "2026-05-19T10:00:00" }]; // Tuesday, same week
    const result = resolveTodaysSession(program, [], liftLogs, weekStart);
    expect(result).toEqual({ dayIndex: 0, reason: "in_progress", isCompletedThisWeek: false });
  });

  it("does not treat lift logs from a previous week as in_progress", () => {
    const liftLogs = [{ exerciseId: "ex1", loggedAt: "2026-05-10T10:00:00" }]; // prior week
    const result = resolveTodaysSession(program, [], liftLogs, weekStart);
    expect(result.reason).toBe("next_up");
  });

  it("returns rest_day with the last day index when every day is completed this week", () => {
    const dayLogs = [
      { dayId: "day-1", status: "completed", weekStart },
      { dayId: "day-2", status: "completed", weekStart },
    ];
    const result = resolveTodaysSession(program, dayLogs, [], weekStart);
    expect(result).toEqual({ dayIndex: 1, reason: "rest_day", isCompletedThisWeek: true });
  });
});

// ─── getTrainedDateKeys ────────────────────────────────────────────────────────

describe("getTrainedDateKeys", () => {
  it("includes a date from a lift log", () => {
    const keys = getTrainedDateKeys([{ loggedAt: "2026-05-19T08:00:00" }], []);
    expect(keys.has("2026-05-19")).toBe(true);
  });

  it("includes a date from a completed dayLog", () => {
    const keys = getTrainedDateKeys([], [{ status: "completed", loggedAt: "2026-05-20T08:00:00" }]);
    expect(keys.has("2026-05-20")).toBe(true);
  });

  it("excludes a dayLog that is not completed", () => {
    const keys = getTrainedDateKeys([], [{ status: "skipped", loggedAt: "2026-05-20T08:00:00" }]);
    expect(keys.has("2026-05-20")).toBe(false);
  });

  it("dedupes same-day entries from both sources", () => {
    const keys = getTrainedDateKeys(
      [{ loggedAt: "2026-05-19T08:00:00" }],
      [{ status: "completed", loggedAt: "2026-05-19T20:00:00" }]
    );
    expect(keys.size).toBe(1);
  });

  it("ignores entries with no loggedAt", () => {
    const keys = getTrainedDateKeys([{}], [{ status: "completed" }]);
    expect(keys.size).toBe(0);
  });

  it("returns an empty set for empty inputs", () => {
    expect(getTrainedDateKeys([], []).size).toBe(0);
  });
});

// ─── estimateSessionMinutes ─────────────────────────────────────────────────

describe("estimateSessionMinutes", () => {
  it("computes minutes from sets and restSeconds, rounded to the nearest 5", () => {
    // 4 sets * (105s rest + 45s work) = 600s = 10 min exactly
    const result = estimateSessionMinutes([{ exerciseId: "e1", sets: 4, restSeconds: 105 }]);
    expect(result).toBe(10);
  });

  it("defaults missing sets to 3 and missing restSeconds to 90", () => {
    // 3 sets * (90s rest + 45s work) = 405s = 6.75 min -> rounds to 5
    const result = estimateSessionMinutes([{ exerciseId: "e2" }]);
    expect(result).toBe(5);
  });

  it("sums across multiple exercises", () => {
    // e1: 3 * (60+45) = 315s ; e2: 4 * (90+45) = 540s ; total = 855s = 14.25 min -> rounds to 15
    const result = estimateSessionMinutes([
      { exerciseId: "e1", sets: 3, restSeconds: 60 },
      { exerciseId: "e2", sets: 4, restSeconds: 90 },
    ]);
    expect(result).toBe(15);
  });

  it("returns 0 for an empty day", () => {
    expect(estimateSessionMinutes([])).toBe(0);
  });
});
