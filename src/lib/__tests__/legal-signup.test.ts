import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseSignup } from "@/lib/signup-schema";
import { applyLegalTokens, buildConsentRecord, legalTokens, LEGAL_VERSIONS } from "@/lib/legal-config";
import { LEGAL_DOCUMENTS } from "@/lib/legal-documents";
import { hitRateLimit, resetRateLimits } from "@/lib/rate-limit";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const base = { fullName: "Asha Rao", email: "Asha@Example.com", password: "correct-horse", ageGroup: "adult", termsAccepted: "true" };

describe("signup validation", () => {
  it("accepts a complete adult signup and lowercases the email", () => {
    const r = parseSignup(form(base));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.email).toBe("asha@example.com");
  });

  it("rejects signup without the terms/privacy consent", () => {
    const { termsAccepted: _t, ...rest } = base;
    void _t;
    const r = parseSignup(form(rest));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/Terms and the Privacy Notice/);
  });

  it("rejects an unchecked consent value", () => {
    expect(parseSignup(form({ ...base, termsAccepted: "false" })).ok).toBe(false);
  });

  it("requires an age choice", () => {
    const { ageGroup: _a, ...rest } = base;
    void _a;
    expect(parseSignup(form(rest)).ok).toBe(false);
  });

  it("requires guardian consent and email for under-18", () => {
    expect(parseSignup(form({ ...base, ageGroup: "minor" })).ok).toBe(false);
    expect(parseSignup(form({ ...base, ageGroup: "minor", guardianConsent: "true" })).ok).toBe(false);
    expect(parseSignup(form({ ...base, ageGroup: "minor", guardianEmail: "mum@example.com" })).ok).toBe(false);
    expect(
      parseSignup(form({ ...base, ageGroup: "minor", guardianConsent: "true", guardianEmail: "mum@example.com" })).ok
    ).toBe(true);
  });

  it("rejects guardian email equal to the user's own", () => {
    const r = parseSignup(form({ ...base, ageGroup: "minor", guardianConsent: "true", guardianEmail: "asha@example.com" }));
    expect(r.ok).toBe(false);
  });

  it("enforces length limits", () => {
    expect(parseSignup(form({ ...base, fullName: "x".repeat(81) })).ok).toBe(false);
    expect(parseSignup(form({ ...base, password: "p".repeat(129) })).ok).toBe(false);
    expect(parseSignup(form({ ...base, email: `${"a".repeat(250)}@example.com` })).ok).toBe(false);
  });
});

describe("consent record", () => {
  it("stores versions, timestamp and guardian for minors; forces diagnostics off", () => {
    const now = new Date("2026-11-13T00:00:00Z");
    const c = buildConsentRecord({ ageGroup: "minor", diagnostics: true, guardianEmail: "g@example.com", now });
    expect(c.termsVersion).toBe(LEGAL_VERSIONS.terms);
    expect(c.privacyVersion).toBe(LEGAL_VERSIONS.privacy);
    expect(c.acceptedAt).toBe(now.toISOString());
    expect(c.diagnostics.granted).toBe(false);
    expect(c.guardian).toMatchObject({ email: "g@example.com", verification: "pending" });
  });

  it("records an adult's diagnostics choice and no guardian", () => {
    const c = buildConsentRecord({ ageGroup: "adult", diagnostics: true });
    expect(c.diagnostics.granted).toBe(true);
    expect(c.guardian).toBeUndefined();
  });
});

describe("legal documents", () => {
  it("every legal markdown file resolves all {{TOKENS}} and shows version and date", () => {
    for (const doc of LEGAL_DOCUMENTS) {
      const md = fs.readFileSync(path.join(process.cwd(), "legal", doc.source), "utf8");
      const out = applyLegalTokens(md, legalTokens(doc.key));
      expect(out).not.toMatch(/\{\{/);
      expect(out).toMatch(/Version 2\.0/);
      expect(out).toMatch(/2026-11-13/);
      expect(out).not.toMatch(/\b(gym owner|trainer|invoice|refund)\b/i);
    }
  });

  it("an unknown token throws", () => {
    expect(() => applyLegalTokens("{{NOPE}}", legalTokens("terms"))).toThrow();
  });
});

describe("rate limiter", () => {
  beforeEach(() => resetRateLimits());
  it("blocks after the limit and recovers after the window", () => {
    for (let i = 0; i < 3; i++) expect(hitRateLimit("k", 3, 1000, 0).limited).toBe(false);
    expect(hitRateLimit("k", 3, 1000, 10).limited).toBe(true);
    expect(hitRateLimit("k", 3, 1000, 1500).limited).toBe(false);
  });
});
