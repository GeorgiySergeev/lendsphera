import path from "node:path";
import { describe, expect, it } from "vitest";

import { PlaceholderPlannerService } from "./placeholder-planner.service";
import type { PriceContext } from "./placeholder-planner.service";

const FIXTURE_ROOT = path.resolve(process.cwd(), "test/fixtures/placeholder");
const LEGACY_REF = "lander/DE/diabetes/gluco-balance";

const createPlanner = () => new PlaceholderPlannerService();

const prices: PriceContext = {
  price: "39.50",
  oldPrice: "79.00",
  currency: "EUR"
};

describe("PlaceholderPlannerService", () => {
  describe("plan", () => {
    it("generates replacements for known price values in index.php", async () => {
      const planner = createPlanner();
      const result = await planner.plan(
        "test-landing-id",
        LEGACY_REF,
        FIXTURE_ROOT,
        prices
      );

      const priceEntries = result.manifest.entries.filter((e) => e.key === "LS_PRICE");
      expect(priceEntries.length).toBeGreaterThanOrEqual(2);

      for (const entry of priceEntries) {
        expect(entry.after).toBe("{{LS_PRICE}}");
        expect(["39.50", "39,50"]).toContain(entry.before);
      }
    });

    it("generates replacements for old price values", async () => {
      const planner = createPlanner();
      const result = await planner.plan(
        "test-landing-id",
        LEGACY_REF,
        FIXTURE_ROOT,
        prices
      );

      const oldPriceEntries = result.manifest.entries.filter(
        (e) => e.key === "LS_OLD_PRICE"
      );
      expect(oldPriceEntries.length).toBeGreaterThanOrEqual(1);
      expect(oldPriceEntries[0].after).toBe("{{LS_OLD_PRICE}}");
      expect(oldPriceEntries[0].before).toBe("79.00");
    });

    it("does NOT rewrite CSS false positive (1.99rem)", async () => {
      const planner = createPlanner();
      const noPrices: PriceContext = {
        price: "1.99",
        oldPrice: null,
        currency: "EUR"
      };

      const result = await planner.plan(
        "test-landing-id",
        LEGACY_REF,
        FIXTURE_ROOT,
        noPrices
      );

      const cssEntries = result.manifest.entries.filter((e) => e.file === "style.css");
      expect(cssEntries).toHaveLength(0);

      const falsePositiveRewrites = result.manifest.entries.filter(
        (e) => e.offset !== undefined && e.before === "1.99"
      );
      for (const entry of falsePositiveRewrites) {
        const lineContext = entry.context;
        expect(lineContext).not.toMatch(/1\.99rem/);
      }
    });

    it("does NOT rewrite a value preceded by a letter (JS variable like trackingVersion = 2.99)", async () => {
      const planner = createPlanner();
      const pricesWithTracking: PriceContext = {
        price: "2.99",
        oldPrice: null,
        currency: "EUR"
      };

      const result = await planner.plan(
        "test-landing-id",
        LEGACY_REF,
        FIXTURE_ROOT,
        pricesWithTracking
      );

      const hasTrackingRewrite = result.manifest.entries.some((e) =>
        e.context.includes("trackingVersion")
      );
      expect(hasTrackingRewrite).toBe(false);
    });

    it("attaches context with surrounding lines for each replacement", async () => {
      const planner = createPlanner();
      const result = await planner.plan(
        "test-landing-id",
        LEGACY_REF,
        FIXTURE_ROOT,
        prices
      );

      for (const entry of result.manifest.entries) {
        expect(entry.context).toBeTruthy();
        expect(entry.context.split("\n").length).toBeGreaterThanOrEqual(1);
      }
    });

    it("produces patches with patched content different from original", async () => {
      const planner = createPlanner();
      const result = await planner.plan(
        "test-landing-id",
        LEGACY_REF,
        FIXTURE_ROOT,
        prices
      );

      expect(result.patches.length).toBeGreaterThanOrEqual(1);
      for (const patch of result.patches) {
        expect(patch.patched).not.toBe(patch.original);
        expect(patch.patched).toContain("{{LS_PRICE}}");
      }
    });

    it("returns empty entries when prices are null", async () => {
      const planner = createPlanner();
      const noPrices: PriceContext = {
        price: null,
        oldPrice: null,
        currency: null
      };

      const result = await planner.plan(
        "test-landing-id",
        LEGACY_REF,
        FIXTURE_ROOT,
        noPrices
      );

      expect(result.manifest.entries).toHaveLength(0);
      expect(result.patches).toHaveLength(0);
    });

    it("populates manifest metadata correctly", async () => {
      const planner = createPlanner();
      const result = await planner.plan(
        "test-landing-id",
        LEGACY_REF,
        FIXTURE_ROOT,
        prices
      );

      expect(result.manifest.landingId).toBe("test-landing-id");
      expect(result.manifest.legacyRef).toBe(LEGACY_REF);
      expect(result.manifest.createdAt).toBeTruthy();
    });

    it("each entry has required shape with key, before, after, context, file, offset", async () => {
      const planner = createPlanner();
      const result = await planner.plan(
        "test-landing-id",
        LEGACY_REF,
        FIXTURE_ROOT,
        prices
      );

      for (const entry of result.manifest.entries) {
        expect(entry).toEqual(
          expect.objectContaining({
            key: expect.any(String),
            before: expect.any(String),
            after: expect.any(String),
            context: expect.any(String),
            file: expect.any(String),
            offset: expect.any(Number)
          })
        );
      }
    });
  });

  describe("isAlreadyMigrated", () => {
    it("returns true when manifest has entries", () => {
      const planner = createPlanner();
      expect(
        planner.isAlreadyMigrated({
          entries: [{ key: "LS_PRICE" }]
        })
      ).toBe(true);
    });

    it("returns false when manifest is null", () => {
      const planner = createPlanner();
      expect(planner.isAlreadyMigrated(null)).toBe(false);
    });

    it("returns false when manifest has empty entries", () => {
      const planner = createPlanner();
      expect(planner.isAlreadyMigrated({ entries: [] })).toBe(false);
    });
  });
});
