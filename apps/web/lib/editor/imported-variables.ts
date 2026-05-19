import type { PlaceholderValue } from "@workspace/types";

import type { LandingImportedVariable } from "../api/landings";

const clientPhpAliasToRuntimeKey: Record<string, string> = {
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

function normalizePlaceholderValues(
  value: PlaceholderValue | undefined
): PlaceholderValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...value };
}

function applyImportedVariableDraft(
  variables: LandingImportedVariable[],
  currentValues: PlaceholderValue,
  target: LandingImportedVariable,
  nextValue: string
) {
  if (!target.placeholderKey) {
    return { placeholderValues: currentValues, variables };
  }

  const placeholderValues: PlaceholderValue = {
    ...currentValues,
    [target.placeholderKey]: nextValue
  };

  return {
    placeholderValues,
    variables: variables.map((variable) =>
      variable.placeholderKey === target.placeholderKey
        ? {
            ...variable,
            draftValue: nextValue,
            isOverridden: true
          }
        : variable
    )
  };
}

function resetImportedVariableDraft(
  variables: LandingImportedVariable[],
  currentValues: PlaceholderValue,
  target: LandingImportedVariable
) {
  if (!target.placeholderKey) {
    return { placeholderValues: currentValues, variables };
  }

  const placeholderValues = { ...currentValues };
  delete placeholderValues[target.placeholderKey];

  return {
    placeholderValues,
    variables: variables.map((variable) =>
      variable.placeholderKey === target.placeholderKey
        ? {
            ...variable,
            draftValue: variable.effectiveValue,
            isOverridden: false
          }
        : variable
    )
  };
}

function deriveImportedVariablesFallback(
  values: unknown[],
  currentValues: PlaceholderValue
): LandingImportedVariable[] {
  const placeholderValues = normalizePlaceholderValues(currentValues);
  const map = new Map<string, LandingImportedVariable>();

  for (const value of values) {
    collectImportedVariables(value, map, placeholderValues);
  }

  return [...map.values()].sort((left, right) => {
    if (left.source === right.source) {
      return left.detectedKey.localeCompare(right.detectedKey);
    }

    return left.source.localeCompare(right.source);
  });
}

function collectImportedVariables(
  value: unknown,
  variables: Map<string, LandingImportedVariable>,
  placeholderValues: PlaceholderValue
) {
  if (!value) {
    return;
  }

  if (typeof value === "string") {
    for (const match of value.matchAll(/\$([A-Z_][A-Z0-9_]*)\b/g)) {
      upsertImportedVariable(
        variables,
        {
          key: match[1],
          source: "php" as const,
          syntax: `$${match[1]}`
        },
        placeholderValues
      );
    }

    for (const match of value.matchAll(/\{\{\s*(LS_[A-Z0-9_]+)\s*\}\}/g)) {
      upsertImportedVariable(
        variables,
        {
          key: match[1],
          source: "placeholder" as const,
          syntax: `{{${match[1]}}}`
        },
        placeholderValues
      );
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectImportedVariables(item, variables, placeholderValues);
    }
    return;
  }

  if (typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectImportedVariables(nested, variables, placeholderValues);
    }
  }
}

function upsertImportedVariable(
  variables: Map<string, LandingImportedVariable>,
  detected: { key: string; source: "php" | "placeholder"; syntax: string },
  placeholderValues: PlaceholderValue
) {
  const id = `${detected.source}:${detected.key}`;
  if (variables.has(id)) {
    return;
  }

  const runtimeKey =
    detected.source === "placeholder"
      ? detected.key
      : (clientPhpAliasToRuntimeKey[detected.key] ?? null);
  const placeholderKey = runtimeKey?.startsWith("LS_") ? runtimeKey.slice(3) : null;
  const hasOverride =
    placeholderKey !== null && Object.hasOwn(placeholderValues, placeholderKey);
  const draftValue =
    placeholderKey && hasOverride ? String(placeholderValues[placeholderKey] ?? "") : "";

  variables.set(id, {
    detectedKey: detected.key,
    detectedSyntax: detected.syntax,
    draftValue,
    effectiveValue: draftValue,
    isEditable: Boolean(placeholderKey),
    isMapped: Boolean(runtimeKey),
    isOverridden: hasOverride,
    placeholderKey,
    runtimeKey,
    source: detected.source
  });
}

export {
  applyImportedVariableDraft,
  deriveImportedVariablesFallback,
  normalizePlaceholderValues,
  resetImportedVariableDraft
};
