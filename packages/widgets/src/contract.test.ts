import { describe, expect, it } from "vitest";
import { z } from "zod";

import { defineWidget } from "./contract";

describe("defineWidget", () => {
  it("exposes parse and meta from editor metadata", () => {
    const widget = defineWidget({
      kind: "hero",
      schema: z.object({ title: z.string().min(1) }),
      editor: { meta: { label: "Hero", icon: "panel", group: "Layout" } },
      render: (props) => `<h1>${props.title}</h1>`
    });

    expect(widget.meta.label).toBe("Hero");
    expect(widget.parse({ title: "Launch" })).toEqual({ title: "Launch" });
  });

  it("throws on invalid props through parse", () => {
    const widget = defineWidget({
      kind: "form",
      schema: z.object({ title: z.string().min(1) }),
      editor: { meta: { label: "Form", icon: "form", group: "Conversion" } },
      render: () => ""
    });

    expect(() => widget.parse({ title: "" })).toThrow();
  });
});
