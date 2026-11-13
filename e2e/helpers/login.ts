import { expect, type Locator, type Page } from "@playwright/test";

/** Types a 4-digit PIN into a PinField group (boxes auto-advance as digits are typed). */
export async function fillPin(group: Locator, pin: string) {
  await group.locator("input").first().click();
  await group.page().keyboard.type(pin);
}

/**
 * Logs in through the real landing-page modal (there is no dedicated /login
 * route, see src/components/landing/login-modal.tsx). Waits for the
 * post-login redirect so callers land on an authenticated page.
 */
export async function login(page: Page, phone: string, pin: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Mobile number").fill(phone);
  await fillPin(dialog.getByRole("group", { name: "PIN", exact: true }), pin);
  await dialog.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/member/,{ timeout: 60_000 });
}

/** Fills the signup form up to (not including) the submit button. */
export async function fillSignup(page: Page, name: string, phone: string, pin: string, confirmPin = pin) {
  await page.goto("/signup");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Mobile number").fill(phone);
  await fillPin(page.getByRole("group", { name: "PIN", exact: true }), pin);
  await fillPin(page.getByRole("group", { name: "Confirm PIN", exact: true }), confirmPin);
  await page.getByRole("radio", { name: /18 or older/ }).check();
}

/** Creates a brand-new account through /signup and waits for the redirect into the app. */
export async function signUp(page: Page, name: string, phone: string, pin: string) {
  await fillSignup(page, name, phone, pin);
  await page.getByRole("checkbox", { name: /I agree to the/ }).check();
  await page.getByRole("button", { name: /create .*account/i }).click();
  await page.waitForURL(/\/member/,{ timeout: 60_000 });
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

/** A valid, never-reused Indian mobile number (10 digits starting 9), so each spec makes its own account. */
export function uniquePhone() {
  const tail = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9).padStart(9, "0");
  return `9${tail}`;
}

export { expect };
