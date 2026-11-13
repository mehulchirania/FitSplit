import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { login, logout, signUp, uniqueEmail } from "./helpers/login";

// Admin SDK pointed at the emulators, to assert what the server actions really wrote.
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
const app = getApps()[0] ?? initializeApp({ projectId: "demo-fitsplit" });
const db = getFirestore(app);
const auth = getAuth(app);

const PASSWORD = "e2e-password-123";

function seededCreds() {
  const file = ".env.test.local";
  if (!existsSync(file)) return null;
  const env = Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
  );
  return env.TEST_USER_EMAIL && env.TEST_USER_PASSWORD
    ? { email: env.TEST_USER_EMAIL, password: env.TEST_USER_PASSWORD }
    : null;
}

test.describe("session + account data (emulator)", () => {
  test("seeded test user can log in; session cookie is httpOnly; logout clears it", async ({ page, context }) => {
    const creds = seededCreds();
    test.skip(!creds, "run `npm run seed:emulator` first");
    await login(page, creds!.email, creds!.password);
    const session = (await context.cookies()).find((c) => c.name === "fitsplit-session");
    expect(session?.httpOnly).toBe(true);
    expect(session?.value.length).toBeGreaterThan(50);

    await page.goto("/member/settings");
    await page.getByRole("button", { name: /log out/i }).click();
    await page.waitForURL("/");
    expect((await context.cookies()).find((c) => c.name === "fitsplit-session")).toBeUndefined();
    await page.goto("/member");
    await expect(page).toHaveURL("/");
  });

  test("wrong password is rejected", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Sign in", exact: true }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("#lp-login-user").fill("nobody@fitsplit.test");
    await dialog.locator("#lp-login-pass").fill("wrong-password-1");
    await dialog.getByRole("button", { name: "Log in" }).click();
    await expect(dialog.getByText(/invalid email or password/i)).toBeVisible();
  });

  test("profile edit, workout day completion, export and account deletion", async ({ page }) => {
    const email = uniqueEmail();
    await signUp(page, "E2E Deleter", email, PASSWORD);
    const uid = (await auth.getUserByEmail(email)).uid;
    expect((await db.doc(`users/${uid}`).get()).exists).toBe(true);

    // profile edit
    await page.goto("/member/settings");
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByPlaceholder("e.g. 72").fill("80");
    await page.getByPlaceholder("e.g. 175").fill("180");
    await page.getByRole("button", { name: /save/i }).first().click();
    await expect.poll(async () => (await db.doc(`users/${uid}`).get()).data()?.weightKg, { timeout: 10_000 }).toBe(80);

    // start a split and mark a day done
    await page.goto("/member/programs");
    await page.getByRole("button", { name: /Start this split/ }).first().click();
    await expect.poll(async () => (await db.collection(`users/${uid}/programAssignments`).get()).size, { timeout: 15_000 }).toBeGreaterThan(0);
    const assignment = (await db.collection(`users/${uid}/programAssignments`).get()).docs[0].data();
    const programId = assignment.programId as string;
    // log a set through the real workout screen, then finish the day
    await page.goto("/member");
    await page.getByRole("button", { name: "Workout", exact: true }).or(page.getByRole("link", { name: "Workout", exact: true })).first().click();
    const row = page.locator(".m3d-wk__set-row").first();
    if (!(await row.isVisible().catch(() => false))) await page.locator(".m3d-wk__row-head").first().click();
    await row.waitFor({ timeout: 30_000 });
    await row.locator("input[type=number]").nth(0).fill("60");
    await row.locator("input[type=number]").nth(1).fill("8");
    await row.locator(".m3d-wk__check").click();
    await expect
      .poll(async () => (await db.collection(`users/${uid}/liftLogs`).get()).size, { timeout: 15_000 })
      .toBeGreaterThan(0);
    await page.getByRole("button", { name: "Finish workout" }).click();
    await expect
      .poll(async () => (await db.collection(`users/${uid}/dayLogs`).get()).docs.map((d) => d.data().status), { timeout: 15_000 })
      .toContain("completed");
    expect(programId).toBeTruthy();

    // export (downloads JSON)
    await page.goto("/member/settings");
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download" }).click()
    ]);
    const exported = JSON.parse(readFileSync((await download.path())!, "utf8"));
    expect(exported.meta.userId).toBe(uid);
    expect(exported.account.email).toBe(email);
    expect(exported.liftLogs.length).toBeGreaterThan(0);
    expect(exported.dayLogs.length).toBeGreaterThan(0);

    // delete
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("button", { name: "Delete everything" }).click();
    await page.waitForURL(/\/(\?deleted=1)?$/, { timeout: 20_000 });
    expect((await db.doc(`users/${uid}`).get()).exists).toBe(false);
    expect((await db.collection(`users/${uid}/programAssignments`).get()).size).toBe(0);
    await expect(auth.getUser(uid)).rejects.toThrow();
    await page.goto("/member");
    await expect(page).toHaveURL(/\/$/);
    void logout;
  });
});
