import { test, expect } from "@playwright/test";

type Variant = { name: string; storyId: string };

type VisualSpec = {
  widget: string;
  variants: Variant[];
};

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 }
] as const;

export function runWidgetVisualSuite(spec: VisualSpec) {
  for (const variant of spec.variants) {
    for (const viewport of VIEWPORTS) {
      test(`${spec.widget} :: ${variant.name} :: ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(`/iframe.html?id=${variant.storyId}&viewMode=story`);
        await page.addStyleTag({
          content: "*{animation:none!important;transition:none!important;}"
        });
        await page.waitForLoadState("networkidle");

        const root = page.locator("#storybook-root");
        await expect(root).toBeVisible();
        await expect(root).toHaveScreenshot(
          `${spec.widget}-${variant.name}-${viewport.name}.png`,
          {
            animations: "disabled",
            caret: "hide",
            scale: "css"
          }
        );
      });
    }
  }
}
