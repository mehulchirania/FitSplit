import { expect, type Page } from "@playwright/test";

export type LoginMode = "member" | "staff";

/**
 * Logs in through the real landing-page modal (there is no dedicated /login
 * route — see src/components/landing/login-modal.tsx). Waits for the
 * post-login redirect so callers land on an authenticated page.
 */
export async function login(page: Page, mode: LoginMode, username: string, password: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  if (mode === "staff") {
    await dialog.getByRole("tab", { name: "Staff" }).click();
  }
  await dialog.locator("#lp-login-user").fill(username);
  await dialog.locator("#lp-login-pass").fill(password);
  await dialog.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/") || url.pathname === "/member" || url.pathname === "/owner" || url.pathname === "/admin" || url.pathname === "/trainer", { timeout: 15_000 });
  await acceptTermsIfPrompted(page);
}

/**
 * Some accounts (anyone without termsAcceptedAt set — true for freshly
 * reseeded profiles) get a first-login "Before you continue" consent gate.
 * Accept it so callers land on a usable page regardless of which account
 * they logged in with.
 */
export async function acceptTermsIfPrompted(page: Page) {
  // The consent gate mounts client-side after the shell renders, so it can
  // appear a beat after navigation settles — give it a real window rather
  // than a quick peek, but don't block callers on accounts that never show it.
  const acceptButton = page.getByRole("button", { name: "Accept & continue" });
  if (await acceptButton.isVisible({ timeout: 6_000 }).catch(() => false)) {
    await acceptButton.click();
    // onAccept awaits the acceptTerms() server action, THEN calls
    // router.refresh() — give the round trip real headroom before checking.
    await expect(acceptButton).not.toBeVisible({ timeout: 15_000 });
  }
}

export async function logout(page: Page) {
  // Server action-backed logout; every authenticated shell exposes this.
  const logoutButton = page.getByRole("button", { name: /log out|sign out/i }).first();
  if (await logoutButton.isVisible().catch(() => false)) {
    await logoutButton.click();
    await page.waitForURL("/", { timeout: 10_000 });
  } else {
    await page.context().clearCookies();
  }
}
