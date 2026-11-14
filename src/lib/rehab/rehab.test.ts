import { describe, expect, it } from "vitest";
import { LOWER_BACK_PAIN_ID, REHAB_CONDITIONS, REHAB_EXERCISES, REHAB_FIELD } from "./catalog";
import {
  buildRoutine,
  dosageLabel,
  dosageUnits,
  exerciseSeconds,
  routineMinutes,
  routineSeconds,
  sanitizeConditionIds,
  unitWorkSeconds
} from "./routine";
import { mapRehabSession, mergeHistory, parseRehabFeeling, recentFeelings, validateRehabRun } from "./session";

describe("catalogue", () => {
  it("exposes the field name and seed id", () => {
    expect(REHAB_FIELD).toBe("rehabConditions");
    expect(REHAB_CONDITIONS.some((c) => c.id === LOWER_BACK_PAIN_ID)).toBe(true);
  });
  it("has unique condition ids and 5 to 8 resolvable exercises each, without repeats", () => {
    expect(new Set(REHAB_CONDITIONS.map((c) => c.id)).size).toBe(REHAB_CONDITIONS.length);
    for (const c of REHAB_CONDITIONS) {
      expect(c.routine.length).toBeGreaterThanOrEqual(5);
      expect(c.routine.length).toBeLessThanOrEqual(8);
      expect(new Set(c.routine).size).toBe(c.routine.length);
      for (const id of c.routine) expect(REHAB_EXERCISES[id], `${c.id} -> ${id}`).toBeDefined();
    }
  });
  it("gives every exercise 2 to 4 cues and a stop-if", () => {
    for (const e of Object.values(REHAB_EXERCISES)) {
      expect(e.cues.length).toBeGreaterThanOrEqual(2);
      expect(e.cues.length).toBeLessThanOrEqual(4);
      expect(e.stopIf.length).toBeGreaterThan(0);
    }
  });
});

describe("sanitizeConditionIds", () => {
  it("drops unknown, non-string and repeated ids", () => {
    expect(sanitizeConditionIds(["tech-neck", "nope", 4, "tech-neck", LOWER_BACK_PAIN_ID])).toEqual(["tech-neck", LOWER_BACK_PAIN_ID]);
    expect(sanitizeConditionIds(undefined)).toEqual([]);
  });
});

describe("buildRoutine", () => {
  it("returns a single condition's routine in order", () => {
    const lower = REHAB_CONDITIONS.find((c) => c.id === LOWER_BACK_PAIN_ID)!;
    expect(buildRoutine([LOWER_BACK_PAIN_ID]).map((e) => e.id)).toEqual(lower.routine);
  });
  it("dedupes exercises shared between conditions, keeping the first appearance", () => {
    const picked = [LOWER_BACK_PAIN_ID, "anterior-pelvic-tilt", "knee-pain"];
    const ids = buildRoutine(picked).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const separate = picked.flatMap((id) => buildRoutine([id]).map((e) => e.id));
    expect(separate.length).toBeGreaterThan(ids.length);
    // glute-bridge is in all three; it stays where the first condition put it
    expect(ids.indexOf("glute-bridge")).toBe(buildRoutine([LOWER_BACK_PAIN_ID]).findIndex((e) => e.id === "glute-bridge"));
  });
  it("is empty for no or unknown conditions", () => {
    expect(buildRoutine([])).toEqual([]);
    expect(buildRoutine(["unknown"])).toEqual([]);
  });
});

