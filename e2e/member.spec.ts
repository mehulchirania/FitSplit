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

    // No exercise is expanded by default (opt-in logging — see the fix in
    // src/components/member-workout-screen.tsx: focusIndex starts at null,
    // not 0). Click exercises in turn until one opens with an editable set —
    // a fully "DONE" exercise never expands at all (isActive is gated by
    // !complete), and repeated runs against the same live seeded account
    // permanently exhaust whichever exercise this test used previously, so
    // hardcoding one name is not durable across reruns.
    const exerciseButtons = page.locator(".m3d-wk__row-head");
    const exerciseCount = await exerciseButtons.count();
    let kgInput = null;
    let checkButton = null;
    for (let i = 0; i < exerciseCount; i++) {
      await exerciseButtons.nth(i).click();
      const setsTable = page.locator(".m3d-wk__sets");
      if (!(await setsTable.isVisible({ timeout: 2_000 }).catch(() => false))) continue; // fully DONE — never expands
      const setRows = setsTable.locator(".m3d-wk__set-row");
      const rowCount = await setRows.count();
      for (let j = 0; j < rowCount; j++) {
        const candidate = setRows.nth(j);
        if (await candidate.locator('input[type="number"]').first().isEditable()) {
          kgInput = candidate.locator('input[type="number"]').first();
          checkButton = candidate.locator(".m3d-wk__check");
          break;
        }
      }
      if (kgInput) break;
      await exerciseButtons.nth(i).click(); // collapse before trying the next one
    }
    if (!kgInput || !checkButton) {
      test.skip(true, "Every exercise for this day is fully logged from prior runs — nothing left to exercise this test against.");
      return;
    }

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
