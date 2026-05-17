import { z } from "zod";

import { validateMappedProps } from "./repair";

const DEFAULT_COST_CAP_USD = 0.5;

export type LlmUsage = {
  usdCost: number;
};

export type LlmResponse = {
  text: string;
  usage: LlmUsage;
};

export interface LlmProvider {
  complete(input: { prompt: string }): Promise<LlmResponse>;
}

export type WidgetMappingResult =
  | { kind: "mapped"; widgetKind: string; props: Record<string, unknown> }
  | { kind: "unknown"; rawHtml: string; reason: string };

export type MapWidgetWithLlmInput<TProps extends Record<string, unknown>> = {
  landingId: string;
  blockHtml: string;
  widgetKind: string;
  widgetSchema: z.ZodType<TProps>;
};

export class LlmMapperService {
  private readonly spentByLanding = new Map<string, number>();

  constructor(
    private readonly provider: LlmProvider,
    private readonly config: { costCapUsd?: number } = {}
  ) {}

  async mapWidget<TProps extends Record<string, unknown>>(
    input: MapWidgetWithLlmInput<TProps>
  ): Promise<WidgetMappingResult> {
    const cap = this.config.costCapUsd ?? DEFAULT_COST_CAP_USD;
    const alreadySpent = this.spentByLanding.get(input.landingId) ?? 0;

    if (alreadySpent >= cap) {
      return {
        kind: "unknown",
        rawHtml: input.blockHtml,
        reason: `cost_cap_exceeded:${alreadySpent.toFixed(4)}/${cap.toFixed(4)}`
      };
    }

    const schemaJson = z.toJSONSchema(input.widgetSchema);

    const basePrompt = [
      "Map this HTML block to props for a widget.",
      "Return ONLY strict JSON object with widget props.",
      `Widget kind: ${input.widgetKind}`,
      `Widget schema (JSON Schema): ${JSON.stringify(schemaJson)}`,
      `HTML block: ${input.blockHtml}`
    ].join("\n");

    const first = await this.provider.complete({ prompt: basePrompt });
    this.trackCost(input.landingId, first.usage.usdCost);
    if (this.isCapExceeded(input.landingId, cap)) {
      return {
        kind: "unknown",
        rawHtml: input.blockHtml,
        reason: `cost_cap_exceeded:${this.currentSpend(input.landingId).toFixed(4)}/${cap.toFixed(4)}`
      };
    }
    const firstJson = parseJson(first.text);
    const firstValidation = validateMappedProps(input.widgetSchema, firstJson);

    if (firstValidation.ok) {
      return {
        kind: "mapped",
        widgetKind: input.widgetKind,
        props: firstValidation.props
      };
    }

    if (this.isCapExceeded(input.landingId, cap)) {
      return {
        kind: "unknown",
        rawHtml: input.blockHtml,
        reason: `cost_cap_exceeded:${this.currentSpend(input.landingId).toFixed(4)}/${cap.toFixed(4)}`
      };
    }

    const repairPrompt = [
      basePrompt,
      `Your output failed validation: ${firstValidation.error}`,
      "Repair it and return ONLY JSON object matching the schema."
    ].join("\n");

    const repaired = await this.provider.complete({ prompt: repairPrompt });
    this.trackCost(input.landingId, repaired.usage.usdCost);
    if (this.isCapExceeded(input.landingId, cap)) {
      return {
        kind: "unknown",
        rawHtml: input.blockHtml,
        reason: `cost_cap_exceeded:${this.currentSpend(input.landingId).toFixed(4)}/${cap.toFixed(4)}`
      };
    }
    const repairedJson = parseJson(repaired.text);
    const repairedValidation = validateMappedProps(input.widgetSchema, repairedJson);

    if (repairedValidation.ok) {
      return {
        kind: "mapped",
        widgetKind: input.widgetKind,
        props: repairedValidation.props
      };
    }

    return {
      kind: "unknown",
      rawHtml: input.blockHtml,
      reason: `validation_failed:${repairedValidation.error}`
    };
  }

  getSpentUsd(landingId: string): number {
    return this.currentSpend(landingId);
  }

  private trackCost(landingId: string, usdCost: number): void {
    const current = this.currentSpend(landingId);
    this.spentByLanding.set(landingId, current + Math.max(0, usdCost));
  }

  private currentSpend(landingId: string): number {
    return this.spentByLanding.get(landingId) ?? 0;
  }

  private isCapExceeded(landingId: string, cap: number): boolean {
    return this.currentSpend(landingId) >= cap;
  }
}

function parseJson(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}
