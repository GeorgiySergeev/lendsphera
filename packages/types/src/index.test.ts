import { describe, expect, it } from "vitest";

import {
  LandingDocumentSchema,
  PlaceholderFieldSchema,
  PlaceholderSchemaSchema,
  PlaceholderValueSchema
} from "./index";

describe("LandingDocumentSchema", () => {
  it("accepts a minimal landing document", () => {
    const parsed = LandingDocumentSchema.parse({
      id: "landing_1",
      slug: "summer-launch",
      title: "Summer Launch"
    });

    expect(parsed.widgets).toEqual([]);
    expect(parsed.publishedAt).toBeNull();
  });

  it("rejects invalid slugs", () => {
    expect(() =>
      LandingDocumentSchema.parse({
        id: "landing_1",
        slug: "Summer Launch",
        title: "Summer Launch"
      })
    ).toThrow();
  });
});

describe("PlaceholderSchema", () => {
  it("accepts grouped placeholder fields with defaults and options", () => {
    const parsed = PlaceholderSchemaSchema.parse({
      fields: [
        {
          defaultValue: "Launch faster",
          group: "Hero",
          key: "headline",
          label: "Headline",
          required: true,
          type: "text"
        },
        {
          group: "Hero",
          key: "theme",
          label: "Theme",
          options: [
            { label: "Blue", value: "blue" },
            { label: "Green", value: "green" }
          ],
          type: "select"
        }
      ]
    });

    expect(parsed.fields[0]?.group).toBe("Hero");
    expect(parsed.fields[1]?.options).toHaveLength(2);
  });

  it("defaults field group and required state", () => {
    const parsed = PlaceholderFieldSchema.parse({
      key: "ctaText",
      label: "CTA text",
      type: "text"
    });

    expect(parsed.group).toBe("Content");
    expect(parsed.required).toBe(false);
  });

  it("accepts primitive and array placeholder values", () => {
    expect(
      PlaceholderValueSchema.parse({
        bullets: ["Fast", "Safe"],
        enabled: true,
        headline: "Hello",
        score: 42
      })
    ).toEqual({
      bullets: ["Fast", "Safe"],
      enabled: true,
      headline: "Hello",
      score: 42
    });
  });

  it("rejects invalid field types", () => {
    expect(() =>
      PlaceholderFieldSchema.parse({
        key: "headline",
        label: "Headline",
        type: "date"
      })
    ).toThrow();
  });
});
