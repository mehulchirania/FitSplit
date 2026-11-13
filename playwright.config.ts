import { defineConfig, devices } from "@playwright/test";
import { emulatorEnv } from "./scripts/emulator-env.mjs";

/**
 * E2E suite runs against the local dev server. Without Firebase credentials (or with
 * FITSPLIT_LOCAL_MODE=true) the app runs in its no-Firebase local mode, which is
 * enough to exercise signup, login and the workout screens. Each spec creates its
 * own throwaway account.
 */
const PORT = process.env.E2E_PORT ?? "3100"; // 3000 is left free for your own dev server

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // shared Firestore state — avoid cross-test races
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  timeout: 120_000, // first hits compile pages on demand in next dev
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Runs against the Firebase emulators (start them first: npm run emulators).
    command: `npx next dev --webpack -p ${PORT}`,
    env: { ...emulatorEnv, NEXT_DIST_DIR: ".next-e2e" },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !!process.env.PW_REUSE_SERVER,
    timeout: 60_000
  }
});
