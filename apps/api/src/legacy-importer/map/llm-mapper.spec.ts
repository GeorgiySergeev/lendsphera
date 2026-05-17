import { describe, expect, it } from "vitest";
import { z } from "zod";

import { LlmMapperService, type LlmProvider } from "./llm-mapper.service";

class FixtureProvider implements LlmProvider {
  private index = 0;

  constructor(private readonly replies: Array<{ text: string; usdCost: number }>) {}

  async complete(): Promise<{ text: string; usage: { usdCost: number } }> {
    const reply = this.replies[this.index];
    if (!reply) {
      throw new Error("No fixture response left");
    }
    this.index += 1;
    return { text: reply.text, usage: { usdCost: reply.usdCost } };
  }
}

describe("LlmMapperService", () => {
  const schema = z.object({
    heading: z.string().min(1),
    ctaText: z.string().min(1)
  });

  it("maps valid output on first turn", async () => {
    const provider = new FixtureProvider([
      { text: JSON.stringify({ heading: "Launch now", ctaText: "Buy" }), usdCost: 0.12 }
    ]);
    const service = new LlmMapperService(provider);

    const result = await service.mapWidget({
      landingId: "landing-1",
      widgetKind: "hero",
      blockHtml: "<section><h1>Launch now</h1><a>Buy</a></section>",
      widgetSchema: schema
    });

    expect(result).toEqual({
      kind: "mapped",
      widgetKind: "hero",
      props: { heading: "Launch now", ctaText: "Buy" }
    });
    expect(service.getSpentUsd("landing-1")).toBe(0.12);
  });

  it("repairs once when first output is invalid", async () => {
    const provider = new FixtureProvider([
      { text: JSON.stringify({ heading: "", ctaText: "Buy" }), usdCost: 0.15 },
      { text: JSON.stringify({ heading: "Valid heading", ctaText: "Buy" }), usdCost: 0.2 }
    ]);
    const service = new LlmMapperService(provider);

    const result = await service.mapWidget({
      landingId: "landing-2",
      widgetKind: "hero",
      blockHtml: "<section><h1>Valid heading</h1><a>Buy</a></section>",
      widgetSchema: schema
    });

    expect(result).toEqual({
      kind: "mapped",
      widgetKind: "hero",
      props: { heading: "Valid heading", ctaText: "Buy" }
    });
    expect(service.getSpentUsd("landing-2")).toBe(0.35);
  });

  it("falls back to unknown if repair still invalid and keeps raw html", async () => {
    const provider = new FixtureProvider([
      { text: JSON.stringify({ heading: "", ctaText: "" }), usdCost: 0.1 },
      { text: "{invalid_json", usdCost: 0.1 }
    ]);
    const service = new LlmMapperService(provider);
    const html = "<section><h1></h1></section>";

    const result = await service.mapWidget({
      landingId: "landing-3",
      widgetKind: "hero",
      blockHtml: html,
      widgetSchema: schema
    });

    expect(result.kind).toBe("unknown");
    expect(result).toMatchObject({ rawHtml: html });
    expect(service.getSpentUsd("landing-3")).toBe(0.2);
  });

  it("enforces per-landing cost cap", async () => {
    const provider = new FixtureProvider([
      { text: JSON.stringify({ heading: "A", ctaText: "B" }), usdCost: 0.35 },
      { text: JSON.stringify({ heading: "A2", ctaText: "B2" }), usdCost: 0.2 }
    ]);
    const service = new LlmMapperService(provider, { costCapUsd: 0.5 });

    const first = await service.mapWidget({
      landingId: "landing-4",
      widgetKind: "hero",
      blockHtml: "<section>first</section>",
      widgetSchema: schema
    });
    expect(first.kind).toBe("mapped");

    const second = await service.mapWidget({
      landingId: "landing-4",
      widgetKind: "hero",
      blockHtml: "<section>second</section>",
      widgetSchema: schema
    });
    expect(second.kind).toBe("unknown");
    expect(second).toMatchObject({ rawHtml: "<section>second</section>" });
    expect(service.getSpentUsd("landing-4")).toBe(0.55);
  });
});
