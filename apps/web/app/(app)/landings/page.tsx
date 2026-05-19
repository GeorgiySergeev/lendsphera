"use client";

import type { AxiosError } from "axios";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "../../../components/data-table";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@workspace/ui";
import { fetchLandings, type LandingRow } from "../../../lib/api";
import {
  createLandingFromZip,
  fetchCategoryOptions,
  fetchGeoOptions,
  fetchVariantOptions
} from "../../../lib/api/landings";

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
  const [zipImportOpen, setZipImportOpen] = useState(false);

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
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Landings</h1>
        <Button onClick={() => setZipImportOpen(true)}>Import ZIP</Button>
      </div>
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

      <ImportZipDialog
        onImported={() => {
          setZipImportOpen(false);
          void query.refetch();
        }}
        onOpenChange={setZipImportOpen}
        open={zipImportOpen}
      />
    </div>
  );
}

function ImportZipDialog({
  onImported,
  onOpenChange,
  open
}: {
  onImported: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [geoId, setGeoId] = useState("");
  const [name, setName] = useState("");
  const [publicId, setPublicId] = useState("");
  const [variantId, setVariantId] = useState("");

  const geosQuery = useQuery({
    queryKey: ["landings", "zip-import", "geos"],
    queryFn: fetchGeoOptions
  });
  const categoriesQuery = useQuery({
    queryKey: ["landings", "zip-import", "categories"],
    queryFn: fetchCategoryOptions
  });
  const variantsQuery = useQuery({
    queryKey: ["landings", "zip-import", "variants"],
    queryFn: fetchVariantOptions
  });

  useEffect(() => {
    if (open) {
      setGeoId((current) => current || geosQuery.data?.[0]?.id || "");
      setCategoryId((current) => current || categoriesQuery.data?.[0]?.id || "");
      setVariantId((current) => current || variantsQuery.data?.[0]?.id || "");
    }
  }, [open, geosQuery.data, categoriesQuery.data, variantsQuery.data]);

  const importMutation = useMutation({
    mutationFn: () =>
      createLandingFromZip({
        categoryId,
        file: file as File,
        geoId,
        name: name.trim(),
        publicId: publicId.trim(),
        slug: publicId.trim(),
        variantId
      }),
    onSuccess: onImported
  });

  const canSubmit = Boolean(
    file && name.trim() && publicId.trim() && geoId && categoryId && variantId
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setCategoryId("");
          setFile(null);
          setGeoId("");
          setName("");
          setPublicId("");
          setVariantId("");
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import landing from ZIP</DialogTitle>
          <DialogDescription>
            Upload a ZIP archive and create a new landing draft directly from `/landings`.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Landing name"
              value={name}
              onChange={(event) => {
                const nextName = event.target.value;
                setName(nextName);
                if (!publicId) {
                  setPublicId(slugifyValue(nextName));
                }
              }}
            />
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Public ID"
              value={publicId}
              onChange={(event) => setPublicId(slugifyValue(event.target.value))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={geoId} onValueChange={setGeoId}>
              <SelectTrigger aria-label="ZIP import GEO">
                <SelectValue placeholder="GEO" />
              </SelectTrigger>
              <SelectContent>
                {(geosQuery.data ?? []).map((geo) => (
                  <SelectItem key={geo.id} value={geo.id}>
                    {geo.code} · {geo.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger aria-label="ZIP import category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {(categoriesQuery.data ?? []).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={variantId} onValueChange={setVariantId}>
              <SelectTrigger aria-label="ZIP import variant">
                <SelectValue placeholder="Variant" />
              </SelectTrigger>
              <SelectContent>
                {(variantsQuery.data ?? []).map((variant) => (
                  <SelectItem key={variant.id} value={variant.id}>
                    {variant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <input
            accept=".zip,application/zip"
            className="block w-full rounded-md border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2"
            type="file"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              setFile(nextFile);
              if (nextFile && !name) {
                const inferred = nextFile.name
                  .replace(/\.zip$/i, "")
                  .replace(/[-_]+/g, " ");
                setName(inferred);
                setPublicId(slugifyValue(inferred));
              }
            }}
          />

          {importMutation.isError ? (
            <p className="text-sm text-destructive">
              {getApiErrorMessage(importMutation.error)}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit || importMutation.isPending}
            onClick={() => importMutation.mutate()}
          >
            {importMutation.isPending ? "Importing..." : "Import ZIP"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function slugifyValue(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "imported-landing"
  );
}

function getApiErrorMessage(error: unknown) {
  const axiosError = error as AxiosError<{ message?: string | string[] }>;
  const message = axiosError.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(", ");
  }

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "ZIP import failed.";
}
