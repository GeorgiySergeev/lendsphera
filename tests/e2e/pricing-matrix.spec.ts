import { expect, test } from "@playwright/test";

test.describe("Pricing Matrix", () => {
  test("opens pricing page and shows matrix shell", async ({ page }) => {
    test.skip(
      !process.env.RUN_E2E_WEB,
      "Set RUN_E2E_WEB=1 when web app + auth fixture are ready."
    );

    await page.goto("/pricing");

    await expect(page.getByRole("heading", { name: /pricing matrix/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search products/i)).toBeVisible();
  });
});
