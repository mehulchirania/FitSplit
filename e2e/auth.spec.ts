import { test, expect } from "@playwright/test";
import { login, logout, signUp, uniqueEmail } from "./helpers/login";

const PASSWORD = "e2e-password-123";

test.describe("accounts", () => {
  test("a new user can sign up and lands in the workout app", async ({ page }) => {
    await signUp(page, "E2E Lifter", uniqueEmail(), PASSWORD);
    await expect(page).toHaveURL(/\/member/);
  });

  test("a user can log out and log back in", async ({ page }) => {
    const email = uniqueEmail();
    await signUp(page, "E2E Lifter", email, PASSWORD);
    await logout(page);
    await login(page, email, PASSWORD);
    await expect(page).toHaveURL(/\/member/);
  });

  test("signed-out visitors are redirected away from the app", async ({ page }) => {
    await page.goto("/member");
    await expect(page).toHaveURL("/");
  });

  test("signup requires accepting the terms", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Your name").fill("E2E Lifter");
    await page.getByLabel("Email").fill(uniqueEmail());
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("radio", { name: /18 or older/ }).check();
    await page.getByRole("button", { name: "Create free account" }).click();
    await expect(page.getByText(/You must agree to the Terms/i)).toBeVisible();
    await expect(page).toHaveURL(/\/signup/);
  });
});
