import { describe, expect, it } from "vitest";
import { canMarkNotificationRead } from "./notification-auth";

describe("canMarkNotificationRead", () => {
  it("allows admins to mark any notification read", () => {
    expect(
      canMarkNotificationRead(
        { uid: "admin", role: "admin", gymId: "shg" },
        { recipientRole: "owner", gymId: "other-gym" }
      )
    ).toBe(true);
  });

  it("allows a member to mark only their own same-gym notifications read", () => {
    const member = { uid: "auth-1", role: "member", gymId: "shg", memberId: "member-1" };

    expect(canMarkNotificationRead(member, { recipientId: "member-1", gymId: "shg" })).toBe(true);
    expect(canMarkNotificationRead(member, { recipientId: "member-2", gymId: "shg" })).toBe(false);
    expect(canMarkNotificationRead(member, { recipientId: "member-1", gymId: "other-gym" })).toBe(false);
  });

  it("allows owners to mark only owner notifications for their gym read", () => {
    const owner = { uid: "owner-1", role: "owner", gymId: "shg" };

    expect(canMarkNotificationRead(owner, { recipientRole: "owner", gymId: "shg" })).toBe(true);
    expect(canMarkNotificationRead(owner, { recipientRole: "admin", gymId: "shg" })).toBe(false);
    expect(canMarkNotificationRead(owner, { recipientRole: "owner", gymId: "other-gym" })).toBe(false);
  });
});
