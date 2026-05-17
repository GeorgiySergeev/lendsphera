export type LlmProviderName = "anthropic" | "openai" | "fixture";

export type CompleteRequest = {
  model: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
};

export type EmbedRequest = {
  model: string;
  input: string | string[];
  timeoutMs?: number;
};

export type LlmUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type LlmCost = {
  inputUsd: number;
  outputUsd: number;
  totalUsd: number;
};

export type CompleteResponse = {
  text: string;
  usage: LlmUsage;
  provider: LlmProviderName;
  model: string;
  latencyMs: number;
};

export type EmbedResponse = {
  vectors: number[][];
  usage: LlmUsage;
  provider: LlmProviderName;
  model: string;
  latencyMs: number;
};

export interface LlmProvider {
  readonly name: LlmProviderName;
  complete(req: CompleteRequest): Promise<CompleteResponse>;
  embed(req: EmbedRequest): Promise<EmbedResponse>;
}

export class LlmProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string
  ) {
    super(message);
    this.name = "LlmProviderError";
  }
}
