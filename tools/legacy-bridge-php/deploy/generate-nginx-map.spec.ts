import { describe, expect, it } from "vitest";

import {
  buildNginxMapBlock,
  escapeNginxRegex,
  resolvePath,
  sortEntries,
  type LandingMapEntry
} from "./nginx-map-builder";

// ── Fixtures ───────────────────────────────────────────────────────

const makeEntry = (
  overrides: Partial<LandingMapEntry> & { id: string; slug: string; geoCode: string }
): LandingMapEntry => ({
  id: overrides.id,
  slug: overrides.slug,
  legacyRef: overrides.legacyRef ?? null,
  geo: { code: overrides.geoCode }
});

const ENTRIES: readonly LandingMapEntry[] = [
  makeEntry({ id: "cl_urology_de", slug: "urology", geoCode: "DE" }),
  makeEntry({ id: "cl_cardio_de", slug: "cardiology", geoCode: "DE" }),
  makeEntry({ id: "cl_urology_en", slug: "urology", geoCode: "EN" }),
  makeEntry({ id: "cl_diet_en", slug: "diet", geoCode: "EN" })
];

// ── escapeNginxRegex ───────────────────────────────────────────────

describe("escapeNginxRegex", () => {
  it("leaves plain paths unchanged", () => {
    expect(escapeNginxRegex("/de/urology/")).toBe("/de/urology/");
  });

  it("escapes dots in paths with file extensions", () => {
    expect(escapeNginxRegex("/de/page.html")).toBe("/de/page\\.html");
  });

  it("escapes multiple special characters", () => {
    expect(escapeNginxRegex("/de/buy+now?ref=abc")).toBe("/de/buy\\+now\\?ref=abc");
  });
});

// ── resolvePath ────────────────────────────────────────────────────

describe("resolvePath", () => {
  it("uses legacyRef when available", () => {
    const entry = makeEntry({
      id: "x",
      slug: "urology",
      geoCode: "DE",
      legacyRef: "/custom/legacy/path/"
    });
    expect(resolvePath(entry)).toBe("/custom/legacy/path/");
  });

  it("derives /<geoCode>/<slug>/ when legacyRef is null", () => {
    const entry = makeEntry({ id: "x", slug: "urology", geoCode: "DE" });
    expect(resolvePath(entry)).toBe("/de/urology/");
  });

  it("lowercases the geo code", () => {
    const entry = makeEntry({ id: "x", slug: "diet", geoCode: "EN" });
    expect(resolvePath(entry)).toBe("/en/diet/");
  });
});

// ── sortEntries ────────────────────────────────────────────────────

describe("sortEntries", () => {
  it("sorts by geo code first, then slug", () => {
    const sorted = sortEntries(ENTRIES);
    const ids = sorted.map((e) => e.id);
    expect(ids).toEqual(["cl_cardio_de", "cl_urology_de", "cl_diet_en", "cl_urology_en"]);
  });

  it("does not mutate the original array", () => {
    const original = [...ENTRIES];
    sortEntries(ENTRIES);
    expect(ENTRIES).toEqual(original);
  });
});

// ── buildNginxMapBlock ─────────────────────────────────────────────

describe("buildNginxMapBlock", () => {
  it("produces valid nginx map syntax", () => {
    const output = buildNginxMapBlock(ENTRIES);

    expect(output).toContain("map $request_uri $ls_landing_id {");
    expect(output).toContain('    default "";');
    expect(output).toMatch(/\}$/m);
  });

  it("includes all entries", () => {
    const output = buildNginxMapBlock(ENTRIES);

    expect(output).toContain("cl_urology_de");
    expect(output).toContain("cl_cardio_de");
    expect(output).toContain("cl_urology_en");
    expect(output).toContain("cl_diet_en");
  });

  it("produces sorted output", () => {
    const output = buildNginxMapBlock(ENTRIES);
    const entryLines = output
      .split("\n")
      .filter((line) => line.trimStart().startsWith("~^"));

    const ids = entryLines.map((line) =>
      line.trim().split(/\s+/).at(-1)?.replace(";", "")
    );
    expect(ids).toEqual(["cl_cardio_de", "cl_urology_de", "cl_diet_en", "cl_urology_en"]);
  });

  it("is idempotent — same input always produces identical output", () => {
    const first = buildNginxMapBlock(ENTRIES);
    const second = buildNginxMapBlock(ENTRIES);
    expect(first).toBe(second);
  });

  it("is idempotent regardless of input order", () => {
    const reversed = [...ENTRIES].reverse();
    const fromOriginal = buildNginxMapBlock(ENTRIES);
    const fromReversed = buildNginxMapBlock(reversed);
    expect(fromOriginal).toBe(fromReversed);
  });

  it("produces empty map for empty input", () => {
    const output = buildNginxMapBlock([]);

    expect(output).toContain("# Entries: 0");
    expect(output).toContain('    default "";');
    expect(output).toMatch(/map \$request_uri \$ls_landing_id \{\n\s+default "";\n\}/);
  });

  it("uses regex prefix match notation (~^)", () => {
    const output = buildNginxMapBlock([
      makeEntry({ id: "cl_test", slug: "test", geoCode: "DE" })
    ]);

    expect(output).toContain("    ~^/de/test/    cl_test;");
  });

  it("respects legacyRef over derived path", () => {
    const entries: LandingMapEntry[] = [
      makeEntry({
        id: "cl_custom",
        slug: "something",
        geoCode: "DE",
        legacyRef: "/old/custom-path/"
      })
    ];
    const output = buildNginxMapBlock(entries);

    expect(output).toContain("    ~^/old/custom-path/    cl_custom;");
    expect(output).not.toContain("/de/something/");
  });

  it("reports correct entry count in header comment", () => {
    const output = buildNginxMapBlock(ENTRIES);
    expect(output).toContain(`# Entries: ${ENTRIES.length}`);
  });
});
