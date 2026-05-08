"use client";

import type { WidgetSchemaField } from "@workspace/widgets";
import {
  Checkbox,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@workspace/ui";

type WidgetConfigPanelProps = {
  fields: WidgetSchemaField[];
  onChange: (key: string, value: unknown) => void;
  props: Record<string, unknown>;
  widgetName: string | null;
};

function WidgetConfigPanel({
  fields,
  onChange,
  props,
  widgetName
}: WidgetConfigPanelProps) {
  if (!widgetName) {
    return (
      <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        Select a widget component to configure its schema-driven settings.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border bg-background p-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Widget: {widgetName}</h3>
        <p className="text-xs text-muted-foreground">
          Changes are saved as component data attributes.
        </p>
      </div>
      {fields.map((field) => (
        <WidgetFieldControl
          field={field}
          key={field.key}
          onChange={onChange}
          value={props[field.key] ?? field.defaultValue}
        />
      ))}
    </div>
  );
}

function WidgetFieldControl({
  field,
  onChange,
  value
}: {
  field: WidgetSchemaField;
  onChange: (key: string, value: unknown) => void;
  value: unknown;
}) {
  const id = `widget-${field.key}`;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground" htmlFor={id}>
        {field.label}
        {field.required ? <span className="text-destructive"> *</span> : null}
      </label>
      {renderFieldControl({ field, id, onChange, value })}
      {field.helpText ? (
        <p className="text-xs text-muted-foreground">{field.helpText}</p>
      ) : null}
    </div>
  );
}

function renderFieldControl({
  field,
  id,
  onChange,
  value
}: {
  field: WidgetSchemaField;
  id: string;
  onChange: (key: string, value: unknown) => void;
  value: unknown;
}) {
  if (field.type === "boolean") {
    return (
      <div className="flex items-center gap-2 rounded-md border px-3 py-2">
        <Checkbox
          checked={Boolean(value)}
          id={id}
          onCheckedChange={(checked) => onChange(field.key, Boolean(checked))}
        />
        <span className="text-sm text-muted-foreground">Enabled</span>
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <Select
        value={toInputString(value)}
        onValueChange={(nextValue) => onChange(field.key, nextValue)}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select value" />
        </SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === "textarea" || field.type === "array") {
    return (
      <textarea
        className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        id={id}
        onChange={(event) =>
          onChange(field.key, coerceWidgetInput(field, event.target.value))
        }
        value={
          field.type === "array"
            ? JSON.stringify(value ?? [], null, 2)
            : toInputString(value)
        }
      />
    );
  }

  return (
    <Input
      id={id}
      max={field.max}
      min={field.min}
      onChange={(event) =>
        onChange(field.key, coerceWidgetInput(field, event.target.value))
      }
      type={
        field.type === "number" || field.type === "color" || field.type === "date"
          ? field.type
          : "text"
      }
      value={toInputString(value)}
    />
  );
}

function coerceWidgetInput(field: WidgetSchemaField, value: string) {
  if (field.type === "number") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (field.type === "array") {
    try {
      const parsed = JSON.parse(value);

      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return value;
}

function toInputString(value: unknown) {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return String(value);
}

export { WidgetConfigPanel };
