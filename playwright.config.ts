import { defineConfig, devices } from "@playwright/test";

/**
 * E2E suite runs against the real dev server, which talks to real production
 * Firestore (fitsplit-29215) — there is no separate staging environment yet.
 * All specs use existing seeded demo accounts (docs/04_TESTING_AND_LOGINS.md)
 * and any state they mutate (suspend/reactivate, etc.) is reverted in the
 * same spec so re-runs stay idempotent.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // shared Firestore state — avoid cross-test races
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000
  }
});
