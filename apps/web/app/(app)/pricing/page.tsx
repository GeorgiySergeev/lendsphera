"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Clock3 } from "lucide-react";

import { Badge, Button, Input } from "@workspace/ui";

import { toast } from "../../../lib/toast";
import {
  applyBulkPricing,
  countAffectedPublishedLandings,
  createProductPricePeriod,
  loadPricingMatrix,
  type PricingCell
} from "../../../lib/api/pricing";
import { BulkBar } from "../../../features/pricing/bulk-bar";
import { DiffModal } from "../../../features/pricing/diff-modal";

type MatrixSelection = Record<string, boolean>;

type DiffCell = {
  productName: string;
  geoCode: string;
  before: string | null;
  after: string;
};

function cellKey(cell: Pick<PricingCell, "productId" | "geoCode">) {
  return `${cell.productId}::${cell.geoCode}`;
}

export default function PricingMatrixPage() {
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<MatrixSelection>({});
  const [localCells, setLocalCells] = useState<Record<string, PricingCell>>({});
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffRows, setDiffRows] = useState<DiffCell[]>([]);
  const [diffInput, setDiffInput] = useState<{
    operation: "set" | "percent";
    value: string;
    validFrom: string;
    currency: string;
    notes?: string;
  } | null>(null);
  const [affectedPublished, setAffectedPublished] = useState(0);

  const matrixQuery = useQuery({
    queryKey: ["pricing", "matrix", search],
    queryFn: () => loadPricingMatrix({ productTake: 30, search })
  });

  const cells = useMemo(() => {
    const base = matrixQuery.data?.cells ?? [];
    return base.map((cell) => localCells[cellKey(cell)] ?? cell);
  }, [matrixQuery.data?.cells, localCells]);

  const products = matrixQuery.data?.products ?? [];
  const geos = matrixQuery.data?.geos ?? [];

  const selectedCells = useMemo(
    () => cells.filter((cell) => selection[cellKey(cell)]),
    [cells, selection]
  );

  const inlineSaveMutation = useMutation({
    mutationFn: createProductPricePeriod,
    onError: () => {
      toast.error("Price update failed", "Changes were rolled back.");
      void matrixQuery.refetch();
      setLocalCells({});
    },
    onSuccess: () => {
      toast.success("Price saved");
    }
  });

  const bulkMutation = useMutation({
    mutationFn: applyBulkPricing,
    onError: () => {
      toast.error("Bulk update failed");
    },
    onSuccess: async () => {
      toast.success("Bulk pricing applied");
      setSelection({});
      setDiffOpen(false);
      await matrixQuery.refetch();
      setLocalCells({});
    }
  });

  const onInlineSave = async (cell: PricingCell, nextValue: string) => {
    const key = cellKey(cell);
    const previous = localCells[key] ?? cell;

    setLocalCells((prev) => ({
      ...prev,
      [key]: {
        ...cell,
        oldPrice: cell.price,
        price: nextValue,
        validFrom: new Date().toISOString()
      }
    }));

    try {
      await inlineSaveMutation.mutateAsync({
        productId: cell.productId,
        geoCode: cell.geoCode,
        price: nextValue,
        oldPrice: cell.price ?? undefined,
        currency: cell.currency,
        validFrom: new Date().toISOString()
      });
    } catch {
      setLocalCells((prev) => ({ ...prev, [key]: previous }));
    }
  };

  const onCopyFromGeo = (sourceGeoCode: string) => {
    const next = { ...localCells };

    for (const product of products) {
      const source = cells.find(
        (cell) => cell.productId === product.id && cell.geoCode === sourceGeoCode
      );

      if (!source?.price) continue;

      for (const geo of geos) {
        const target = cells.find(
          (cell) => cell.productId === product.id && cell.geoCode === geo.code
        );
        if (!target) continue;

        next[cellKey(target)] = {
          ...target,
          oldPrice: target.price,
          price: source.price,
          currency: source.currency,
          validFrom: new Date().toISOString()
        };
      }
    }

    setLocalCells(next);
    toast.info(`Copied prices from ${sourceGeoCode}`);
  };

  const onPreviewDiff = async (input: {
    operation: "set" | "percent";
    value: string;
    validFrom: string;
    currency: string;
    notes?: string;
  }) => {
    if (!selectedCells.length) {
      toast.warning("Select at least one cell");
      return;
    }

    setDiffInput(input);
    const parsedValue = Number(input.value);
    const rows = selectedCells.map((cell) => {
      const before = cell.price;
      const afterNumber =
        input.operation === "set"
          ? parsedValue
          : Number(cell.price ?? 0) * (1 + parsedValue / 100);

      return {
        productName: cell.productName,
        geoCode: cell.geoCode,
        before,
        after: Number.isFinite(afterNumber) ? afterNumber.toFixed(2) : "0.00"
      } satisfies DiffCell;
    });

    setDiffRows(rows);

    const affected = await countAffectedPublishedLandings({
      geoCodes: Array.from(new Set(selectedCells.map((cell) => cell.geoCode))),
      productIds: Array.from(new Set(selectedCells.map((cell) => cell.productId)))
    });
    setAffectedPublished(affected);
    setDiffOpen(true);
  };

  const onConfirmBulk = async () => {
    if (!diffInput) {
      return;
    }

    const productIds = Array.from(new Set(selectedCells.map((cell) => cell.productId)));
    const geoCodes = Array.from(new Set(selectedCells.map((cell) => cell.geoCode)));

    await bulkMutation.mutateAsync({
      productIds,
      geoCodes,
      operation: diffInput.operation,
      value: diffInput.value,
      validFrom: diffInput.validFrom,
      currency: diffInput.currency,
      notes: diffInput.notes
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pricing matrix</h1>
          <p className="text-sm text-muted-foreground">
            Product x GEO matrix with inline edits, bulk operations, and scheduled
            validity.
          </p>
        </div>
        <Input
          className="sm:w-[280px]"
          placeholder="Search products"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {!!selectedCells.length && (
        <BulkBar
          selectedCount={selectedCells.length}
          defaultCurrency={selectedCells[0]?.currency ?? "EUR"}
          geoCodes={geos.map((g) => g.code)}
          onPreview={onPreviewDiff}
          onCopyFromGeo={onCopyFromGeo}
        />
      )}

      <div className="overflow-auto rounded-md border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="sticky left-0 bg-muted/40 px-3 py-2 text-left">Product</th>
              {geos.map((geo) => (
                <th key={geo.id} className="px-3 py-2 text-left whitespace-nowrap">
                  {geo.code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t">
                <td className="sticky left-0 bg-background px-3 py-2 font-medium">
                  {product.name}
                </td>
                {geos.map((geo) => {
                  const cell = cells.find(
                    (item) => item.productId === product.id && item.geoCode === geo.code
                  );

                  if (!cell) {
                    return (
                      <td key={geo.id} className="px-3 py-2 text-muted-foreground">
                        -
                      </td>
                    );
                  }

                  const key = cellKey(cell);
                  return (
                    <td key={geo.id} className="px-3 py-2 align-top">
                      <label className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={Boolean(selection[key])}
                          onChange={(e) =>
                            setSelection((prev) => ({ ...prev, [key]: e.target.checked }))
                          }
                        />
                        select
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          className="w-[100px]"
                          defaultValue={cell.price ?? ""}
                          onBlur={(e) => {
                            const next = e.target.value.trim();
                            if (next && next !== (cell.price ?? "")) {
                              void onInlineSave(cell, next);
                            }
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {cell.currency}
                        </span>
                      </div>
                      {cell.hasScheduled && cell.nextScheduledAt ? (
                        <Badge variant="outline" className="mt-1 gap-1">
                          <Clock3 className="h-3 w-3" />
                          {new Date(cell.nextScheduledAt).toLocaleString()}
                        </Badge>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DiffModal
        open={diffOpen}
        onOpenChange={setDiffOpen}
        affectedCells={diffRows}
        affectedPublishedLandings={affectedPublished}
        submitting={bulkMutation.isPending}
        onConfirm={() => void onConfirmBulk()}
      />

      {matrixQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading matrix...</p>
      ) : null}
      {matrixQuery.isError ? (
        <div className="rounded-md border border-destructive/40 p-3 text-sm">
          Failed to load pricing matrix.
          <Button
            size="sm"
            variant="outline"
            className="ml-2"
            onClick={() => void matrixQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  );
}
