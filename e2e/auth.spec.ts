import { test, expect } from "@playwright/test";
import { login, acceptTermsIfPrompted } from "./helpers/login";

test.describe("login — happy paths", () => {
  test("member logs in with mobile/username + PIN", async ({ page }) => {
    await login(page, "member", "mehul", "1234");
    await expect(page).toHaveURL(/\/member/);
  });

  test("owner logs in with username + password", async ({ page }) => {
    await login(page, "staff", "santosh-shg", "password");
    await expect(page).toHaveURL(/\/owner/);
  });

  test("admin logs in with username + password", async ({ page }) => {
    await login(page, "staff", "admin", "password");
    await expect(page).toHaveURL(/\/admin/);
  });

  test("wrong PIN is rejected with an error, not a silent failure", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Sign in", exact: true }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("#lp-login-user").fill("mehul");
    await dialog.locator("#lp-login-pass").fill("9999");
    await dialog.getByRole("button", { name: "Log in" }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL("/");
  });
});

test.describe("login lockout", () => {
  // IMPORTANT: must be a username that is NOT in the hardcoded `demoLogins`
  // map in src/lib/auth.ts (kabir/aarav/meera/nisha/admin/santosh-shg/etc. are
  // all in that map). Discovered while writing this test: any demoLogins
  // username short-circuits password validation locally and returns before
  // ever reaching checkIdentifierLockout/incrementIdentifierFailure — so
  // lockout silently does not apply to those ~15 legacy usernames at all,
  // even though they're real Firebase Auth accounts and are the ones
  // documented in docs/04_TESTING_AND_LOGINS.md. That's a real gap, not a
  // test bug — flagged in the report rather than patched here, since it's an
  // auth-logic change. A reseeded, non-demoLogins username exercises the
  // real lockout path this test is meant to verify.
  const LOCKOUT_TARGET = "vikram.icf";

  test("5 failed attempts locks the account", async ({ page }) => {
    await page.goto("/");
    for (let i = 0; i < 5; i++) {
      await page.getByRole("button", { name: "Sign in", exact: true }).first().click();
      const dialog = page.getByRole("dialog");
      await dialog.locator("#lp-login-user").fill(LOCKOUT_TARGET);
      await dialog.locator("#lp-login-pass").fill("0000");
      await dialog.getByRole("button", { name: "Log in" }).click();
      await expect(dialog.getByRole("alert")).toBeVisible();
      // Modal stays open on failure — close it before the next attempt so
      // "Sign in" is clickable again.
      if (i < 4) await dialog.getByRole("button", { name: "Close login dialog" }).click();
    }
    // 6th attempt, even with the CORRECT pin, must be rejected by the lockout,
    // proving the lockout is enforced server-side and not just a UI counter.
    await page.getByRole("dialog").locator("#lp-login-user").fill(LOCKOUT_TARGET);
    await page.getByRole("dialog").locator("#lp-login-pass").fill("1234");
    await page.getByRole("dialog").getByRole("button", { name: "Log in" }).click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText(/too many|try again/i);
    await expect(page).toHaveURL("/");
  });
});

test.describe("session revocation on suspend", () => {
  // This flow (2 concurrent authenticated contexts, 3 navigations) is
  // measurably more prone to dev-server/Turbopack compile-timing flakiness
  // than any other spec in this suite — observed failing at different,
  // unrelated steps across runs against the same code. Retrying is standard
  // practice for this class of flakiness; it is not masking a fixed-content
  // assertion failure (those still fail every retry).
  test.describe.configure({ retries: 1 });

  // Dedicated throwaway member for suspend/reactivate — reverted in `finally`
  // so re-runs are idempotent and other specs relying on this account
  // (there are none) are never affected.
  const TARGET_USERNAME = "nisha";
  const TARGET_DISPLAY_NAME = "Nisha Rao";

  test("suspending a member kicks their live session out immediately", async ({ browser }) => {
    test.setTimeout(45_000);
    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();

    try {
      // 1. Member logs in and confirms they're in.
      await login(memberPage, "member", TARGET_USERNAME, "1234");
      await expect(memberPage).toHaveURL(/\/member/);

      // 2. Owner (separate browser context = separate cookie jar) suspends them.
      await login(ownerPage, "staff", "santosh-shg", "password");
      // Sidebar nav link (src/components/odp-sidebar.tsx) renders the member
      // count badge INSIDE the same <Link>, so its accessible name is
      // "Members 10", not "Members" — an exact match here silently never
      // matches anything and hangs waiting. Root cause of this test's
      // deterministic failure through several earlier attempts.
      await ownerPage.getByRole("link", { name: /^Members/ }).click();
      await expect(ownerPage).toHaveURL(/\/owner\/members$/, { timeout: 15_000 });
      const memberLink = ownerPage.getByRole("link", { name: new RegExp(TARGET_DISPLAY_NAME) }).first();
      await expect(memberLink).toBeVisible({ timeout: 15_000 });
      await memberLink.click();
      // "Account access" is a collapsed <details> disclosure on this page
      // (src/app/owner/members/[memberId]/page.tsx) — the toggle button exists
      // in the DOM but stays hidden (and fails toBeVisible/click actionability
      // checks) until the <summary> is expanded.
      await ownerPage.locator("summary", { hasText: "Account access" }).click({ timeout: 15_000 });
      await ownerPage.getByRole("button", { name: "Access enabled" }).click({ timeout: 15_000 });
      await expect(ownerPage.getByRole("button", { name: "Access suspended" })).toBeVisible({ timeout: 10_000 });

      // 3. The member's ALREADY-OPEN session (same cookie, never re-logged-in)
      // must be rejected on the next request — this is the checkRevoked +
      // revokeRefreshTokens fix. Before that fix, this would still show /member.
      await memberPage.goto("/member");
      await acceptTermsIfPrompted(memberPage);
      await expect(memberPage).not.toHaveURL(/\/member$/, { timeout: 10_000 });
    } finally {
      // Always restore access, even if an assertion above failed.
      await ownerPage.getByRole("button", { name: "Access suspended" }).click().catch(() => {});
      await expect(ownerPage.getByRole("button", { name: "Access enabled" })).toBeVisible({ timeout: 10_000 }).catch(() => {});
      await memberContext.close();
      await ownerContext.close();
    }
  });
});
