import { AnthropicLlmProvider } from "./anthropic";
import { FixtureLlmProvider } from "./fixture";
import { OpenAiLlmProvider } from "./openai";
import {
  LlmProviderError,
  type CompleteRequest,
  type CompleteResponse,
  type EmbedRequest,
  type EmbedResponse,
  type LlmProvider,
  type LlmProviderName
} from "./provider";

export type ProviderRouterOptions = {
  provider?: LlmProviderName;
  anthropicApiKey?: string;
  openaiApiKey?: string;
  fixture?: LlmProvider;
  testMode?: boolean;
  primaryOverride?: LlmProvider;
  fallbackOverride?: LlmProvider;
};

export class LlmProviderRouter implements LlmProvider {
  readonly name = "fixture" as const;
  private readonly primary: LlmProvider;
  private readonly fallback?: LlmProvider;

  constructor(options: ProviderRouterOptions = {}) {
    if (options.primaryOverride) {
      this.primary = options.primaryOverride;
      this.fallback = options.fallbackOverride;
      return;
    }

    const isTest =
      options.testMode ?? (process.env.NODE_ENV === "test" || process.env.CI === "true");

    if (isTest) {
      this.primary = options.fixture ?? new FixtureLlmProvider();
      return;
    }

    const selected = (options.provider ??
      process.env.LLM_PROVIDER ??
      defaultProviderForEnvironment()) as LlmProviderName;

    const anthropic = options.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY;
    const openai = options.openaiApiKey ?? process.env.OPENAI_API_KEY;

    if (selected === "openai") {
      if (!openai) {
        throw new Error("OPENAI_API_KEY is required for LLM_PROVIDER=openai");
      }

      this.primary = new OpenAiLlmProvider(openai);
      this.fallback = anthropic ? new AnthropicLlmProvider(anthropic) : undefined;
      return;
    }

    if (selected === "fixture") {
      this.primary = options.fixture ?? new FixtureLlmProvider();
      return;
    }

    if (!anthropic) {
      throw new Error("ANTHROPIC_API_KEY is required for LLM_PROVIDER=anthropic");
    }

    this.primary = new AnthropicLlmProvider(anthropic);
    this.fallback = openai ? new OpenAiLlmProvider(openai) : undefined;
  }

  async complete(req: CompleteRequest): Promise<CompleteResponse> {
    try {
      return await this.primary.complete(req);
    } catch (error) {
      if (this.fallback && isRetryable(error)) {
        return this.fallback.complete(req);
      }

      throw error;
    }
  }

  async embed(req: EmbedRequest): Promise<EmbedResponse> {
    try {
      return await this.primary.embed(req);
    } catch (error) {
      if (this.fallback && isRetryable(error)) {
        return this.fallback.embed(req);
      }

      throw error;
    }
  }
}

function defaultProviderForEnvironment(): LlmProviderName {
  return process.env.NODE_ENV === "development" ? "fixture" : "anthropic";
}

function isRetryable(error: unknown): boolean {
  if (error instanceof LlmProviderError) {
    return (
      error.status === 504 || (typeof error.status === "number" && error.status >= 500)
    );
  }

  return false;
}
