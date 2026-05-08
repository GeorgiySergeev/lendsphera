import type {
  PlaceholderField,
  PlaceholderSchema,
  PlaceholderValue
} from "@workspace/types";

type PlaceholderPrimitive = PlaceholderValue[string];

type PlaceholderGroup = {
  fields: PlaceholderField[];
  name: string;
};

const placeholderPattern = /{{\s*([A-Za-z][A-Za-z0-9_.-]*)\s*}}/g;

function extractPlaceholderKeys(html: string) {
  const keys = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = placeholderPattern.exec(html))) {
    keys.add(match[1] ?? "");
  }

  return Array.from(keys)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function normalizePlaceholderSchema(
  schema: PlaceholderSchema | null | undefined,
  discoveredKeys: string[]
): PlaceholderSchema {
  const fieldsByKey = new Map<string, PlaceholderField>();

  for (const field of schema?.fields ?? []) {
    fieldsByKey.set(field.key, field);
  }

  for (const key of discoveredKeys) {
    if (!fieldsByKey.has(key)) {
      fieldsByKey.set(key, {
        group: "Discovered",
        key,
        label: toLabel(key),
        required: false,
        type: "text"
      });
    }
  }

  return { fields: Array.from(fieldsByKey.values()) };
}

function buildInitialPlaceholderValues(
  schema: PlaceholderSchema,
  existingValues: PlaceholderValue | null | undefined
): PlaceholderValue {
  const values: PlaceholderValue = {};

  for (const field of schema.fields) {
    values[field.key] =
      existingValues?.[field.key] ?? field.defaultValue ?? getEmptyValue(field);
  }

  return values;
}

function groupPlaceholderFields(fields: PlaceholderField[]) {
  const groups = new Map<string, PlaceholderField[]>();

  for (const field of fields) {
    const group = field.group || "Content";
    groups.set(group, [...(groups.get(group) ?? []), field]);
  }

  return Array.from(groups.entries()).map(([name, groupedFields]) => ({
    fields: groupedFields,
    name
  })) satisfies PlaceholderGroup[];
}

function renderPlaceholderTemplate(html: string, values: PlaceholderValue) {
  return html.replace(placeholderPattern, (_match, key: string) =>
    stringifyPlaceholderValue(values[key])
  );
}

function stringifyPlaceholderValue(value: PlaceholderPrimitive | undefined) {
  if (Array.isArray(value)) {
    return value.join("\n");
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    return String(value);
  }

  return value ?? "";
}

function getEmptyValue(field: PlaceholderField): PlaceholderPrimitive {
  if (field.type === "array") {
    return [];
  }

  if (field.type === "boolean") {
    return false;
  }

  if (field.type === "number") {
    return 0;
  }

  return "";
}

function coercePlaceholderInput(
  field: PlaceholderField,
  value: string | boolean
): PlaceholderPrimitive {
  if (field.type === "boolean") {
    return Boolean(value);
  }

  if (field.type === "number") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (field.type === "array") {
    return String(value)
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return String(value);
}

function toInputString(value: PlaceholderPrimitive | undefined) {
  if (Array.isArray(value)) {
    return value.join("\n");
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return value == null ? "" : String(value);
}

function toLabel(key: string) {
  return key
    .replace(/[_.-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase());
}

export {
  buildInitialPlaceholderValues,
  coercePlaceholderInput,
  extractPlaceholderKeys,
  groupPlaceholderFields,
  normalizePlaceholderSchema,
  renderPlaceholderTemplate,
  toInputString
};
export type { PlaceholderGroup };
