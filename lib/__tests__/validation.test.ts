import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ZodHelpers, parseActionData } from "@/lib/firebase/actions/validation";

// ─── ZodHelpers ───────────────────────────────────────────────────────────────

describe("ZodHelpers.textRequired", () => {
  const schema = ZodHelpers.textRequired("Name");

  it("accepts a non-empty string", () => {
    expect(schema.safeParse("Alice").success).toBe(true);
  });

  it("rejects an empty string", () => {
    const result = schema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("trims whitespace before validation", () => {
    // A string that is only whitespace should fail after trimming
    const result = schema.safeParse("   ");
    expect(result.success).toBe(false);
  });

  it("includes the label in the error message", () => {
    const result = schema.safeParse("");
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Name");
    }
  });
});

describe("ZodHelpers.emailRequired", () => {
  it("accepts a valid email address", () => {
    expect(ZodHelpers.emailRequired.safeParse("user@example.com").success).toBe(true);
  });

  it("rejects a plain string without @", () => {
    expect(ZodHelpers.emailRequired.safeParse("notanemail").success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(ZodHelpers.emailRequired.safeParse("").success).toBe(false);
  });
});

describe("ZodHelpers.phone", () => {
  it("accepts a valid 10-digit Indian mobile starting with 9", () => {
    expect(ZodHelpers.phone.safeParse("9876543210").success).toBe(true);
  });

  it("accepts a number with +91 prefix", () => {
    expect(ZodHelpers.phone.safeParse("+919876543210").success).toBe(true);
  });

  it("rejects a number starting with 5 (invalid Indian mobile)", () => {
    expect(ZodHelpers.phone.safeParse("5876543210").success).toBe(false);
  });

  it("rejects a number that is too short", () => {
    expect(ZodHelpers.phone.safeParse("98765").success).toBe(false);
  });
});

describe("ZodHelpers.pin", () => {
  it("accepts exactly 4 numeric digits", () => {
    expect(ZodHelpers.pin.safeParse("1234").success).toBe(true);
  });

  it("rejects a 3-digit PIN", () => {
    expect(ZodHelpers.pin.safeParse("123").success).toBe(false);
  });

  it("rejects a 5-digit PIN", () => {
    expect(ZodHelpers.pin.safeParse("12345").success).toBe(false);
  });

  it("rejects a non-numeric PIN", () => {
    expect(ZodHelpers.pin.safeParse("abcd").success).toBe(false);
  });
});

describe("ZodHelpers.emailOrEmpty", () => {
  it("accepts a valid email", () => {
    expect(ZodHelpers.emailOrEmpty.safeParse("user@example.com").success).toBe(true);
  });

  it("accepts an empty string", () => {
    expect(ZodHelpers.emailOrEmpty.safeParse("").success).toBe(true);
  });

  it("rejects an invalid non-empty string", () => {
    expect(ZodHelpers.emailOrEmpty.safeParse("not-an-email").success).toBe(false);
  });
});

describe("ZodHelpers.username", () => {
  it("accepts a valid lowercase alphanumeric username", () => {
    expect(ZodHelpers.username.safeParse("mehul123").success).toBe(true);
  });

  it("accepts a username with dots, underscores, and hyphens", () => {
    expect(ZodHelpers.username.safeParse("mehul.chirania_dev-01").success).toBe(true);
  });

  it("rejects a username shorter than 3 characters", () => {
    expect(ZodHelpers.username.safeParse("me").success).toBe(false);
  });

  it("rejects a username longer than 32 characters", () => {
    expect(ZodHelpers.username.safeParse("a".repeat(33)).success).toBe(false);
  });

  it("rejects a username with uppercase letters", () => {
    expect(ZodHelpers.username.safeParse("Mehul").success).toBe(false);
  });

  it("rejects a username with spaces", () => {
    expect(ZodHelpers.username.safeParse("mehul chirania").success).toBe(false);
  });

  it("accepts a username of exactly 3 characters (lower boundary)", () => {
    expect(ZodHelpers.username.safeParse("abc").success).toBe(true);
  });

  it("accepts a username of exactly 32 characters (upper boundary)", () => {
    expect(ZodHelpers.username.safeParse("a".repeat(32)).success).toBe(true);
  });
});

// ─── parseActionData ──────────────────────────────────────────────────────────

const TestSchema = z.object({
  fullName: ZodHelpers.textRequired("Full name"),
  email: ZodHelpers.emailRequired
});

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value);
  }
  return fd;
}

describe("parseActionData", () => {
  it("returns success with parsed data for valid input", () => {
    const fd = makeFormData({ fullName: "Alice", email: "alice@example.com" });
    const result = parseActionData(fd, TestSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fullName).toBe("Alice");
      expect(result.data.email).toBe("alice@example.com");
    }
  });

  it("returns a failure state with fieldErrors for invalid input", () => {
    const fd = makeFormData({ fullName: "", email: "not-an-email" });
    const result = parseActionData(fd, TestSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.state.status).toBe("error");
      expect(result.state.fieldErrors).toBeDefined();
      expect(result.state.fieldErrors?.fullName).toBeDefined();
      expect(result.state.fieldErrors?.email).toBeDefined();
    }
  });

  it("returns a human-readable error message on failure", () => {
    const fd = makeFormData({ fullName: "", email: "" });
    const result = parseActionData(fd, TestSchema);
    if (!result.success) {
      expect(result.state.message).toMatch(/error/i);
    }
  });

  it("trims whitespace from textRequired fields before validation", () => {
    const fd = makeFormData({ fullName: "  Bob  ", email: "bob@example.com" });
    const result = parseActionData(fd, TestSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      // zod's .trim() should give us the trimmed value
      expect(result.data.fullName).toBe("Bob");
    }
  });

  it("returns status 'error' (not 'success') on validation failure", () => {
    const fd = makeFormData({ fullName: "Alice", email: "not-valid" });
    const result = parseActionData(fd, TestSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.state.status).toBe("error");
    }
  });

  it("fieldErrors only contains keys that failed validation", () => {
    // fullName is valid; only email fails
    const fd = makeFormData({ fullName: "Carol", email: "not-an-email" });
    const result = parseActionData(fd, TestSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.state.fieldErrors?.email).toBeDefined();
      expect(result.state.fieldErrors?.fullName).toBeUndefined();
    }
  });

  it("ignores extra keys in FormData that are not in the schema", () => {
    const fd = makeFormData({ fullName: "Dave", email: "dave@example.com", extra: "ignored" });
    const result = parseActionData(fd, TestSchema);
    // Zod strips unknown keys by default; the extra field should not cause failure
    expect(result.success).toBe(true);
  });
});
