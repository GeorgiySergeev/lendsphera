"use client";

import type { PlaceholderField, PlaceholderValue } from "@workspace/types";
import { ChevronDown } from "lucide-react";
import * as React from "react";

import {
  Button,
  Checkbox,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn
} from "@workspace/ui";

import {
  coercePlaceholderInput,
  groupPlaceholderFields,
  toInputString
} from "../../lib/editor/placeholders";

type PlaceholderContentPanelProps = {
  fields: PlaceholderField[];
  onChange: (key: string, value: PlaceholderValue[string]) => void;
  values: PlaceholderValue;
};

function PlaceholderContentPanel({
  fields,
  onChange,
  values
}: PlaceholderContentPanelProps) {
  const groups = React.useMemo(() => groupPlaceholderFields(fields), [fields]);
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>(
    {}
  );

  if (!fields.length) {
    return (
      <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        No placeholders were found in this template.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const collapsed = collapsedGroups[group.name] ?? false;

        return (
          <section
            key={group.name}
            className="overflow-hidden rounded-lg border bg-background"
          >
            <Button
              className="h-auto w-full justify-between rounded-none px-3 py-2 text-left"
              onClick={() =>
                setCollapsedGroups((current) => ({
                  ...current,
                  [group.name]: !collapsed
                }))
              }
              type="button"
              variant="ghost"
            >
              <span>
                <span className="block text-sm font-medium">{group.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {group.fields.length} field{group.fields.length === 1 ? "" : "s"}
                </span>
              </span>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", collapsed && "-rotate-90")}
                aria-hidden="true"
              />
            </Button>
            <div className={cn("space-y-4 border-t p-3", collapsed && "hidden")}>
              {group.fields.map((field) => (
                <PlaceholderFieldControl
                  key={field.key}
                  field={field}
                  onChange={onChange}
                  value={values[field.key]}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PlaceholderFieldControl({
  field,
  onChange,
  value
}: {
  field: PlaceholderField;
  onChange: (key: string, value: PlaceholderValue[string]) => void;
  value: PlaceholderValue[string] | undefined;
}) {
  const id = `placeholder-${field.key}`;
  const stringValue = toInputString(value);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground" htmlFor={id}>
        {field.label}
        {field.required ? <span className="text-destructive"> *</span> : null}
      </label>
      {renderFieldControl({ field, id, onChange, stringValue, value })}
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
  stringValue,
  value
}: {
  field: PlaceholderField;
  id: string;
  onChange: (key: string, value: PlaceholderValue[string]) => void;
  stringValue: string;
  value: PlaceholderValue[string] | undefined;
}) {
  if (field.type === "boolean") {
    return (
      <div className="flex items-center gap-2 rounded-md border px-3 py-2">
        <Checkbox
          checked={Boolean(value)}
          id={id}
          onCheckedChange={(checked) =>
            onChange(field.key, coercePlaceholderInput(field, Boolean(checked)))
          }
        />
        <span className="text-sm text-muted-foreground">Enabled</span>
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <Select
        value={stringValue}
        onValueChange={(nextValue) =>
          onChange(field.key, coercePlaceholderInput(field, nextValue))
        }
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

  if (field.type === "textarea" || field.type === "richtext" || field.type === "array") {
    return (
      <textarea
        className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        id={id}
        onChange={(event) =>
          onChange(field.key, coercePlaceholderInput(field, event.target.value))
        }
        value={stringValue}
      />
    );
  }

  return (
    <div className={cn(field.type === "color" && "flex gap-2")}>
      <Input
        id={id}
        min={field.type === "number" ? 0 : undefined}
        onChange={(event) =>
          onChange(field.key, coercePlaceholderInput(field, event.target.value))
        }
        type={field.type === "number" || field.type === "color" ? field.type : "text"}
        value={stringValue}
      />
      {field.type === "color" ? (
        <Input
          aria-label={`${field.label} color value`}
          onChange={(event) =>
            onChange(field.key, coercePlaceholderInput(field, event.target.value))
          }
          value={stringValue}
        />
      ) : null}
    </div>
  );
}

export { PlaceholderContentPanel };
