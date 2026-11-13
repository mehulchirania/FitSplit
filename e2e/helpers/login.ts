import { expect, type Page } from "@playwright/test";

/**
 * Logs in through the real landing-page modal (there is no dedicated /login
 * route, see src/components/landing/login-modal.tsx). Waits for the
 * post-login redirect so callers land on an authenticated page.
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#lp-login-user").fill(email);
  await dialog.locator("#lp-login-pass").fill(password);
  await dialog.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/member/, { timeout: 60_000 });
}

/** Creates a brand-new account through /signup and waits for the redirect into the app. */
export async function signUp(page: Page, name: string, email: string, password: string) {
  await page.goto("/signup");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("radio", { name: /18 or older/ }).check();
  await page.getByRole("checkbox", { name: /I agree to the/ }).check();
  await page.getByRole("button", { name: "Create free account" }).click();
  await page.waitForURL(/\/member/, { timeout: 60_000 });
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

export function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

export { expect };
