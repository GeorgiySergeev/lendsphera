import { LlmProviderRouter } from "@lendsphera/llm";

export type TranslationCompleteRequest = {
  model: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
};

export type TranslationCompleteResponse = {
  text: string;
};

export interface TranslationLlmProvider {
  complete(req: TranslationCompleteRequest): Promise<TranslationCompleteResponse>;
}

export function createTranslationLlmProvider(): TranslationLlmProvider {
  return new LlmProviderRouter();
}
