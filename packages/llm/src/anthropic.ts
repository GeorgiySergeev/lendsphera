import {
  LlmProviderError,
  type CompleteRequest,
  type CompleteResponse,
  type EmbedRequest,
  type EmbedResponse,
  type LlmProvider
} from "./provider";

const ANTHROPIC_API = "https://api.anthropic.com/v1";

export class AnthropicLlmProvider implements LlmProvider {
  readonly name = "anthropic" as const;

  constructor(
    private readonly apiKey: string,
    private readonly apiVersion = "2023-06-01"
  ) {}

  async complete(req: CompleteRequest): Promise<CompleteResponse> {
    const start = Date.now();
    const body = {
      model: req.model,
      max_tokens: req.maxTokens ?? 1024,
      temperature: req.temperature,
      messages: [{ role: "user", content: req.prompt }]
    };

    const response = await fetchWithTimeout(
      `${ANTHROPIC_API}/messages`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": this.apiVersion
        },
        body: JSON.stringify(body)
      },
      req.timeoutMs ?? 30_000
    );

    const json = await safeJson(response);
    if (!response.ok) {
      throw asProviderError("Anthropic complete failed", response.status, json);
    }

    const text = Array.isArray(json.content)
      ? (json.content.find((part: { type?: string }) => part.type === "text")?.text ?? "")
      : "";

    return {
      text,
      usage: {
        inputTokens: json.usage?.input_tokens ?? 0,
        outputTokens: json.usage?.output_tokens ?? 0,
        totalTokens: (json.usage?.input_tokens ?? 0) + (json.usage?.output_tokens ?? 0)
      },
      provider: this.name,
      model: req.model,
      latencyMs: Date.now() - start
    };
  }

  async embed(req: EmbedRequest): Promise<EmbedResponse> {
    const start = Date.now();
    const inputs = Array.isArray(req.input) ? req.input : [req.input];

    const response = await fetchWithTimeout(
      `${ANTHROPIC_API}/embeddings`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": this.apiVersion
        },
        body: JSON.stringify({ model: req.model, input: inputs })
      },
      req.timeoutMs ?? 30_000
    );

    const json = await safeJson(response);
    if (!response.ok) {
      throw asProviderError("Anthropic embed failed", response.status, json);
    }

    return {
      vectors: Array.isArray(json.data)
        ? json.data.map((item: { embedding?: number[] }) => item.embedding ?? [])
        : [],
      usage: {
        inputTokens: json.usage?.input_tokens ?? 0,
        outputTokens: 0,
        totalTokens: json.usage?.input_tokens ?? 0
      },
      provider: this.name,
      model: req.model,
      latencyMs: Date.now() - start
    };
  }
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new LlmProviderError("Provider timeout", 504, "TIMEOUT");
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function asProviderError(
  message: string,
  status: number,
  payload: unknown
): LlmProviderError {
  const code =
    typeof payload === "object" && payload !== null && "error" in payload
      ? String(
          (payload as { error?: { type?: string; code?: string } }).error?.code ??
            (payload as { error?: { type?: string } }).error?.type ??
            "UNKNOWN"
        )
      : "UNKNOWN";

  return new LlmProviderError(message, status, code);
}

async function safeJson(response: Response): Promise<Record<string, any>> {
  try {
    return (await response.json()) as Record<string, any>;
  } catch {
    return {};
  }
}
