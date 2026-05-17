import type {
  CompleteRequest,
  CompleteResponse,
  EmbedRequest,
  EmbedResponse,
  LlmProvider
} from "./provider";

type FixtureRecord = {
  complete?: CompleteResponse;
  embed?: EmbedResponse;
};

export class FixtureLlmProvider implements LlmProvider {
  readonly name = "fixture" as const;

  constructor(private readonly fixture: FixtureRecord = {}) {}

  async complete(req: CompleteRequest): Promise<CompleteResponse> {
    const start = Date.now();
    const record = this.fixture.complete;

    if (record) {
      return {
        ...record,
        model: req.model,
        provider: this.name,
        latencyMs: Date.now() - start
      };
    }

    const promptTokens = Math.max(1, Math.ceil(req.prompt.length / 4));
    const outputTokens = 32;

    return {
      text: "{}",
      usage: {
        inputTokens: promptTokens,
        outputTokens,
        totalTokens: promptTokens + outputTokens
      },
      provider: this.name,
      model: req.model,
      latencyMs: Date.now() - start
    };
  }

  async embed(req: EmbedRequest): Promise<EmbedResponse> {
    const start = Date.now();
    const record = this.fixture.embed;

    if (record) {
      return {
        ...record,
        model: req.model,
        provider: this.name,
        latencyMs: Date.now() - start
      };
    }

    const inputs = Array.isArray(req.input) ? req.input : [req.input];

    return {
      vectors: inputs.map(() => [0, 0, 0, 0]),
      usage: {
        inputTokens: inputs.reduce((sum, item) => sum + Math.ceil(item.length / 4), 0),
        outputTokens: 0,
        totalTokens: inputs.reduce((sum, item) => sum + Math.ceil(item.length / 4), 0)
      },
      provider: this.name,
      model: req.model,
      latencyMs: Date.now() - start
    };
  }
}
