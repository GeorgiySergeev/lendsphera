"use client";

import { create, type Delta } from "jsondiffpatch";

const diffpatch = create({ objectHash: (obj) => JSON.stringify(obj) });

function renderValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

export function JsonDiff({ from, to }: { from: unknown; to: unknown }) {
  const delta = diffpatch.diff(from, to) as Delta | undefined;

  if (!delta) {
    return <p className="text-sm text-muted-foreground">No changes</p>;
  }

  return (
    <pre className="max-h-72 overflow-auto rounded-md border bg-muted/20 p-3 text-xs">
      {renderValue(delta)}
    </pre>
  );
}
