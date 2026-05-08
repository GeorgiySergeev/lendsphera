import { describe, expect, it } from "vitest";

import {
  buildDefaultProps,
  createWidgetSdk,
  renderWidget,
  serializeWidgetProps
} from "./index";
import { pickPrize } from "./fortune-wheel";

describe("widgets SDK", () => {
  it("sorts widgets by order", () => {
    const sdk = createWidgetSdk({
      id: "landing_1",
      slug: "demo",
      title: "Demo",
      publishedAt: null,
      widgets: [
        { id: "second", type: "cta", order: 2, props: {} },
        { id: "first", type: "hero", order: 1, props: {} }
      ]
    });

    expect(sdk.listWidgets().map((widget) => widget.id)).toEqual(["first", "second"]);
  });

  it("escapes rendered widget content", () => {
    const rendered = renderWidget({
      id: "hero",
      type: "hero",
      order: 0,
      props: {
        heading: "<Launch>",
        body: "Ready & live"
      }
    });

    expect(rendered.html).toContain("&lt;Launch&gt;");
    expect(rendered.html).toContain("Ready &amp; live");
  });

  it("builds default props from widget schema", () => {
    expect(
      buildDefaultProps({
        fields: [
          { defaultValue: "Launch", key: "title", label: "Title", type: "text" },
          { key: "optional", label: "Optional", type: "text" }
        ]
      })
    ).toEqual({ title: "Launch" });
  });

  it("serializes widget props safely", () => {
    expect(serializeWidgetProps({ title: "<Deal>" })).toBe('{"title":"\\u003cDeal>"}');
  });

  it("selects the only non-zero probability prize", () => {
    const prize = pickPrize([
      { color: "#000", label: "Lose", outcome: "lose", probability: 0 },
      { color: "#fff", label: "Win", outcome: "win", probability: 10 },
      { color: "#111", label: "Lose again", outcome: "lose", probability: 0 },
      { color: "#222", label: "Nope", outcome: "lose", probability: 0 }
    ]);

    expect(prize.label).toBe("Win");
  });
});
