import {
  LlmProviderError,
  type CompleteRequest,
  type CompleteResponse,
  type EmbedRequest,
  type EmbedResponse,
  type LlmProvider
} from "./provider";

const OPENAI_API = "https://api.openai.com/v1";

export class OpenAiLlmProvider implements LlmProvider {
  readonly name = "openai" as const;

  constructor(private readonly apiKey: string) {}

  async complete(req: CompleteRequest): Promise<CompleteResponse> {
    const start = Date.now();
    const response = await fetchWithTimeout(
      `${OPENAI_API}/responses`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: req.model,
          input: req.prompt,
          max_output_tokens: req.maxTokens,
          temperature: req.temperature
        })
      },
      req.timeoutMs ?? 30_000
    );

    const json = await safeJson(response);
    if (!response.ok) {
      throw asProviderError("OpenAI complete failed", response.status, json);
    }

    return {
      text: (json.output_text as string | undefined) ?? "",
      usage: {
        inputTokens: json.usage?.input_tokens ?? 0,
        outputTokens: json.usage?.output_tokens ?? 0,
        totalTokens: json.usage?.total_tokens ?? 0
      },
      provider: this.name,
      model: req.model,
      latencyMs: Date.now() - start
    };
  }

  async embed(req: EmbedRequest): Promise<EmbedResponse> {
    const start = Date.now();
    const response = await fetchWithTimeout(
      `${OPENAI_API}/embeddings`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: req.model,
          input: req.input
        })
      },
      req.timeoutMs ?? 30_000
    );

    const json = await safeJson(response);
    if (!response.ok) {
      throw asProviderError("OpenAI embed failed", response.status, json);
    }

    return {
      vectors: Array.isArray(json.data)
        ? json.data.map((item: { embedding?: number[] }) => item.embedding ?? [])
        : [],
      usage: {
        inputTokens: json.usage?.prompt_tokens ?? json.usage?.input_tokens ?? 0,
        outputTokens: 0,
        totalTokens: json.usage?.total_tokens ?? json.usage?.input_tokens ?? 0
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
