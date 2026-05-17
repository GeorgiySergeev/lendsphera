import { describe, expect, it } from "vitest";

import { getWidget, renderTree } from "./registry";

describe("renderTree", () => {
  it("renders valid widgets", () => {
    const result = renderTree(
      [
        {
          id: "1",
          kind: "hero",
          props: { title: "T", subtitle: "S", ctaLabel: "Go", ctaUrl: "#" }
        }
      ],
      { env: "development" }
    );

    expect(result[0]?.html).toContain("lsw-hero");
  });

  it("returns visible placeholder in development for invalid props", () => {
    const result = renderTree([{ id: "1", kind: "hero", props: { title: "" } }], {
      env: "development"
    });

    expect(result[0]?.html).toContain("data-widget-error");
  });

  it("returns empty fragment in production for invalid props", () => {
    const result = renderTree([{ id: "1", kind: "hero", props: { title: "" } }], {
      env: "production"
    });

    expect(result[0]?.html).toBe("");
  });

  it("is referentially stable for identical input", () => {
    const specs = [
      {
        id: "1",
        kind: "form",
        props: { title: "A", fields: ["name"], buttonLabel: "Send", consentLabel: "Ok" }
      }
    ] as const;
    const ctx = { env: "development" } as const;

    const first = renderTree(specs, ctx);
    const second = renderTree(specs, ctx);

    expect(second).toBe(first);
  });

  it("exposes widget metadata", () => {
    const widget = getWidget("price-block");

    expect(widget?.meta.group).toBe("Conversion");
  });
});
