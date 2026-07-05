import { describe, expect, it } from "vitest";
import {
  addMonths,
  canResolvePaymentRequest,
  computeMembershipActivation,
  isAuthorizedForGym,
} from "./billing-logic";

describe("canResolvePaymentRequest", () => {
  it("allows resolving only pending requests", () => {
    expect(canResolvePaymentRequest("pending")).toBe(true);
  });

  it("rejects double-approve (already approved)", () => {
    expect(canResolvePaymentRequest("approved")).toBe(false);
  });

  it("rejects double-reject and approve-after-reject (already rejected)", () => {
    expect(canResolvePaymentRequest("rejected")).toBe(false);
  });

  it("rejects resolving a cancelled request", () => {
    expect(canResolvePaymentRequest("cancelled")).toBe(false);
  });

  it("rejects missing/unknown status", () => {
    expect(canResolvePaymentRequest(undefined)).toBe(false);
    expect(canResolvePaymentRequest(null)).toBe(false);
  });
});

describe("isAuthorizedForGym", () => {
  it("allows an owner acting on their own gym", () => {
    expect(isAuthorizedForGym("shg", "shg")).toBe(true);
  });

  it("blocks an owner acting on another gym", () => {
    expect(isAuthorizedForGym("shg", "other-gym")).toBe(false);
  });

  it("blocks a user with no gymId", () => {
    expect(isAuthorizedForGym(undefined, "shg")).toBe(false);
    expect(isAuthorizedForGym(null, "shg")).toBe(false);
    expect(isAuthorizedForGym("", "shg")).toBe(false);
  });
});

describe("computeMembershipActivation", () => {
  const activationDay = new Date("2026-07-05T10:30:00Z");

  it("starts the membership on the activation day", () => {
    const { startDate, endDate, durationMonths } = computeMembershipActivation(1, activationDay);
    expect(startDate).toBe("2026-07-05");
    expect(endDate).toBe("2026-08-05");
    expect(durationMonths).toBe(1);
  });

  it("computes multi-month end dates", () => {
    expect(computeMembershipActivation(3, activationDay).endDate).toBe("2026-10-05");
    expect(computeMembershipActivation(12, activationDay).endDate).toBe("2027-07-05");
  });

  it("rolls over month-end dates via JS Date semantics (Jan 31 + 1 month → Mar 3 in a non-leap year)", () => {
    // Documents current behavior: setUTCMonth overflows short months.
    expect(computeMembershipActivation(1, new Date("2026-01-31T08:00:00Z")).endDate).toBe("2026-03-03");
  });

  it("does NOT stack on a still-active membership — renewing early starts from today, forfeiting remaining days", () => {
    // Member is active until 2026-08-01 but renews a 1-month package on 2026-07-05.
    // Current production behavior: new period is 2026-07-05 → 2026-08-05,
    // not 2026-08-01 → 2026-09-01. The existing endDate is never consulted.
    const renewal = computeMembershipActivation(1, activationDay);
    expect(renewal.startDate).toBe("2026-07-05");
    expect(renewal.endDate).toBe("2026-08-05");
    expect(renewal.endDate).not.toBe("2026-09-01");
  });

  it("activating after expiry also starts from today", () => {
    // Membership expired 2026-06-01; member renews on 2026-07-05.
    const renewal = computeMembershipActivation(1, activationDay);
    expect(renewal.startDate).toBe("2026-07-05");
    expect(renewal.endDate).toBe("2026-08-05");
  });
});

describe("addMonths", () => {
  it("adds whole months in UTC", () => {
    expect(addMonths("2026-07-05", 1)).toBe("2026-08-05");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
    expect(addMonths("2026-07-05", 0)).toBe("2026-07-05");
  });
});
