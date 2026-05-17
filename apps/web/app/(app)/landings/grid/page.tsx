"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import {
  fetchLandings,
  runLandingBulkOperation,
  type LandingBulkItemDiff,
  type LandingBulkOperation,
  type LandingBulkRequest,
  type LandingBulkResponse,
  type LandingRow
} from "../../../../lib/api/landings";
import { LandingsBulkBar } from "../../../../features/landings/bulk-bar";

export default function LandingsBulkGridPage() {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [operation, setOperation] = useState<LandingBulkOperation>("PUBLISH");
  const [fromPixel, setFromPixel] = useState("");
  const [toPixel, setToPixel] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [lastResult, setLastResult] = useState<{
    dryRun: boolean;
    changed: number;
    total: number;
    items: LandingBulkItemDiff[];
  } | null>(null);

  const query = useQuery({
    queryKey: ["landings", "bulk-grid"],
    queryFn: () =>
      fetchLandings({
        geo: [],
        page: 1,
        limit: 100
      })
  });

  const items = query.data?.items ?? [];
  const selectedIds = useMemo(
    () =>
      items
        .filter((item: LandingRow) => selected[item.id])
        .map((item: LandingRow) => item.id),
    [items, selected]
  );

  const bulkMutation = useMutation<LandingBulkResponse, Error, LandingBulkRequest>({
    mutationFn: (payload: LandingBulkRequest) => runLandingBulkOperation(payload),
    onSuccess: (data) => {
      setLastResult({
        dryRun: data.dryRun,
        changed: data.changed,
        total: data.total,
        items: data.items
      });
      if (!data.dryRun) {
        setSelected({});
      }
    }
  });

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const item of items) {
      next[item.id] = true;
    }
    setSelected(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Landings Bulk Grid</h1>
        <Link className="text-sm underline-offset-2 hover:underline" href="/landings">
          Back to landings
        </Link>
      </div>

      <LandingsBulkBar
        selectedCount={selectedIds.length}
        operation={operation}
        fromPixel={fromPixel}
        toPixel={toPixel}
        templateId={templateId}
        busy={bulkMutation.isPending}
        onOperationChange={setOperation}
        onFromPixelChange={setFromPixel}
        onToPixelChange={setToPixel}
        onTemplateIdChange={setTemplateId}
        onRun={(payload: LandingBulkRequest) =>
          bulkMutation.mutate({
            ...payload,
            ids: selectedIds
          })
        }
      />

      {bulkMutation.error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {(bulkMutation.error as Error).message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/30 text-left">
            <tr>
              <th className="px-3 py-2">
                <input
                  checked={items.length > 0 && selectedIds.length === items.length}
                  type="checkbox"
                  onChange={(event) => toggleAll(event.target.checked)}
                />
              </th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Public ID</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Template</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row: LandingRow) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">
                  <input
                    checked={Boolean(selected[row.id])}
                    type="checkbox"
                    onChange={(event) =>
                      setSelected((prev) => ({ ...prev, [row.id]: event.target.checked }))
                    }
                  />
                </td>
                <td className="px-3 py-2">{row.name}</td>
                <td className="px-3 py-2">{row.publicId}</td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="px-3 py-2">{row.template?.name ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lastResult ? (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">
            {lastResult.dryRun ? "Dry-run result" : "Applied"}: {lastResult.changed}/
            {lastResult.total} changed
          </p>
          <div className="max-h-64 overflow-auto rounded border">
            <table className="min-w-full text-xs">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="px-2 py-1">Landing</th>
                  <th className="px-2 py-1">Before status</th>
                  <th className="px-2 py-1">After status</th>
                  <th className="px-2 py-1">Changed</th>
                </tr>
              </thead>
              <tbody>
                {lastResult.items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-2 py-1">{item.name}</td>
                    <td className="px-2 py-1">{item.before.status}</td>
                    <td className="px-2 py-1">{item.after.status}</td>
                    <td className="px-2 py-1">{item.changed ? "yes" : "no"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