describe("units and duration", () => {
  it("expands sets and sides", () => {
    expect(dosageUnits({ kind: "reps", reps: 10, sets: 2 })).toEqual([
      { set: 1, side: null },
      { set: 2, side: null }
    ]);
    expect(dosageUnits({ kind: "hold", seconds: 30, sets: 2, perSide: true })).toEqual([
      { set: 1, side: "left" },
      { set: 1, side: "right" },
      { set: 2, side: "left" },
      { set: 2, side: "right" }
    ]);
  });
  it("times a unit: holds by seconds, reps by tempo (3 s default)", () => {
    expect(unitWorkSeconds({ kind: "hold", seconds: 30, sets: 1 })).toBe(30);
    expect(unitWorkSeconds({ kind: "reps", reps: 10, sets: 1 })).toBe(30);
    expect(unitWorkSeconds({ kind: "reps", reps: 8, sets: 1, repSeconds: 5 })).toBe(40);
  });
  it("adds setup and switch time to an exercise", () => {
    // 10 setup + 4 units x 30 s + 3 x 5 s switches
    expect(exerciseSeconds({ ...REHAB_EXERCISES["hip-90-90"], dosage: { kind: "hold", seconds: 30, sets: 2, perSide: true } })).toBe(145);
  });
  it("sums a routine and rounds minutes, with a floor of one", () => {
    const routine = buildRoutine([LOWER_BACK_PAIN_ID]);
    expect(routineSeconds(routine)).toBe(routine.reduce((s, e) => s + exerciseSeconds(e), 0));
    expect(routineMinutes(routine)).toBe(Math.round(routineSeconds(routine) / 60));
    expect(routineMinutes([])).toBe(0);
    expect(routineMinutes([{ ...routine[0], dosage: { kind: "reps", reps: 1, sets: 1, repSeconds: 1 } }])).toBe(1);
  });
  it("combining conditions takes less time than the sum of the parts", () => {
    const a = buildRoutine([LOWER_BACK_PAIN_ID]);
    const b = buildRoutine(["anterior-pelvic-tilt"]);
    expect(routineSeconds(buildRoutine([LOWER_BACK_PAIN_ID, "anterior-pelvic-tilt"]))).toBeLessThan(routineSeconds(a) + routineSeconds(b));
  });
});

describe("dosageLabel", () => {
  it("reads naturally", () => {
    expect(dosageLabel({ kind: "hold", seconds: 30, sets: 2, perSide: true })).toBe("30 s hold × 2 each side");
    expect(dosageLabel({ kind: "reps", reps: 12, sets: 2 })).toBe("12 reps × 2");
  });
});

describe("validateRehabRun", () => {
  const now = new Date("2026-11-14T10:00:00.000Z");
  const good = {
    runId: "run-12345678",
    conditionIds: [LOWER_BACK_PAIN_ID, "bogus", LOWER_BACK_PAIN_ID],
    startedAt: "2026-11-14T09:40:00.000Z",
    durationSec: 1200.4,
    exercisesCompleted: 5,
    exercisesSkipped: 1
  };
  it("accepts a valid run, sanitizes condition ids and stamps completedAt from the server", () => {
    const r = validateRehabRun(good, now);
    expect(r).toEqual({
      ok: true,
      id: "run-12345678",
      doc: {
        conditionIds: [LOWER_BACK_PAIN_ID],
        startedAt: "2026-11-14T09:40:00.000Z",
        completedAt: now.toISOString(),
        durationSec: 1200,
        exercisesCompleted: 5,
        exercisesSkipped: 1
      }
    });
  });
  it("ignores runs with zero completed exercises", () => {
    expect(validateRehabRun({ ...good, exercisesCompleted: 0, exercisesSkipped: 4 }, now)).toEqual({ ok: false, reason: "empty" });
  });
  it("rejects malformed input", () => {
    const bad = (patch: Record<string, unknown>) => validateRehabRun({ ...good, ...patch }, now);
    expect(validateRehabRun(null, now).ok).toBe(false);
    expect(bad({ runId: "x/y" }).ok).toBe(false);
    expect(bad({ conditionIds: ["bogus"] }).ok).toBe(false);
    expect(bad({ conditionIds: "tech-neck" }).ok).toBe(false);
    expect(bad({ exercisesCompleted: 1.5 }).ok).toBe(false);
    expect(bad({ exercisesSkipped: -1 }).ok).toBe(false);
    expect(bad({ exercisesCompleted: 1000 }).ok).toBe(false);
    expect(bad({ durationSec: -5 }).ok).toBe(false);
    expect(bad({ durationSec: 999999 }).ok).toBe(false);
    expect(bad({ durationSec: Number.NaN }).ok).toBe(false);
    expect(bad({ startedAt: "nope" }).ok).toBe(false);
    expect(bad({ startedAt: "2026-11-14T11:00:00.000Z" }).ok).toBe(false);
    expect(bad({ startedAt: "2026-11-10T09:40:00.000Z" }).ok).toBe(false);
  });
});

