// Usage: node scripts/smoke-check.mjs <baseUrl>   (or: npm run smoke -- https://example.com)
// Read-only: three GET requests, no auth, no writes. Safe against production.
const base = (process.argv[2] || process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

try {
  const home = await fetch(base + "/", { redirect: "manual" });
  check("landing returns 200", home.status === 200, `status ${home.status}`);
  const csp = home.headers.get("content-security-policy");
  check("Content-Security-Policy present", !!csp);
  check("CSP has default-src or script-src", !!csp && /(default|script)-src/.test(csp));
  for (const h of ["x-frame-options", "x-content-type-options", "referrer-policy", "strict-transport-security"]) {
    check(`header ${h}`, home.headers.has(h));
  }

  const member = await fetch(base + "/member", { redirect: "manual" });
  const loc = member.headers.get("location") || "";
  check("/member redirects when signed out", member.status >= 300 && member.status < 400, `status ${member.status} -> ${loc}`);
} catch (e) {
  check("server reachable", false, e.message);
}
process.exit(failed ? 1 : 0);
