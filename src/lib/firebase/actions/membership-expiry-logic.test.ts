/**
 * Tests for the Cloud Functions membership-expiry math.
 * Imports the production module from functions/src directly (it is
 * dependency-free pure TS), so these tests exercise the exact code
 * `processMembershipExpiries` and `computeGymDashboard` run in production.
 */
import { describe, expect, it } from "vitest";
import {
  addMonths,
  computeMembershipStatus,
  daysUntilExpiry,
  planExpiryTransition,
  warningWindowEnd,
} from "../../../../functions/src/membership-expiry-logic";

const TODAY = "2026-07-05";
const DEFAULT_WARNING_DAYS = 7;

describe("computeMembershipStatus — expiry boundaries (default 7-day warning)", () => {
  it("membership expiring today is expiring_soon, not expired", () => {
    expect(computeMembershipStatus(TODAY, TODAY, DEFAULT_WARNING_DAYS)).toBe("expiring_soon");
  });

  it("membership that ended yesterday is expired", () => {
    expect(computeMembershipStatus("2026-07-04", TODAY, DEFAULT_WARNING_DAYS)).toBe("expired");
  });

  it("membership that ended long ago is expired", () => {
    expect(computeMembershipStatus("2026-01-01", TODAY, DEFAULT_WARNING_DAYS)).toBe("expired");
  });

  it("membership with a few days left inside the window is expiring_soon", () => {
    expect(computeMembershipStatus("2026-07-08", TODAY, DEFAULT_WARNING_DAYS)).toBe("expiring_soon");
  });

  it("membership ending exactly at the warning threshold (today + 7) is expiring_soon — boundary inclusive", () => {
    expect(computeMembershipStatus("2026-07-12", TODAY, DEFAULT_WARNING_DAYS)).toBe("expiring_soon");
  });

  it("membership ending one day past the threshold is active — warning off", () => {
    expect(computeMembershipStatus("2026-07-13", TODAY, DEFAULT_WARNING_DAYS)).toBe("active");
  });

  it("missing endDate yields null (nothing to classify)", () => {
    expect(computeMembershipStatus(undefined, TODAY, DEFAULT_WARNING_DAYS)).toBeNull();
    expect(computeMembershipStatus(null, TODAY, DEFAULT_WARNING_DAYS)).toBeNull();
    expect(computeMembershipStatus("", TODAY, DEFAULT_WARNING_DAYS)).toBeNull();
  });
});

describe("computeMembershipStatus — per-gym expiryWarningDays override", () => {
  it("a 30-day override widens the warning window", () => {
    // Outside the default 7-day window but inside 30 days.
    expect(computeMembershipStatus("2026-07-13", TODAY, 30)).toBe("expiring_soon");
    // Exactly at the 30-day boundary (2026-07-05 + 30 = 2026-08-04).
    expect(computeMembershipStatus("2026-08-04", TODAY, 30)).toBe("expiring_soon");
    // One past the 30-day boundary.
    expect(computeMembershipStatus("2026-08-05", TODAY, 30)).toBe("active");
  });

  it("a 0-day override only warns on the expiry day itself", () => {
    expect(computeMembershipStatus(TODAY, TODAY, 0)).toBe("expiring_soon");
    expect(computeMembershipStatus("2026-07-06", TODAY, 0)).toBe("active");
    expect(computeMembershipStatus("2026-07-04", TODAY, 0)).toBe("expired");
  });
});

describe("planExpiryTransition — scheduler write/notify decisions", () => {
  it("active → expiring_soon writes the status and sends the expiring notification", () => {
    expect(
      planExpiryTransition({
        endDate: "2026-07-08", currentStatus: "active", todayStr: TODAY, expiryWarningDays: DEFAULT_WARNING_DAYS,
      })
    ).toEqual({ newStatus: "expiring_soon", notificationType: "membership_expiring_soon" });
  });

  it("expiring_soon → expired writes the status and sends the expired notification", () => {
    expect(
      planExpiryTransition({
        endDate: "2026-07-04", currentStatus: "expiring_soon", todayStr: TODAY, expiryWarningDays: DEFAULT_WARNING_DAYS,
      })
    ).toEqual({ newStatus: "expired", notificationType: "membership_expired" });
  });

  it("already expired → no write, no duplicate notification", () => {
    expect(
      planExpiryTransition({
        endDate: "2026-07-04", currentStatus: "expired", todayStr: TODAY, expiryWarningDays: DEFAULT_WARNING_DAYS,
      })
    ).toBeNull();
  });

  it("already expiring_soon and still inside the window → no repeat write", () => {
    expect(
      planExpiryTransition({
        endDate: "2026-07-08", currentStatus: "expiring_soon", todayStr: TODAY, expiryWarningDays: DEFAULT_WARNING_DAYS,
      })
    ).toBeNull();
  });

  it("membership still active outside the window → scheduler leaves it alone", () => {
    expect(
      planExpiryTransition({
        endDate: "2026-12-31", currentStatus: "active", todayStr: TODAY, expiryWarningDays: DEFAULT_WARNING_DAYS,
      })
    ).toBeNull();
  });

  it("missing endDate → skipped", () => {
    expect(
      planExpiryTransition({
        endDate: "", currentStatus: "active", todayStr: TODAY, expiryWarningDays: DEFAULT_WARNING_DAYS,
      })
    ).toBeNull();
  });

  it("honors the per-gym override when deciding the transition", () => {
    // 2026-07-20 is outside the 7-day window but inside a 30-day one.
    const args = { endDate: "2026-07-20", currentStatus: "active", todayStr: TODAY };
    expect(planExpiryTransition({ ...args, expiryWarningDays: 7 })).toBeNull();
    expect(planExpiryTransition({ ...args, expiryWarningDays: 30 })).toEqual({
      newStatus: "expiring_soon",
      notificationType: "membership_expiring_soon",
    });
  });
});

describe("warningWindowEnd / addMonths", () => {
  it("computes the inclusive end of the warning window", () => {
    expect(warningWindowEnd(TODAY, 7)).toBe("2026-07-12");
    expect(warningWindowEnd(TODAY, 0)).toBe(TODAY);
  });

  it("crosses month boundaries", () => {
    expect(warningWindowEnd("2026-06-28", 7)).toBe("2026-07-05");
    expect(warningWindowEnd("2026-12-28", 7)).toBe("2027-01-04");
  });

  it("addMonths supports months plus extra days in UTC", () => {
    expect(addMonths("2026-07-05", 1)).toBe("2026-08-05");
    expect(addMonths("2026-07-05", 0, 7)).toBe("2026-07-12");
    expect(addMonths("2026-01-31", 1)).toBe("2026-03-03"); // JS Date month overflow, documented
  });
});

describe("daysUntilExpiry", () => {
  const noonToday = new Date("2026-07-05T12:00:00Z").getTime();

  it("counts whole days remaining, rounding up", () => {
    expect(daysUntilExpiry("2026-07-06", noonToday)).toBe(1);
    expect(daysUntilExpiry("2026-07-12", noonToday)).toBe(7);
  });

  it("returns 0 (not -0) when expiry midnight has already passed today", () => {
    // Math.ceil of a small negative fraction yields -0; the module normalizes it.
    expect(daysUntilExpiry("2026-07-05", noonToday)).toBe(0);
  });
});
