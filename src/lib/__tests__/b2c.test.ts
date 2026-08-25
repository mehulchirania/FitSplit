import { describe, it, expect } from "vitest";
import { signWorkspacePayload, verifyWorkspaceCookie, type ActiveWorkspacePayload } from "../workspace";
import { isPersonalWorkspace } from "@fitsplit/core/domain";

describe("B2C Workspace & Session HMAC Overlay", () => {
  it("correctly identifies personal workspaces", () => {
    expect(isPersonalWorkspace({ type: "personal" })).toBe(true);
    expect(isPersonalWorkspace({ type: "business" })).toBe(false);
    expect(isPersonalWorkspace(null)).toBe(false);
    expect(isPersonalWorkspace(undefined)).toBe(false);
  });

  it("signs and verifies active workspace cookie payload correctly", () => {
    const payload: ActiveWorkspacePayload = {
      gymId: "personal-user-123",
      role: "member",
      memberId: "user-123"
    };

    const cookie = signWorkspacePayload(payload);
    expect(typeof cookie).toBe("string");
    expect(cookie.split(".").length).toBe(2);

    const verified = verifyWorkspaceCookie(cookie);
    expect(verified).not.toBeNull();
    expect(verified?.gymId).toBe("personal-user-123");
    expect(verified?.role).toBe("member");
    expect(verified?.memberId).toBe("user-123");
  });

  it("rejects tampered or forged workspace cookies", () => {
    const payload: ActiveWorkspacePayload = {
      gymId: "personal-user-123",
      role: "member",
      memberId: "user-123"
    };

    const cookie = signWorkspacePayload(payload);
    const [data, signature] = cookie.split(".");

    // Tamper the payload data
    const forgedPayload = { ...payload, role: "admin" };
    const forgedData = Buffer.from(JSON.stringify(forgedPayload)).toString("base64url");
    const tamperedCookie = `${forgedData}.${signature}`;

    expect(verifyWorkspaceCookie(tamperedCookie)).toBeNull();
    expect(verifyWorkspaceCookie("invalid.cookie.shape")).toBeNull();
    expect(verifyWorkspaceCookie(undefined)).toBeNull();
  });
});
