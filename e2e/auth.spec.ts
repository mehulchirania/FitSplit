import { test, expect } from "@playwright/test";
import { fillPin, fillSignup, login, logout, signUp, uniquePhone } from "./helpers/login";

const PIN = "4821";

test.describe("accounts", () => {
  test("a new user can sign up with a mobile number and PIN and lands in the workout app", async ({ page }) => {
    await signUp(page, "E2E Lifter", uniquePhone(), PIN);
    await expect(page).toHaveURL(/\/member/);
  });

  test("a user can log out and log back in", async ({ page }) => {
    const phone = uniquePhone();
    await signUp(page, "E2E Lifter", phone, PIN);
    await logout(page);
    await login(page, phone, PIN);
    await expect(page).toHaveURL(/\/member/);
  });

  test("signed-out visitors are redirected away from the app", async ({ page }) => {
    await page.goto("/member");
    await expect(page).toHaveURL("/");
  });

  test("signup requires accepting the terms", async ({ page }) => {
    await fillSignup(page, "E2E Lifter", uniquePhone(), PIN);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText(/You must agree to the Terms/i)).toBeVisible();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("signup rejects mismatched PINs and an invalid number", async ({ page }) => {
    await fillSignup(page, "E2E Lifter", uniquePhone(), PIN, "1111");
    await page.getByRole("checkbox", { name: /I agree to the/ }).check();
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText(/two PINs do not match/i)).toBeVisible();

    await page.getByLabel("Mobile number").fill("12345");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText(/valid 10-digit mobile number/i)).toBeVisible();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("the PIN boxes raise the numeric keypad and mask what is typed", async ({ page }) => {
    await page.goto("/signup");
    const pin = page.getByRole("group", { name: "PIN", exact: true });
    await expect(pin.locator("input")).toHaveCount(4);
    for (const box of await pin.locator("input").all()) {
      await expect(box).toHaveAttribute("inputmode", "numeric");
      await expect(box).toHaveAttribute("type", "password");
    }
    await expect(page.getByLabel("Mobile number")).toHaveAttribute("inputmode", "numeric");
    await fillPin(pin, "12ab34");
    await expect(pin.locator("input").nth(0)).toHaveValue("1");
    await expect(pin.locator("input").nth(3)).toHaveValue("4");
  });

  test("a second signup with the same number is refused", async ({ page }) => {
    const phone = uniquePhone();
    await signUp(page, "E2E Lifter", phone, PIN);
    await logout(page);
    await fillSignup(page, "Someone Else", phone, "9999");
    await page.getByRole("checkbox", { name: /I agree to the/ }).check();
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText(/already exists/i)).toBeVisible();
  });
});
