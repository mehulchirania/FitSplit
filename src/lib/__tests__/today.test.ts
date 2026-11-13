import { describe, expect, it } from "vitest";
import { formatClock, formatDuration, istDateKey, matchDayIndex, parseReps, resolveNextDayIndex, trainedDateKeys, weekDateKeys, weekStartOf, weeklyStreak } from "@/lib/today";
import type { WorkoutDay } from "@/types/domain";

const day = (n: number, title: string): WorkoutDay => ({ id: `p-w1-day-${n}`, title, dayNumber: n, focus: title, exercises: [] });
const days = [day(1, "Push"), day(2, "Pull"), day(3, "Legs")];

describe("resolveNextDayIndex", () => {
  it("starts a new plan at day 1", () => {
    expect(resolveNextDayIndex(days, [])).toBe(0);
  });
  it("continues after the last completed day and wraps", () => {
    expect(resolveNextDayIndex(days, [{ dayId: "p-w1-day-1", completedAt: "2026-11-10T10:00:00Z" }])).toBe(1);
    expect(resolveNextDayIndex(days, [{ dayTitle: "Legs", completedAt: "2026-11-10T10:00:00Z" }])).toBe(0);
  });
  it("uses the most recent entry and ignores history from before the plan was picked", () => {
    const history = [
      { dayTitle: "Push", completedAt: "2026-11-01T10:00:00Z" },
      { dayTitle: "Pull", completedAt: "2026-11-12T10:00:00Z" }
    ];
    expect(resolveNextDayIndex(days, history)).toBe(2);
    expect(resolveNextDayIndex(days, history, "2026-11-13T00:00:00Z")).toBe(0);
  });
  it("survives weekly-variation id changes via the day-N suffix", () => {
    expect(matchDayIndex(days, { dayId: "p-w3-day-2" })).toBe(1);
  });
});

describe("date helpers", () => {
  it("builds IST date keys and Monday-first weeks", () => {
    expect(istDateKey("2026-11-13T20:00:00Z")).toBe("2026-11-14"); // already Saturday in IST
    expect(weekStartOf("2026-11-14")).toBe("2026-11-09");
    expect(weekStartOf("2026-11-09")).toBe("2026-11-09");
    expect(weekDateKeys("2026-11-09")).toEqual(["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"]);
  });
});

describe("formatters", () => {
  it("parses rep prescriptions and formats durations", () => {
    expect(parseReps("8-12")).toBe(8);
    expect(parseReps("10 / side")).toBe(10);
    expect(parseReps("AMRAP")).toBeNull();
    expect(formatDuration(42 * 60)).toBe("42 min");
    expect(formatDuration(65 * 60)).toBe("1 h 05 min");
    expect(formatClock(75)).toBe("1:15");
  });
});

describe("weeklyStreak", () => {
  it("counts consecutive trained weeks and keeps a streak alive through an untrained current week", () => {
    const today = "2026-11-14"; // week of 2026-11-09
    expect(weeklyStreak([], today)).toBe(0);
    expect(weeklyStreak(["2026-11-10", "2026-11-03", "2026-10-27"], today)).toBe(3);
    expect(weeklyStreak(["2026-11-03", "2026-10-27"], today)).toBe(2);
    expect(weeklyStreak(["2026-11-10", "2026-10-27"], today)).toBe(1);
  });
});

describe("trainedDateKeys", () => {
  it("counts finished sessions and completed days only", () => {
    const keys = trainedDateKeys(
      [{ startedAt: "2026-11-10T05:00:00.000Z", endedAt: "2026-11-10T06:00:00.000Z" }],
      [
        { status: "completed", loggedAt: "2026-11-11T05:00:00.000Z" },
        { status: "skipped", loggedAt: "2026-11-12T05:00:00.000Z" }
      ]
    );
    expect([...keys].sort()).toEqual(["2026-11-10", "2026-11-11"]);
  });
});
