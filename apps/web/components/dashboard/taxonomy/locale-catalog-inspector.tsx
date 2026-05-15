"use client";

import * as React from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@workspace/ui";

const MAX_DEPTH = 12;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function objectArrayKeys(rows: Record<string, unknown>[]): string[] {
  const keys = new Set<string>();

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      keys.add(key);
    }
  }

  return [...keys].sort();
}

function CatalogInspector({
  data,
  depth = 0
}: {
  data: unknown;
  depth?: number;
}): React.ReactNode {
  if (depth > MAX_DEPTH) {
    return (
      <span className="text-xs text-muted-foreground">
        {typeof data === "object" && data !== null ? JSON.stringify(data) : String(data)}
      </span>
    );
  }

  if (data === null || data === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (typeof data === "boolean") {
    return <span>{data ? "true" : "false"}</span>;
  }

  if (typeof data === "number" || typeof data === "bigint") {
    return <span className="font-mono text-sm">{String(data)}</span>;
  }

  if (typeof data === "string") {
    return <span className="wrap-break-word text-sm">{data.length ? data : "—"}</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-muted-foreground">[]</span>;
    }

    const allObjects = data.every((item) => isPlainObject(item));

    if (allObjects) {
      const rows = data as Record<string, unknown>[];
      const keys = objectArrayKeys(rows);

      return (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {keys.map((key) => (
                  <TableHead key={key} className="whitespace-nowrap">
                    {key}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {keys.map((key) => (
                    <TableCell key={key} className="max-w-md align-top text-sm">
                      <CatalogInspector data={row[key]} depth={depth + 1} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    return (
      <ul className="list-inside list-disc space-y-1 text-sm">
        {data.map((item, index) => (
          <li key={index}>
            <CatalogInspector data={item} depth={depth + 1} />
          </li>
        ))}
      </ul>
    );
  }

  if (isPlainObject(data)) {
    const entries = Object.entries(data);

    return (
      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {entries.map(([key, value]) => (
          <React.Fragment key={key}>
            <dt className="text-sm font-medium text-muted-foreground">{key}</dt>
            <dd className="min-w-0 text-sm">
              <CatalogInspector data={value} depth={depth + 1} />
            </dd>
          </React.Fragment>
        ))}
      </dl>
    );
  }

  return <span className="text-sm">{String(data)}</span>;
}

export { CatalogInspector };
