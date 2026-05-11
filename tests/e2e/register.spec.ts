import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3002";

function uniqueEmail() {
  return `e2e-register-${Date.now()}@example.com`;
}

test.describe("Registration flow", () => {
  test("navigates to /register from /login sign-up link", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.getByRole("link", { name: /sign up/i }).click();
    await expect(page).toHaveURL(`${BASE_URL}/register`);
  });

  test("shows validation errors on empty submit", async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/name is required/i)).toBeVisible();
    await expect(page.getByText(/enter a valid email/i)).toBeVisible();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });

  test("shows error when passwords do not match", async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    await page.getByLabel("Full name").fill("Test User");
    await page.getByLabel("Email").fill(uniqueEmail());
    await page.getByLabel("Password").fill("password123");
    await page.getByLabel("Confirm password").fill("different123");

    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test("registers successfully and redirects to /dashboard", async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    const email = uniqueEmail();

    await page.getByLabel("Full name").fill("E2E Test User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await page.getByLabel("Confirm password").fill("password123");

    await page.getByRole("button", { name: /create account/i }).click();

    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10_000 });
    await expect(page.locator("body")).toBeVisible();
  });

  test("shows conflict error when email is already registered", async ({ page }) => {
    const email = uniqueEmail();

    await page.goto(`${BASE_URL}/register`);
    await page.getByLabel("Full name").fill("First User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await page.getByLabel("Confirm password").fill("password123");
    await page.getByRole("button", { name: /create account/i }).click();
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10_000 });

    await page.goto(`${BASE_URL}/register`);
    await page.getByLabel("Full name").fill("Second User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password456");
    await page.getByLabel("Confirm password").fill("password456");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/already registered/i)).toBeVisible();
  });

  test("navigates back to /login from register page", async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await page.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });
});
