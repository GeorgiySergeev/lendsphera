import { describe, expect, it } from "vitest";

import { calculateCost, withinInvoiceTolerance } from "../src/accounting";

describe("accounting", () => {
  it("matches recorded provider invoice within 2%", () => {
    const usage = {
      inputTokens: 243_100,
      outputTokens: 41_500,
      totalTokens: 284_600
    };

    const pricing = {
      inputPerMillionUsd: 3,
      outputPerMillionUsd: 15
    };

    const recordedInvoiceUsd = 1.349;
    const cost = calculateCost(usage, pricing);

    expect(withinInvoiceTolerance(recordedInvoiceUsd, cost.totalUsd, 0.02)).toBe(true);
  });
});
