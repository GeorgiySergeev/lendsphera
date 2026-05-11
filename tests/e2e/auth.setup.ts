import { test as setup, expect } from "@playwright/test";

const authFile = "tests/.auth/user.json";

setup("authenticate", async ({ page }) => {
  const baseURL = process.env.BASE_URL || "http://localhost:3002";
  const email = process.env.TEST_USER_EMAIL || "test@example.com";
  const password = process.env.TEST_USER_PASSWORD || "testpass123";

  // Drive the real UI flow so that:
  //   • the refresh-token HttpOnly cookie is set on the API origin,
  //   • the access token + user land in the Zustand store, and
  //   • the persisted `landing-builder-auth` key is populated.
  await page.goto(`${baseURL}/login`);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL(`${baseURL}/dashboard`);
  await expect(page.locator("body")).toBeVisible();

  await page.context().storageState({ path: authFile });
});
