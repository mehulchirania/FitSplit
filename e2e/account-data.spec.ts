import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { normalizePhone, phoneToEmail } from "../src/lib/phone-identity";
import { fillPin, login, logout, signUp, uniquePhone } from "./helpers/login";

// Admin SDK pointed at the emulators, to assert what the server actions really wrote.
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
const app = getApps()[0] ?? initializeApp({ projectId: "demo-fitsplit" });
const db = getFirestore(app);
const auth = getAuth(app);

const PIN = "4821";

function seededCreds() {
  const file = ".env.test.local";
  if (!existsSync(file)) return null;
  const env = Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
  );
  return env.TEST_USER_PHONE && env.TEST_USER_PIN ? { phone: env.TEST_USER_PHONE, pin: env.TEST_USER_PIN } : null;
}

test.describe("session + account data (emulator)", () => {
  test("seeded user logs in with phone + PIN and lands on Today with the PPL + Upper/Lower plan; cookie is httpOnly; logout clears it", async ({ page, context }) => {
    const creds = seededCreds();
    test.skip(!creds, "run `npm run seed:emulator` first");
    await login(page, creds!.phone, creds!.pin);
    const session = (await context.cookies()).find((c) => c.name === "fitsplit-session");
    expect(session?.httpOnly).toBe(true);
    expect(session?.value.length).toBeGreaterThan(50);

    // Seeded users already follow a plan, so they skip onboarding and land on Today.
    await expect(page).toHaveURL(/\/member$/);
    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Start workout" })).toBeVisible();

    await page.goto("/member/settings");
    await expect(page.getByText("+91 96882 27039")).toBeVisible();
    await page.getByRole("button", { name: /log out/i }).click();
    await page.waitForURL("/");
    expect((await context.cookies()).find((c) => c.name === "fitsplit-session")).toBeUndefined();
    await page.goto("/member");
    await expect(page).toHaveURL("/");
  });

  test("wrong PIN is rejected without revealing whether the number exists", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Sign in", exact: true }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Mobile number").fill(uniquePhone());
    await fillPin(dialog.getByRole("group", { name: "PIN", exact: true }), "0000");
    await dialog.getByRole("button", { name: "Log in" }).click();
    await expect(dialog.getByText(/incorrect mobile number or pin/i)).toBeVisible();
  });

  test("five wrong PINs lock the number, even for the right PIN; no email/OTP/forgot flow offered", async ({ page }) => {
    const phone = uniquePhone();
    await signUp(page, "E2E Locked", phone, PIN);
    await page.context().clearCookies();

    await page.goto("/");
    await page.getByRole("button", { name: "Sign in", exact: true }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/forgot|email|otp/i)).toHaveCount(0);
    await dialog.getByLabel("Mobile number").fill(phone);
    const pinGroup = dialog.getByRole("group", { name: "PIN", exact: true });
    for (let i = 0; i < 5; i++) {
      await fillPin(pinGroup, "0000");
      await dialog.getByRole("button", { name: "Log in" }).click();
      await expect(dialog.getByRole("alert")).toBeVisible();
    }
    await expect(dialog.getByText(/too many wrong pins/i)).toBeVisible();

    // The correct PIN is refused while the number is locked.
    await fillPin(pinGroup, PIN);
    await dialog.getByRole("button", { name: "Log in" }).click();
    await expect(dialog.getByText(/too many wrong pins/i)).toBeVisible();
    await expect(page).toHaveURL("/");
  });

  test("a PIN can be changed from Settings and the new PIN signs in", async ({ page }) => {
    const phone = uniquePhone();
    await signUp(page, "E2E Changer", phone, PIN);
    await page.goto("/member/settings");
    await page.getByRole("button", { name: "Change PIN" }).click();
    const sheet = page.getByRole("dialog");
    await fillPin(sheet.getByRole("group", { name: "Current PIN", exact: true }), PIN);
    await fillPin(sheet.getByRole("group", { name: "New PIN", exact: true }), "7364");
    await fillPin(sheet.getByRole("group", { name: "Confirm new PIN", exact: true }), "7364");
    await sheet.getByRole("button", { name: "Update PIN" }).click();
    await expect(page.getByText("PIN updated.")).toBeVisible();
    await page.context().clearCookies();
    await login(page, phone, "7364");
    await expect(page).toHaveURL(/\/member/);
  });

  test("Settings has no theme toggle and the page is dark", async ({ page }) => {
    await signUp(page, "E2E Dark", uniquePhone(), PIN);
    await page.goto("/member/settings");
    await expect(page.getByText("Appearance")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /theme/i })).toHaveCount(0);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("dark");
  });

  test("profile edit, workout day completion, export and account deletion", async ({ page }) => {
    const phone = uniquePhone();
    await signUp(page, "E2E Deleter", phone, PIN);
    const e164 = normalizePhone(phone)!;
    const uid = (await auth.getUserByEmail(phoneToEmail(e164))).uid;
    expect((await db.doc(`users/${uid}`).get()).exists).toBe(true);

    // profile edit
    await page.goto("/member/settings");
    await page.getByRole("button", { name: "Edit details" }).click();
    await page.getByPlaceholder("e.g. 72").fill("80");
    await page.getByPlaceholder("e.g. 175").fill("180");
    await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
    await expect.poll(async () => (await db.doc(`users/${uid}`).get()).data()?.weightKg, { timeout: 10_000 }).toBe(80);

    // choose a plan, log a set through the real workout screen, then finish the workout
    await page.goto("/member/onboarding");
    await page.getByRole("button", { name: /Full Body/ }).first().click();
    await page.getByRole("button", { name: "Start this plan" }).click();
    await page.waitForURL(/\/member$/);
    await expect.poll(async () => (await db.collection(`users/${uid}/programAssignments`).get()).size, { timeout: 15_000 }).toBeGreaterThan(0);
    await page.getByRole("link", { name: "Start workout" }).click();
    await page.getByLabel("Set 1 weight in kilograms").fill("60");
    await page.getByLabel("Set 1 reps").fill("8");
    await page.getByRole("button", { name: "Complete set 1" }).click();
    await expect
      .poll(async () => (await db.collection(`users/${uid}/liftLogs`).get()).size, { timeout: 15_000 })
      .toBeGreaterThan(0);
    await page.getByRole("button", { name: "Finish", exact: true }).click();
    await page.getByRole("button", { name: "Finish and save" }).click();
    await expect(page.getByRole("heading", { name: "Workout complete" })).toBeVisible();
    await expect
      .poll(async () => (await db.collection(`users/${uid}/dayLogs`).get()).docs.map((d) => d.data().status), { timeout: 15_000 })
      .toContain("completed");
    expect((await db.collection(`users/${uid}/workoutSessions`).get()).size).toBe(1);

    // export (downloads JSON)
    await page.goto("/member/settings");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Download my data/ }).click()
    ]);
    const exported = JSON.parse(readFileSync((await download.path())!, "utf8"));
    expect(exported.meta.userId).toBe(uid);
    expect(exported.account.phone).toBe(e164);
    expect(exported.account.email).toBeUndefined();
    expect(exported.liftLogs.length).toBeGreaterThan(0);
    expect(exported.dayLogs.length).toBeGreaterThan(0);

    // delete
    await page.getByRole("button", { name: "Delete account" }).click();
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
