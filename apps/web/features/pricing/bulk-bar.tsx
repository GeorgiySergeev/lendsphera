"use client";

import { useState } from "react";

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@workspace/ui";

type BulkOperation = "set" | "percent";

type BulkBarProps = {
  selectedCount: number;
  defaultCurrency: string;
  onPreview: (input: {
    operation: BulkOperation;
    value: string;
    validFrom: string;
    currency: string;
    notes?: string;
  }) => void;
  onCopyFromGeo: (geoCode: string) => void;
  geoCodes: string[];
};

export function BulkBar({
  selectedCount,
  defaultCurrency,
  onPreview,
  onCopyFromGeo,
  geoCodes
}: BulkBarProps) {
  const [operation, setOperation] = useState<BulkOperation>("percent");
  const [value, setValue] = useState("10");
  const [validFrom, setValidFrom] = useState(new Date().toISOString().slice(0, 16));
  const [currency, setCurrency] = useState(defaultCurrency);
  const [notes, setNotes] = useState("");
  const [copyGeo, setCopyGeo] = useState(geoCodes[0] ?? "");

  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">{selectedCount} cells selected</p>
        <Select value={operation} onValueChange={(v) => setOperation(v as BulkOperation)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="set">Set price</SelectItem>
            <SelectItem value="percent">Percent</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className="w-[120px]"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={operation === "percent" ? "10" : "99.99"}
        />
        <Input
          className="w-[220px]"
          type="datetime-local"
          value={validFrom}
          onChange={(e) => setValidFrom(e.target.value)}
        />
        <Input
          className="w-[90px]"
          value={currency}
          onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          placeholder="EUR"
          maxLength={3}
        />
        <Input
          className="min-w-[200px] flex-1"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
        />
        <Button
          variant="outline"
          onClick={() =>
            onPreview({
              operation,
              value,
              validFrom: new Date(validFrom).toISOString(),
              currency,
              notes: notes || undefined
            })
          }
        >
          Preview diff
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">Copy values from GEO</p>
        <Select value={copyGeo} onValueChange={setCopyGeo}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="GEO" />
          </SelectTrigger>
          <SelectContent>
            {geoCodes.map((code) => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyGeo && onCopyFromGeo(copyGeo)}
        >
          Copy from GEO
        </Button>
      </div>
    </div>
  );
}
