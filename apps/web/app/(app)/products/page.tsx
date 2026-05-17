"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "../../../components/data-table";
import { fetchProducts, type ProductRow } from "../../../lib/api";

function setParam(next: URLSearchParams, key: string, value?: string) {
  if (value) next.set(key, value);
  else next.delete(key);
}

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const cursor = searchParams.get("cursor") ?? "";

  const query = useQuery({
    queryKey: ["crm", "products", { q, category, cursor }],
    queryFn: () => fetchProducts({ category, cursor: cursor || undefined, q, take: 20 })
  });

  const columns = useMemo<ColumnDef<ProductRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <Link
            className="font-medium underline-offset-2 hover:underline"
            href={`/products/${row.original.id}`}
          >
            {row.original.name}
          </Link>
        )
      },
      { accessorKey: "slug", header: "Slug" },
      {
        id: "category",
        header: "Category",
        cell: ({ row }) => row.original.category?.name ?? "-"
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => new Date(row.original.updatedAt).toLocaleString()
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Products</h1>
      <div className="grid gap-2 md:grid-cols-3">
        <input
          className="rounded border bg-background px-3 py-2 text-sm"
          defaultValue={q}
          onBlur={(event) => {
            const next = new URLSearchParams(searchParams.toString());
            setParam(next, "q", event.target.value.trim() || undefined);
            next.delete("cursor");
            router.push(`/products?${next.toString()}`);
          }}
          placeholder="Search"
        />
        <input
          className="rounded border bg-background px-3 py-2 text-sm"
          defaultValue={category}
          onBlur={(event) => {
            const next = new URLSearchParams(searchParams.toString());
            setParam(next, "category", event.target.value.trim() || undefined);
            next.delete("cursor");
            router.push(`/products?${next.toString()}`);
          }}
          placeholder="Category ID"
        />
      </div>
      <DataTable columns={columns} data={query.data?.items ?? []} />
      <div className="flex gap-2">
        <button
          className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
          disabled={!cursor}
          onClick={() => {
            const next = new URLSearchParams(searchParams.toString());
            next.delete("cursor");
            router.push(`/products?${next.toString()}`);
          }}
          type="button"
        >
          First page
        </button>
        <button
          className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
          disabled={!query.data?.nextCursor}
          onClick={() => {
            const next = new URLSearchParams(searchParams.toString());
            if (query.data?.nextCursor) next.set("cursor", query.data.nextCursor);
            router.push(`/products?${next.toString()}`);
          }}
          type="button"
        >
          Next page
        </button>
      </div>
    </div>
  );
}
