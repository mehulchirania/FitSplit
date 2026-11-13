import { test, expect } from "@playwright/test";
import { signUp, uniqueEmail } from "./helpers/login";

test.describe("workout app", () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page, "E2E Lifter", uniqueEmail(), "e2e-password-123");
  });

  test("shows the overview for a user with no plan yet", async ({ page }) => {
    await expect(page.getByText(/No plan selected/).first()).toBeVisible();
  });

  test("lists the built-in workout plans", async ({ page }) => {
    await page.goto("/member/programs");
    await expect(page.getByRole("heading", { name: "Workout Programs" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Start this split/ }).first()).toBeVisible();
  });

  test("lists the exercise library", async ({ page }) => {
    await page.goto("/member/exercises");
    await expect(page.getByText("Exercise Catalog")).toBeVisible();
  });
});
