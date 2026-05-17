import { expect, test } from "@playwright/test";

test.use({ storageState: "tests/.auth/user.json" });

test.describe("Versioning & diff", () => {
  test("paginates versions, highlights price diffs, and restore creates a new version", async ({
    page
  }) => {
    await page.goto("/landings");

    const firstLandingLink = page.locator("a[href^='/landings/']").first();
    await expect(firstLandingLink).toBeVisible();
    await firstLandingLink.click();

    await expect(page).toHaveURL(/\/landings\/[a-z0-9-]+$/);
    const landingMatch = /\/landings\/([a-z0-9-]+)$/.exec(page.url());
    const landingId = landingMatch?.[1];
    expect(landingId).toBeTruthy();

    const seedPayloads = [
      {
        message: "E2E vA",
        grapesJson: { nodes: ["a"] },
        placeholders: { price: "99", oldPrice: "129", currency: "USD", discount: "23" },
        html: "<div>A</div>",
        css: "",
        customCss: "",
        customJs: "",
        setCurrent: true
      },
      {
        message: "E2E vB",
        grapesJson: { nodes: ["b"] },
        placeholders: { price: "79", oldPrice: "129", currency: "USD", discount: "39" },
        html: "<div>B</div>",
        css: "",
        customCss: "",
        customJs: "",
        setCurrent: true
      }
    ];

    for (const payload of seedPayloads) {
      const response = await page.request.post(`/landings/${landingId}/versions`, {
        data: payload
      });
      expect(response.ok()).toBeTruthy();
    }

    for (let i = 0; i < 20; i += 1) {
      const response = await page.request.post(`/landings/${landingId}/versions`, {
        data: {
          message: `E2E page seed ${i + 1}`,
          grapesJson: { nodes: [i] },
          placeholders: { price: String(70 + i), oldPrice: "129", currency: "USD" },
          html: `<div>${i}</div>`,
          css: "",
          customCss: "",
          customJs: "",
          setCurrent: true
        }
      });
      expect(response.ok()).toBeTruthy();
    }

    const pagedResponse = await page.request.get(
      `/landings/${landingId}/versions?take=20`
    );
    expect(pagedResponse.ok()).toBeTruthy();
    const pagedJson = (await pagedResponse.json()) as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(pagedJson.items.length).toBe(20);
    expect(pagedJson.nextCursor).toBeTruthy();

    await page.goto(`/landings/${landingId}/versions`);

    await expect(page.getByRole("heading", { name: /versions/i })).toBeVisible();
    await expect(page.getByText(/E2E vA|E2E vB/)).toBeVisible();
    await expect(page.getByText(/@|Unknown/i).first()).toBeVisible();

    const versionRows = page.locator("div.rounded-md.border > div");
    await expect(versionRows.first()).toBeVisible();

    const fromBtn = versionRows.nth(0).getByRole("button", { name: "From" });
    const toBtn = versionRows.nth(1).getByRole("button", { name: "To" });
    await fromBtn.click();
    await toBtn.click();

    await expect(page.getByText("Price changes")).toBeVisible();
    await expect(page.getByText(/price: .* -> .*/i)).toBeVisible();

    const restoreBtn = versionRows.nth(1).getByRole("button", { name: "Restore" });
    await restoreBtn.click();

    await expect(page.getByText(/Restored from version/i)).toBeVisible();
  });
});
