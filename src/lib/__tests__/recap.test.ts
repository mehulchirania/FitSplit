import { describe, expect, it } from "vitest";
import { countWeekPrs, recapSentence, sessionRecords, weeklyRecap } from "@/lib/recap";
import { trainingStreak } from "@/lib/today";

// 2026-11-14 is a Saturday; its week starts Mon 2026-11-09.
const TODAY = "2026-11-14";

describe("weeklyRecap", () => {
  const sessions = [
    { startedAt: "2026-11-10T05:00:00Z", endedAt: "2026-11-10T06:00:00Z", volumeKg: 1200 },
    { startedAt: "2026-11-12T05:00:00Z", endedAt: "2026-11-12T06:00:00Z", volumeKg: 1800 },
    { startedAt: "2026-11-04T05:00:00Z", endedAt: "2026-11-04T06:00:00Z", volumeKg: 2000 },
    { startedAt: "2026-10-01T05:00:00Z", endedAt: "2026-10-01T06:00:00Z", volumeKg: 9999 }
  ];
  it("compares this week with last", () => {
    const r = weeklyRecap(sessions, [], TODAY);
    expect(r).toMatchObject({ sessions: 2, lastSessions: 1, volume: 3000, lastVolume: 2000, volumeChangePct: 50 });
    expect(r.summary).toBe("2 sessions this week, up from 1 and 50% more volume.");
  });
  it("has no percent when last week was empty", () => {
    expect(weeklyRecap(sessions.slice(0, 2), [], TODAY).volumeChangePct).toBeNull();
  });
  it("handles an empty week", () => {
    expect(recapSentence({ sessions: 0, lastSessions: 0, volume: 0, lastVolume: 0, volumeChangePct: null, prs: 0 })).toBe("No workouts yet this week.");
  });
});

describe("countWeekPrs", () => {
  const lifts = [
    { exerciseId: "bench", weight: 60, loggedAt: "2026-11-01T05:00:00Z" },
    { exerciseId: "bench", weight: 65, loggedAt: "2026-11-10T05:00:00Z" },
    { exerciseId: "squat", weight: 100, loggedAt: "2026-11-10T05:00:00Z" },
    { exerciseId: "row", weight: 50, loggedAt: "2026-11-01T05:00:00Z" },
    { exerciseId: "row", weight: 50, loggedAt: "2026-11-11T05:00:00Z" }
  ];
  it("counts only lifts that beat an earlier best", () => {
    expect(countWeekPrs(lifts, "2026-11-09")).toBe(1);
  });
});

describe("sessionRecords", () => {
  it("keeps the heaviest set and ignores first-ever lifts", () => {
    const out = sessionRecords([
      { key: "a", name: "Bench", weight: 60, prior: 55 },
      { key: "a", name: "Bench", weight: 65, prior: 55 },
      { key: "b", name: "Squat", weight: 100, prior: 0 },
      { key: "c", name: "Row", weight: 50, prior: 50 }
    ]);
    expect(out).toEqual([{ name: "Bench", weight: 65, prior: 55 }]);
  });
});

describe("trainingStreak", () => {
  it("counts consecutive weeks and flags at-risk", () => {
    const sessions = [{ startedAt: "2026-11-04T05:00:00Z", endedAt: "2026-11-04T06:00:00Z" }, { startedAt: "2026-10-28T05:00:00Z" }];
    expect(trainingStreak(sessions, [], TODAY)).toEqual({ weeks: 2, trainedThisWeek: false, atRisk: true });
  });
  it("ignores skipped day logs", () => {
    expect(trainingStreak([], [{ status: "skipped", loggedAt: "2026-11-10T05:00:00Z" }], TODAY).weeks).toBe(0);
  });
});
