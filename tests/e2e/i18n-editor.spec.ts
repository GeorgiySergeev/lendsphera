import { expect, test } from "@playwright/test";

test.use({ storageState: "tests/.auth/user.json" });

test.describe("I18n editor", () => {
  test("shows missing filter and localization grid", async ({ page }) => {
    await page.goto("/dashboard/localization");

    await expect(page.getByPlaceholder("Search by key")).toBeVisible();
    const toggle = page.getByRole("button", { name: /Missing for/i });
    await expect(toggle).toBeVisible();
    await toggle.click();

    await expect(page.locator("table")).toBeVisible();
  });
});
