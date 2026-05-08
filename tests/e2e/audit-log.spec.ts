import { test, expect } from "@playwright/test";

test.use({ storageState: "tests/.auth/user.json" });

test.describe("Audit Log", () => {
  test("should display global audit log", async ({ page }) => {
    await page.goto("/dashboard/audit");

    await expect(page.getByRole("heading", { name: "Audit Log" })).toBeVisible();

    await expect(page.getByRole("table")).toBeVisible();

    await expect(page.getByRole("columnheader", { name: /timestamp/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /action/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /entity/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /user/i })).toBeVisible();
  });

  test("should display per-landing audit log", async ({ page }) => {
    await page.goto("/dashboard/landings");

    const firstLandingId = await page
      .locator('[data-testid="landing-row"]')
      .first()
      .getAttribute("data-landing-id");

    if (firstLandingId) {
      await page.goto(`/dashboard/landings/${firstLandingId}/audit`);

      await expect(
        page.getByRole("heading", { name: /landing audit log/i })
      ).toBeVisible();

      await expect(page.getByRole("table")).toBeVisible();
    }
  });
});
