import { describe, expect, it } from "vitest";

import type { LandingImportedVariable } from "../api/landings";
import {
  applyImportedVariableDraft,
  normalizePlaceholderValues,
  resetImportedVariableDraft
} from "./imported-variables";

const baseVariables: LandingImportedVariable[] = [
  {
    detectedKey: "PRODUCT_NAME",
    detectedSyntax: "$PRODUCT_NAME",
    draftValue: "Default product",
    effectiveValue: "Default product",
    isEditable: true,
    isMapped: true,
    isOverridden: false,
    placeholderKey: "PRODUCT_NAME",
    runtimeKey: "LS_PRODUCT_NAME",
    source: "php"
  },
  {
    detectedKey: "LS_PRODUCT_NAME",
    detectedSyntax: "{{LS_PRODUCT_NAME}}",
    draftValue: "Default product",
    effectiveValue: "Default product",
    isEditable: true,
    isMapped: true,
    isOverridden: false,
    placeholderKey: "PRODUCT_NAME",
    runtimeKey: "LS_PRODUCT_NAME",
    source: "placeholder"
  }
];

describe("imported variable helpers", () => {
  it("normalizes placeholder values to a safe object", () => {
    expect(normalizePlaceholderValues(undefined)).toEqual({});
    expect(normalizePlaceholderValues({ CTA: "Buy now" })).toEqual({ CTA: "Buy now" });
  });

  it("applies draft edits to every variable row sharing the same placeholder key", () => {
    const result = applyImportedVariableDraft(
      baseVariables,
      {},
      baseVariables[0],
      "Draft product"
    );

    expect(result.placeholderValues).toEqual({ PRODUCT_NAME: "Draft product" });
    expect(result.variables).toEqual([
      expect.objectContaining({
        draftValue: "Draft product",
        isOverridden: true
      }),
      expect.objectContaining({
        draftValue: "Draft product",
        isOverridden: true
      })
    ]);
  });

  it("resets a draft override back to the effective value", () => {
    const edited = applyImportedVariableDraft(
      baseVariables,
      {},
      baseVariables[0],
      "Draft product"
    );
    const reset = resetImportedVariableDraft(
      edited.variables,
      edited.placeholderValues,
      edited.variables[0] as LandingImportedVariable
    );

    expect(reset.placeholderValues).toEqual({});
    expect(reset.variables).toEqual([
      expect.objectContaining({
        draftValue: "Default product",
        isOverridden: false
      }),
      expect.objectContaining({
        draftValue: "Default product",
        isOverridden: false
      })
    ]);
  });
});
