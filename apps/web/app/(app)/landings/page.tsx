"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "../../../components/data-table";
import { fetchLandings, type LandingRow } from "../../../lib/api";

function renderOriginBadge(row: LandingRow) {
  const effective =
    row.origin === "NATIVE" ? "NATIVE" : row.legacyFrom ? "IMPORTED" : "WRAPPED";
  const tones =
    effective === "NATIVE"
      ? "bg-emerald-100 text-emerald-800"
      : effective === "IMPORTED"
        ? "bg-amber-100 text-amber-800"
        : "bg-sky-100 text-sky-800";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${tones}`}>
      {effective}
    </span>
  );
}

export default function LandingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cursor = searchParams.get("cursor") ?? "";
  const geo = searchParams.get("geo") ?? "";
  const productId = searchParams.get("productId") ?? "";
  const status = searchParams.get("status") ?? "";
  const origin = searchParams.get("origin") ?? "";

  const query = useQuery({
    queryKey: ["crm", "landings", { cursor, geo, origin, productId, status }],
    queryFn: () =>
      fetchLandings({
        cursor: cursor || undefined,
        geo: geo || undefined,
        origin: undefined,
        productId: productId || undefined,
        status: status ? (status as LandingRow["status"]) : undefined,
        take: 20
      })
  });
  const landingRows = useMemo(() => {
    const rows = query.data?.items ?? [];
    if (!origin) return rows;
    return rows.filter((row) => {
      const effective =
        row.origin === "NATIVE" ? "NATIVE" : row.legacyFrom ? "IMPORTED" : "WRAPPED";
      return effective === origin;
    });
  }, [origin, query.data?.items]);

  const columns = useMemo<ColumnDef<LandingRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <Link
            className="font-medium underline-offset-2 hover:underline"
            href={`/landings/${row.original.id}`}
          >
            {row.original.name}
          </Link>
        )
      },
      { accessorKey: "publicId", header: "Public ID" },
      { accessorKey: "status", header: "Status" },
      {
        id: "geo",
        header: "Geo",
        cell: ({ row }) => row.original.geo?.code ?? "-"
      },
      {
        id: "origin",
        header: "Origin",
        cell: ({ row }) => renderOriginBadge(row.original)
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Landings</h1>
      <div className="grid gap-2 md:grid-cols-4">
        {[
          ["geo", geo, "Geo code"],
          ["productId", productId, "Product ID"],
          ["status", status, "Status"],
          ["origin", origin, "Origin: NATIVE/WRAPPED/IMPORTED"]
        ].map(([key, value, label]) => (
          <input
            key={key}
            className="rounded border bg-background px-3 py-2 text-sm"
            defaultValue={value}
            onBlur={(event) => {
              const next = new URLSearchParams(searchParams.toString());
              const v = event.target.value.trim();
              if (v) next.set(key, v);
              else next.delete(key);
              next.delete("cursor");
              router.push(`/landings?${next.toString()}`);
            }}
            placeholder={label}
          />
        ))}
      </div>
      <DataTable columns={columns} data={landingRows} />
      <button
        className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
        disabled={!query.data?.nextCursor}
        onClick={() => {
          const next = new URLSearchParams(searchParams.toString());
          if (query.data?.nextCursor) next.set("cursor", query.data.nextCursor);
          router.push(`/landings?${next.toString()}`);
        }}
        type="button"
      >
        Next page
      </button>
    </div>
  );
}
