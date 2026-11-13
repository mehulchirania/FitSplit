import { test, expect } from "@playwright/test";
import { signUp, uniquePhone } from "./helpers/login";

test.describe("workout app", () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page, "E2E Lifter", uniquePhone(), "4821");
  });

  test("a new user is asked to choose a plan, then lands on Today", async ({ page }) => {
    await expect(page).toHaveURL(/\/member\/onboarding/);
    await expect(page.getByRole("heading", { name: "Choose your plan" })).toBeVisible();
    await page.getByRole("button", { name: /Full Body/ }).first().click();
    await page.getByRole("button", { name: "Start this plan" }).click();
    await page.waitForURL(/\/member$/);
    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Start workout" })).toBeVisible();
  });

  test("lists the built-in workout plans", async ({ page }) => {
    await page.goto("/member/programs");
    await expect(page.getByRole("heading", { name: "Plans", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Push \/ Pull \/ Legs/ })).toBeVisible();
  });

  test("lists the exercise library", async ({ page }) => {
    await page.goto("/member/exercises");
    await expect(page.getByRole("heading", { name: "Exercises", exact: true })).toBeVisible();
  });
});
