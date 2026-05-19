"use client";

import * as React from "react";

import { Badge, Button, Input, ScrollArea, cn } from "@workspace/ui";

import type { LandingImportedVariable } from "../../lib/api/landings";

type LandingImportedVariablesPanelProps = {
  variables: LandingImportedVariable[];
  onChange: (variable: LandingImportedVariable, nextValue: string) => void;
  onReset: (variable: LandingImportedVariable) => void;
};

function LandingImportedVariablesPanel({
  variables,
  onChange,
  onReset
}: LandingImportedVariablesPanelProps) {
  if (!variables.length) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
        No legacy PHP or runtime variables were detected for this imported landing.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 pr-3">
        <section className="rounded-xl border bg-muted/20 p-4">
          <h3 className="text-sm font-semibold text-foreground">Landing variables</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            The editor works with the imported HTML snapshot. PHP variables are shown here
            as legacy aliases mapped to runtime keys.
          </p>
        </section>

        {variables.map((variable) => (
          <article
            key={`${variable.source}:${variable.detectedKey}:${variable.detectedSyntax}`}
            className={cn(
              "space-y-3 rounded-xl border bg-background p-4 shadow-sm",
              !variable.isMapped && "border-dashed"
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-muted px-2 py-1 text-xs font-semibold text-foreground">
                    {variable.detectedSyntax}
                  </code>
                  <Badge variant={variable.isEditable ? "default" : "outline"}>
                    {variable.source === "php" ? "PHP" : "Placeholder"}
                  </Badge>
                  {!variable.isMapped ? <Badge variant="outline">Unmapped</Badge> : null}
                  {variable.isOverridden ? (
                    <Badge variant="secondary">Draft override</Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Runtime key:{" "}
                  <span className="font-medium text-foreground">
                    {variable.runtimeKey ?? "Not mapped"}
                  </span>
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>Detected key</div>
                <div className="font-medium text-foreground">{variable.detectedKey}</div>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Effective value
                </label>
                <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm text-foreground">
                  {variable.effectiveValue || "Empty"}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Draft value
                </label>
                <Input
                  disabled={!variable.isEditable}
                  onChange={(event) => onChange(variable, event.target.value)}
                  value={variable.draftValue}
                />
                {!variable.isEditable ? (
                  <p className="text-xs text-muted-foreground">
                    This variable is visible for reference, but cannot be overridden in
                    the draft yet.
                  </p>
                ) : null}
              </div>
            </div>

            {variable.isEditable ? (
              <div className="flex justify-end">
                <Button
                  onClick={() => onReset(variable)}
                  type="button"
                  variant="ghost"
                  disabled={!variable.isOverridden}
                >
                  Reset to effective value
                </Button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </ScrollArea>
  );
}

export { LandingImportedVariablesPanel };
