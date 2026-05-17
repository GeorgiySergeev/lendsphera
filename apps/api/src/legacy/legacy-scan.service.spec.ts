import path from "node:path";
import { describe, expect, it } from "vitest";

import { LegacyScanService } from "./legacy-scan.service";

describe("LegacyScanService", () => {
  it("scans deterministic inventory fixtures with price and product hints", async () => {
    const service = new LegacyScanService();
    const root = path.resolve(process.cwd(), "test/fixtures/legacy");

    const results = await service.scan(root);

    expect(results).toHaveLength(4);
    expect(results.map((item) => item.legacyRef)).toEqual([
      "lander/DE/diabetes/gluco-balance",
      "lander/PL/potency/maxon-plus",
      "lander/RO/parasites/cleanse-24",
      "lander/UA/prostatitis/prostafix-uk"
    ]);

    const de = results.find(
      (item) => item.legacyRef === "lander/DE/diabetes/gluco-balance"
    );
    const pl = results.find((item) => item.legacyRef === "lander/PL/potency/maxon-plus");
    const ro = results.find(
      (item) => item.legacyRef === "lander/RO/parasites/cleanse-24"
    );
    const ua = results.find(
      (item) => item.legacyRef === "lander/UA/prostatitis/prostafix-uk"
    );

    expect(de?.priceCandidate).toBe(39.5);
    expect(ro?.priceCandidate).toBe(129.99);
    expect(pl?.priceCandidate).toBeNull();
    expect(ua?.productHint).toContain("Prostafix");
    expect(de?.productHints.join(" ").toLowerCase()).toContain("gluco");
  });
});
