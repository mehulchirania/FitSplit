import { describe, expect, it } from "vitest";
import { isPersonalWorkspace } from "@fitsplit/core";
import { canRunRosterOperations, resolveEntitlements } from "@/lib/entitlements";

describe("resolveEntitlements", () => {
  // v1 is free-only (D1). These tests pin that decision so a future agent
  // adding a Pro gate has to consciously update them rather than quietly
  // shipping a paywall into a product that has no way to take payment.
  it("grants everything to a free consumer in their personal workspace", () => {
    const ent = resolveEntitlements({ plan: "free", role: "member" }, { type: "personal" });

    expect(ent.workoutLogging).toBe(true);
    expect(ent.customPrograms).toBe(true);
    expect(ent.progressAnalytics).toBe(true);
    expect(ent.macroTracking).toBe(true);
    expect(ent.splitLibraryLimit).toBeNull();
    expect(ent.historyRetentionDays).toBeNull();
  });

  it("grants everything to a gym member in a business workspace", () => {
    const ent = resolveEntitlements({ role: "member" }, { type: "business" });

    expect(ent.historyRetentionDays).toBeNull();
    expect(ent.progressAnalytics).toBe(true);
  });

  it("treats a workspace with no type as business", () => {
    // Every gym predating B2C has no `type` field. Undefined must never be
    // mistaken for a personal workspace.
    const ent = resolveEntitlements({ role: "owner" }, { type: undefined });

    expect(ent.rosterOperations).toBe(true);
  });

  it("returns a fresh object each call", () => {
    // Guards against a caller mutating the shared constant and silently
    // changing entitlements for every subsequent request in the process.
    const a = resolveEntitlements({ role: "member" }, null);
    a.workoutLogging = false;

    expect(resolveEntitlements({ role: "member" }, null).workoutLogging).toBe(true);
  });
});

describe("canRunRosterOperations", () => {
  it("is false for a personal workspace", () => {
    expect(canRunRosterOperations({ type: "personal" })).toBe(false);
  });

  it("is true for a business workspace and for a legacy gym with no type", () => {
    expect(canRunRosterOperations({ type: "business" })).toBe(true);
    expect(canRunRosterOperations({ type: undefined })).toBe(true);
    expect(canRunRosterOperations(null)).toBe(true);
  });
});

describe("isPersonalWorkspace", () => {
  it("only matches an explicit personal type", () => {
    expect(isPersonalWorkspace({ type: "personal" })).toBe(true);
    expect(isPersonalWorkspace({ type: "business" })).toBe(false);
    expect(isPersonalWorkspace({ type: undefined })).toBe(false);
    expect(isPersonalWorkspace(null)).toBe(false);
    expect(isPersonalWorkspace(undefined)).toBe(false);
  });
});
