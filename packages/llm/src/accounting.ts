import type { LlmCost, LlmUsage } from "./provider";

export type Pricing = {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
};

export function calculateCost(usage: LlmUsage, pricing: Pricing): LlmCost {
  const inputUsd = (usage.inputTokens / 1_000_000) * pricing.inputPerMillionUsd;
  const outputUsd = (usage.outputTokens / 1_000_000) * pricing.outputPerMillionUsd;

  return {
    inputUsd,
    outputUsd,
    totalUsd: inputUsd + outputUsd
  };
}

export function withinInvoiceTolerance(
  expectedUsd: number,
  actualUsd: number,
  tolerance = 0.02
): boolean {
  if (expectedUsd <= 0) {
    return actualUsd === expectedUsd;
  }

  return Math.abs(actualUsd - expectedUsd) / expectedUsd <= tolerance;
}
