"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "../../../../components/data-table";
import {
  fetchProduct,
  fetchProductPriceHistory,
  type PriceRow
} from "../../../../lib/api";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cursor = searchParams.get("cursor") ?? "";

  const productQuery = useQuery({
    queryKey: ["crm", "product", id],
    queryFn: () => fetchProduct(id)
  });
  const pricesQuery = useQuery({
    queryKey: ["crm", "product", id, "prices", cursor],
    queryFn: () => fetchProductPriceHistory(id, { cursor: cursor || undefined, take: 20 })
  });

  const columns = useMemo<ColumnDef<PriceRow>[]>(
    () => [
      { accessorKey: "currency", header: "Currency" },
      { accessorKey: "price", header: "Price" },
      { accessorKey: "oldPrice", header: "Old price" },
      {
        id: "geo",
        header: "Geo",
        cell: ({ row }) => row.original.geo?.code ?? "GLOBAL"
      },
      {
        accessorKey: "validFrom",
        header: "Valid from",
        cell: ({ row }) => new Date(row.original.validFrom).toLocaleString()
      },
      {
        accessorKey: "validTo",
        header: "Valid to",
        cell: ({ row }) =>
          row.original.validTo ? new Date(row.original.validTo).toLocaleString() : "Open"
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <Link className="text-sm underline-offset-2 hover:underline" href="/products">
        Back to products
      </Link>
      <h1 className="text-2xl font-semibold">{productQuery.data?.name ?? "Product"}</h1>
      <p className="text-sm text-muted-foreground">
        {productQuery.data?.description ?? "No description."}
      </p>
      <h2 className="text-lg font-semibold">Price history</h2>
      <DataTable columns={columns} data={pricesQuery.data?.items ?? []} />
      <button
        className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
        disabled={!pricesQuery.data?.nextCursor}
        onClick={() => {
          const next = new URLSearchParams(searchParams.toString());
          if (pricesQuery.data?.nextCursor)
            next.set("cursor", pricesQuery.data.nextCursor);
          router.push(`/products/${id}?${next.toString()}`);
        }}
        type="button"
      >
        Next prices
      </button>
    </div>
  );
}
