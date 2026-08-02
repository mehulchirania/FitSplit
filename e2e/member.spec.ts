import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers/login";

async function clickTab(page: Page, name: string) {
  // getByRole("button", ...) inexplicably finds zero matches for these sidebar
  // items (src/components/member-coach-shell.tsx .m3d-side__item buttons)
  // despite them being real, visible, clickable <button> elements confirmed
  // via direct DOM inspection — some accessibility-tree quirk not chased down
  // further. The CSS class locator is proven reliable; using it instead.
  const tab = page.locator(".m3d-side__item", { hasText: name });
  await expect(tab.first()).toBeVisible({ timeout: 10_000 });
  await tab.first().click();
}

test.describe("member core loop", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "member", "mehul", "1234");
  });

  test("overview shows the assigned program and today's focus", async ({ page }) => {
    await expect(page).toHaveURL(/\/member/);
    await expect(page.getByText(/Push Pull Legs/)).toBeVisible();
    await expect(page.getByText(/ADHERENCE/)).toBeVisible();
  });

  test("can log a workout set", async ({ page }) => {
    await clickTab(page, "Workout");
    await expect(page).toHaveURL(/\/member/);

    // Focus an exercise (its set-input rows only render for the active node —
    // src/components/member-workout-screen.tsx renders one .m3d-wk__sets table
    // per exercise, but only the clicked one is populated/interactive).
    // "Dumbbell Lateral Raise" is never touched by any other test in this
    // suite, so its sets are reliably unlogged across repeated runs (unlike
    // "Overhead Press", whose set 1 gets permanently logged the first time
    // this test passes, making its kg input read-only on every subsequent run).
    await page.getByRole("button", { name: /Dumbbell Lateral Raise/ }).first().click();

    const activeRow = page.locator(".m3d-wk__node--active").locator("xpath=ancestor::div[contains(@class,'m3d-wk__row')][1]");
    const setRows = activeRow.locator(".m3d-wk__set-row");
    // Find the first not-yet-logged set (kg input still enabled) so repeated
    // runs against the same seeded account progress 1→2→3 instead of always
    // hitting an already-logged, read-only set 1.
    const rowCount = await setRows.count();
    let targetRow = setRows.first();
    for (let i = 0; i < rowCount; i++) {
      const candidate = setRows.nth(i);
      if (await candidate.locator('input[type="number"]').first().isEditable()) {
        targetRow = candidate;
        break;
      }
      if (i === rowCount - 1) {
        test.skip(true, "All 3 sets for this exercise are already logged from prior runs — nothing left to exercise this test against.");
      }
    }
    const kgInput = targetRow.locator('input[type="number"]').first();
    const checkButton = targetRow.locator(".m3d-wk__check");

    const setsProgress = page.getByText(/of \d+ sets/);
    const beforeText = await setsProgress.textContent();
    const beforeCount = Number(beforeText?.match(/^(\d+)/)?.[1] ?? 0);

    await kgInput.fill("40");
    await checkButton.click();
    await expect(setsProgress).toHaveText(new RegExp(`^${beforeCount + 1} of`), { timeout: 10_000 });

    // Logging is a Server Action write; confirm the count survives a reload
    // rather than just reflecting optimistic client-only state. The active
    // tab is client-side React state (not a URL route), so reload always
    // lands back on Overview — re-open Workout to see the persisted count.
    await page.reload();
    await clickTab(page, "Workout");
    await expect(page.getByText(/of \d+ sets/)).toHaveText(new RegExp(`^${beforeCount + 1} of`), { timeout: 10_000 });
  });

  test("can log a meal via quick add and see it reflected in today's totals", async ({ page }) => {
    await clickTab(page, "Macros");
    await expect(page).toHaveURL(/\/member/);

    const preset = page.getByRole("button", { name: /Whey shake/ });
    await preset.click();
    await expect(page.getByText(/Whey shake/).first()).toBeVisible({ timeout: 10_000 });

    // Confirm it's a real write, not optimistic-only UI: reload and re-check.
    // (active tab is client state, not a URL route — reload lands on Overview.)
    await page.reload();
    await clickTab(page, "Macros");
    await expect(page.getByText(/Whey shake/).first()).toBeVisible({ timeout: 10_000 });
  });

  test("progress tab shows PR history", async ({ page }) => {
    await clickTab(page, "Progress");
    await expect(page).toHaveURL(/\/member/);
    await expect(page.getByText(/Personal Record|PR/i).first()).toBeVisible();
  });
});
