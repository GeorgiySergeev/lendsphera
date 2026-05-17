import { test, expect } from "@playwright/test";

test.use({ storageState: "tests/.auth/user.json" });

test.describe("Landing editor", () => {
  test("opens edit route from landings list", async ({ page }) => {
    await page.goto("/landings");

    const firstView = page.getByRole("link", { name: /view/i }).first();
    await expect(firstView).toBeVisible();
    await firstView.click();

    await expect(page).toHaveURL(/\/landings\/[a-z0-9-]+/);

    await page.goto(`${page.url()}/edit`);

    await expect(page).toHaveURL(/\/landings\/[a-z0-9-]+\/edit/);
    await expect(page.getByText(/widget palette/i)).toBeVisible();
    await expect(page.getByText(/canvas/i)).toBeVisible();
    await expect(page.getByText(/props/i)).toBeVisible();
  });
});