describe("mapRehabSession and mergeHistory", () => {
  it("maps stored docs tolerantly and drops unusable ones", () => {
    expect(mapRehabSession("a", undefined)).toBeNull();
    expect(mapRehabSession("a", { startedAt: "x" })).toBeNull();
    expect(
      mapRehabSession("a", { conditionIds: ["tech-neck", "bogus"], completedAt: "2026-11-14T10:00:00.000Z", durationSec: "9", exercisesCompleted: 4 })
    ).toEqual({
      id: "a",
      conditionIds: ["tech-neck"],
      startedAt: "2026-11-14T10:00:00.000Z",
      completedAt: "2026-11-14T10:00:00.000Z",
      durationSec: 0,
      exercisesCompleted: 4,
      exercisesSkipped: 0
    });
  });
  it("merges workouts and rehab newest first, labelled by kind", () => {
    const rehab = [mapRehabSession("r1", { completedAt: "2026-11-13T08:00:00.000Z", conditionIds: ["tech-neck"] })!];
    const workouts = [
      { id: "w1", at: "2026-11-14T08:00:00.000Z" },
      { id: "w0", at: "2026-11-12T08:00:00.000Z" }
    ];
    const merged = mergeHistory(workouts, (w) => w.at, rehab);
    expect(merged.map((m) => m.kind)).toEqual(["workout", "rehab", "workout"]);
    expect(merged.map((m) => m.id)).toEqual(["w:w1", "r:r1", "w:w0"]);
  });
});

describe("rehab feeling", () => {
  const now = new Date("2026-05-01T12:00:00Z");
  const base = { runId: "run-12345678", conditionIds: [LOWER_BACK_PAIN_ID], startedAt: "2026-05-01T11:30:00Z", durationSec: 600, exercisesCompleted: 4, exercisesSkipped: 1 };
  it("parses only the three known answers", () => {
    expect(parseRehabFeeling("better")).toBe("better");
    expect(parseRehabFeeling("worse")).toBe("worse");
    expect(parseRehabFeeling("great")).toBeUndefined();
    expect(parseRehabFeeling(3)).toBeUndefined();
  });
  it("keeps a valid feeling on the run and drops an invalid one", () => {
    const ok = validateRehabRun({ ...base, feeling: "same" }, now);
    expect(ok.ok && ok.doc.feeling).toBe("same");
    const bad = validateRehabRun({ ...base, feeling: "meh" }, now);
    expect(bad.ok && "feeling" in bad.doc).toBe(false);
  });
  it("maps a stored feeling and ignores junk", () => {
    const doc = { completedAt: "2026-05-01T12:00:00Z", conditionIds: [LOWER_BACK_PAIN_ID] };
    expect(mapRehabSession("a", { ...doc, feeling: "worse" })?.feeling).toBe("worse");
    expect(mapRehabSession("a", { ...doc, feeling: "x" })?.feeling).toBeUndefined();
  });
  it("lists the last feelings oldest first, skipping sessions without one", () => {
    const mk = (i: number, feeling?: "better" | "same" | "worse") => ({
      id: String(i), conditionIds: [], startedAt: "", completedAt: `2026-05-0${i}T10:00:00Z`, durationSec: 0, exercisesCompleted: 1, exercisesSkipped: 0, feeling
    });
    expect(recentFeelings([mk(3, "worse"), mk(2), mk(1, "better")])).toEqual(["better", "worse"]);
    expect(recentFeelings([1, 2, 3, 4, 5, 6, 7, 8].map((i) => mk(i, "same")), 3)).toHaveLength(3);
  });
});
