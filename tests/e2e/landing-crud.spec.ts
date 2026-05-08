import { test, expect } from "@playwright/test";

test.use({ storageState: "tests/.auth/user.json" });

test.describe("Landing CRUD Flow", () => {
  test("should create, edit, and publish a landing", async ({ page }) => {
    await page.goto("/dashboard/landings");

    await expect(page.getByRole("heading", { name: "Landings" })).toBeVisible();

    await page.getByRole("button", { name: /create landing/i }).click();

    await page.getByLabel(/landing name/i).fill("Test Landing E2E");

    await page.getByRole("combobox", { name: /geo/i }).click();
    await page.getByRole("option").first().click();

    await page.getByRole("combobox", { name: /category/i }).click();
    await page.getByRole("option").first().click();

    await page.getByRole("combobox", { name: /variant/i }).click();
    await page.getByRole("option").first().click();

    await page.getByRole("combobox", { name: /template/i }).click();
    await page.getByRole("option").first().click();

    await page.getByRole("button", { name: /create/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/landings\/[a-z0-9]+\/edit/);

    await expect(page.getByText(/editor locked/i)).toBeVisible({ timeout: 10000 });

    await page.keyboard.press("Control+S");

    await expect(page.getByText(/draft saved/i)).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: /publish/i }).click();

    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("button", { name: /confirm/i }).click();

    await expect(page.getByText(/published/i)).toBeVisible({ timeout: 15000 });

    await page.getByRole("link", { name: /exit/i }).click();

    await expect(page).toHaveURL("/dashboard/landings");

    await expect(page.getByText("Test Landing E2E")).toBeVisible();
  });

  test("should use keyboard shortcuts", async ({ page }) => {
    await page.goto("/dashboard/landings");

    await page.getByRole("link", { name: /edit/i }).first().click();

    await expect(page).toHaveURL(/\/dashboard\/landings\/[a-z0-9]+\/edit/);

    await page.keyboard.press("Shift+?");

    await expect(page.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});
