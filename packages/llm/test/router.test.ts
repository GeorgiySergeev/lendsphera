import { describe, expect, it } from "vitest";

import {
  LlmProviderError,
  type CompleteRequest,
  type EmbedRequest,
  type LlmProvider
} from "../src/provider";
import { LlmProviderRouter } from "../src/router";

class FailingProvider implements LlmProvider {
  readonly name = "anthropic" as const;

  async complete(req: CompleteRequest): Promise<never> {
    void req;
    throw new LlmProviderError("upstream down", 503, "UNAVAILABLE");
  }

  async embed(req: EmbedRequest): Promise<never> {
    void req;
    throw new LlmProviderError("upstream timeout", 504, "TIMEOUT");
  }
}

class OkProvider implements LlmProvider {
  readonly name = "openai" as const;

  async complete() {
    return {
      text: "fallback-ok",
      usage: { inputTokens: 10, outputTokens: 2, totalTokens: 12 },
      provider: this.name,
      model: "gpt-5-mini",
      latencyMs: 5
    };
  }

  async embed() {
    return {
      vectors: [[0.1, 0.2]],
      usage: { inputTokens: 3, outputTokens: 0, totalTokens: 3 },
      provider: this.name,
      model: "text-embedding-3-small",
      latencyMs: 4
    };
  }
}

describe("router", () => {
  it("falls back on retryable 5xx during completion", async () => {
    const router = new LlmProviderRouter({
      primaryOverride: new FailingProvider(),
      fallbackOverride: new OkProvider()
    });
    const response = await router.complete({ model: "claude", prompt: "hello" });

    expect(response.text).toBe("fallback-ok");
    expect(response.provider).toBe("openai");
  });

  it("uses fixture provider by default in test mode", async () => {
    const router = new LlmProviderRouter({ testMode: true });
    const response = await router.complete({ model: "fixture-model", prompt: "ping" });

    expect(response.provider).toBe("fixture");
  });
});
