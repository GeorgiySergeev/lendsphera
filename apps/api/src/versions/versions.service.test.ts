import { describe, expect, it } from "vitest";

const diffFields = [
  "grapesJson",
  "placeholders",
  "html",
  "css",
  "customCss",
  "customJs"
] as const;

describe("version diff behavior", () => {
  it("marks fields as changed when serialized values differ", () => {
    const from = {
      grapesJson: { a: 1 },
      placeholders: {},
      html: "<p>A</p>",
      css: "",
      customCss: "",
      customJs: ""
    };
    const to = {
      grapesJson: { a: 2 },
      placeholders: {},
      html: "<p>A</p>",
      css: "",
      customCss: "",
      customJs: ""
    };

    const result = diffFields.map((field) => ({
      field,
      changed: JSON.stringify(from[field]) !== JSON.stringify(to[field])
    }));

    expect(result.find((item) => item.field === "grapesJson")?.changed).toBe(true);
    expect(result.find((item) => item.field === "html")?.changed).toBe(false);
  });
});
