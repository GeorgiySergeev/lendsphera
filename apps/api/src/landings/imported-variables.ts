import type { RuntimeVars } from "@workspace/types";

import type { ImportedCodeVariable } from "../zip-import/zip-import.types";

type ImportedEditorVariable = {
  detectedKey: string;
  detectedSyntax: string;
  source: ImportedCodeVariable["source"];
  runtimeKey: `LS_${string}` | null;
  placeholderKey: string | null;
  effectiveValue: string;
  draftValue: string;
  isEditable: boolean;
  isMapped: boolean;
  isOverridden: boolean;
};

const phpAliasToRuntimeKey: Record<string, `LS_${string}`> = {
  CTA: "LS_CTA",
  CURRENCY: "LS_CURRENCY",
  DISCLAIMER: "LS_DISCLAIMER",
  DISCOUNT: "LS_DISCOUNT",
  PIXEL_ID: "LS_PIXEL_ID",
  POSTBACK_URL: "LS_POSTBACK_URL",
  PRODUCT_IMAGE_PATH: "LS_PRODUCT_IMAGE",
  PRODUCT_NAME: "LS_PRODUCT_NAME",
  PRODUCT_OLD_PRICE: "LS_OLD_PRICE",
  PRODUCT_PRICE: "LS_PRICE"
};

function buildImportedVariablesViewModel(
  detectedVariables: ImportedCodeVariable[],
  runtimeVars: RuntimeVars["vars"],
  placeholderValues: unknown
): ImportedEditorVariable[] {
  const placeholderMap = toPlaceholderStringMap(placeholderValues);

  return detectedVariables.map((variable) => {
    const runtimeKey = mapDetectedVariableToRuntimeKey(variable);
    const placeholderKey = runtimeKey ? runtimeKey.slice(3) : null;
    const hasOverride = placeholderKey
      ? Object.hasOwn(placeholderMap, placeholderKey)
      : false;
    const effectiveValue = runtimeKey ? (runtimeVars[runtimeKey] ?? "") : "";
    const draftValue =
      placeholderKey && hasOverride
        ? (placeholderMap[placeholderKey] ?? "")
        : effectiveValue;

    return {
      detectedKey: variable.key,
      detectedSyntax: variable.syntax,
      source: variable.source,
      runtimeKey,
      placeholderKey,
      effectiveValue,
      draftValue,
      isEditable: Boolean(placeholderKey),
      isMapped: Boolean(runtimeKey),
      isOverridden: hasOverride
    };
  });
}

function mapDetectedVariableToRuntimeKey(
  variable: ImportedCodeVariable
): `LS_${string}` | null {
  if (variable.source === "placeholder") {
    return variable.key.startsWith("LS_") ? (variable.key as `LS_${string}`) : null;
  }

  if (variable.key.startsWith("LS_")) {
    return variable.key as `LS_${string}`;
  }

  return phpAliasToRuntimeKey[variable.key] ?? null;
}

function toPlaceholderStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    result[key] = stringifyPlaceholderValue(entry);
  }
  return result;
}

function stringifyPlaceholderValue(value: unknown): string {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return "";
}

export {
  buildImportedVariablesViewModel,
  mapDetectedVariableToRuntimeKey,
  type ImportedEditorVariable
};
