"use client";

import { useMemo } from "react";

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@workspace/ui";

import type { LandingBulkOperation, LandingBulkRequest } from "../../lib/api/landings";

type LandingsBulkBarProps = {
  selectedCount: number;
  operation: LandingBulkOperation;
  fromPixel: string;
  toPixel: string;
  templateId: string;
  busy: boolean;
  onOperationChange: (value: LandingBulkOperation) => void;
  onFromPixelChange: (value: string) => void;
  onToPixelChange: (value: string) => void;
  onTemplateIdChange: (value: string) => void;
  onRun: (payload: LandingBulkRequest) => void;
};

export function LandingsBulkBar(props: LandingsBulkBarProps) {
  const {
    selectedCount,
    operation,
    fromPixel,
    toPixel,
    templateId,
    busy,
    onOperationChange,
    onFromPixelChange,
    onToPixelChange,
    onTemplateIdChange,
    onRun
  } = props;

  const args = useMemo(() => {
    if (operation === "REPLACE_PIXEL") {
      return { from: fromPixel, to: toPixel };
    }
    if (operation === "SET_TEMPLATE") {
      return { templateId };
    }
    return undefined;
  }, [fromPixel, operation, templateId, toPixel]);

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">{selectedCount} selected</p>
        <Select
          value={operation}
          onValueChange={(v) => onOperationChange(v as LandingBulkOperation)}
        >
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PUBLISH">Bulk publish</SelectItem>
            <SelectItem value="PAUSE">Bulk pause</SelectItem>
            <SelectItem value="REPLACE_PIXEL">Bulk replace pixel</SelectItem>
            <SelectItem value="SET_TEMPLATE">Bulk set template</SelectItem>
          </SelectContent>
        </Select>

        {operation === "REPLACE_PIXEL" ? (
          <>
            <Input
              className="w-[220px]"
              placeholder="Find pixel token"
              value={fromPixel}
              onChange={(event) => onFromPixelChange(event.target.value)}
            />
            <Input
              className="w-[220px]"
              placeholder="Replace with"
              value={toPixel}
              onChange={(event) => onToPixelChange(event.target.value)}
            />
          </>
        ) : null}

        {operation === "SET_TEMPLATE" ? (
          <Input
            className="w-[260px]"
            placeholder="Template ID"
            value={templateId}
            onChange={(event) => onTemplateIdChange(event.target.value)}
          />
        ) : null}

        <Button
          disabled={busy || selectedCount === 0}
          variant="outline"
          onClick={() => onRun({ ids: [], op: operation, dryRun: true, args })}
        >
          Dry-run
        </Button>
        <Button
          disabled={busy || selectedCount === 0}
          onClick={() => onRun({ ids: [], op: operation, dryRun: false, args })}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
