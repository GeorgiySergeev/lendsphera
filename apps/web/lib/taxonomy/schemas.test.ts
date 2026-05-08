import { describe, expect, it } from "vitest";

import {
  categoryFormSchema,
  geoFormSchema,
  parseGeoCsvText,
  variantFormSchema
} from "./schemas";

describe("taxonomy schemas", () => {
  it("validates required inline GEO fields", () => {
    expect(
      geoFormSchema.safeParse({
        code: "US",
        currency: "USD",
        isActive: true,
        language: "en",
        name: "United States",
        timezone: "America/New_York"
      }).success
    ).toBe(true);
    expect(
      geoFormSchema.safeParse({
        code: "",
        currency: "USD",
        isActive: true,
        language: "en",
        name: ""
      }).success
    ).toBe(false);
  });

  it("validates category and variant slugs", () => {
    expect(
      categoryFormSchema.safeParse({
        color: "#22c55e",
        description: "",
        icon: "activity",
        isActive: true,
        name: "Diabetes",
        slug: "diabetes-care"
      }).success
    ).toBe(true);
    expect(
      variantFormSchema.safeParse({
        description: "",
        icon: "quiz",
        isActive: true,
        name: "Quiz",
        slug: "Bad Slug"
      }).success
    ).toBe(false);
  });

  it("parses GEO CSV rows and reports invalid rows", () => {
    const result = parseGeoCsvText(
      "code,name,language,currency,flagEmoji,isActive\nUS,United States,en,USD,🇺🇸,true\nX,,en,USD,,true"
    );

    expect(result.rows).toEqual([
      {
        code: "US",
        currency: "USD",
        flagEmoji: "🇺🇸",
        isActive: true,
        language: "en",
        name: "United States"
      }
    ]);
    expect(result.errors).toHaveLength(1);
  });
});
