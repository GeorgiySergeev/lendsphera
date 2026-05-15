"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton
} from "@workspace/ui";

import {
  deleteTaxonomyItem,
  getDeleteConflictMessage,
  taxonomyQueryKeys
} from "../../../lib/api/taxonomy";
import {
  fetchGeoCountryCatalogMeta,
  geoLocalesQueryKeys
} from "../../../lib/api/geo-locales";
import type { LocaleCatalogEntry } from "../../../types/locale-catalog";
import { CatalogInspector } from "./locale-catalog-inspector";

function flagSrc(countryCode: string): string {
  return `/flags/${countryCode.toLowerCase()}.svg`;
}

function countryNameFromEntries(entries: LocaleCatalogEntry[]): string {
  const name = entries[0]?.country["name"];
  return typeof name === "string" && name.length ? name : "";
}

function countryNameLocalFromEntries(entries: LocaleCatalogEntry[]): string {
  const nameLocal = entries[0]?.country["name_local"];
  return typeof nameLocal === "string" && nameLocal.length ? nameLocal : "";
}

function GeoLocaleCountryDetail({
  countryCode,
  localeEntries
}: {
  countryCode: string;
  localeEntries: LocaleCatalogEntry[];
}) {
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const metaQuery = useQuery({
    enabled: localeEntries.length > 0,
    queryFn: () => fetchGeoCountryCatalogMeta(countryCode),
    queryKey: geoLocalesQueryKeys.countryMeta(countryCode)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTaxonomyItem("geos", id),
    onError: (error) => {
      setDeleteError(getDeleteConflictMessage("GEO", error));
    },
    onSuccess: async () => {
      setDeleteOpen(false);
      setDeleteError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["geo-locales"] }),
        queryClient.invalidateQueries({ queryKey: taxonomyQueryKeys.geos() })
      ]);
      await metaQuery.refetch();
    }
  });

  const displayName = countryNameFromEntries(localeEntries);
  const displayNameLocal = countryNameLocalFromEntries(localeEntries);
  const meta = metaQuery.data;

  if (!localeEntries.length) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/dashboard/taxonomy/geos">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to GEOs
          </Link>
        </Button>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium">Country not found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              No rows for code {countryCode} in utils/locales.json.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (metaQuery.isError) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/dashboard/taxonomy/geos">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to GEOs
          </Link>
        </Button>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium">Unable to load catalog metadata</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Check API availability and authentication, then retry.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => void metaQuery.refetch()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (metaQuery.isLoading || !meta) {
    return (
      <div className="space-y-4 p-1">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/dashboard/taxonomy/geos">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to GEOs
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <img
            src={flagSrc(countryCode)}
            width={56}
            height={40}
            className="rounded-md border border-border object-cover"
            alt=""
          />
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-foreground">
              {displayName || countryCode}
            </h1>
            {displayNameLocal ? (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {displayNameLocal}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline" className="font-mono">
                {countryCode}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {meta.landingCount > 0 ? (
            <Button variant="outline" asChild>
              <Link href={`/dashboard/landings?geo=${encodeURIComponent(countryCode)}`}>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Landings ({meta.landingCount})
              </Link>
            </Button>
          ) : (
            <Badge variant="muted">No landings</Badge>
          )}
          <Button variant="outline" asChild>
            <Link href="/dashboard/taxonomy/geos/catalog">Catalog tools</Link>
          </Button>
          {meta.catalogGeoId ? (
            <Button
              type="button"
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setDeleteOpen(true);
                setDeleteError(null);
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete catalog GEO
            </Button>
          ) : (
            <p className="max-w-xs text-right text-xs text-muted-foreground">
              No database GEO row for this country code yet. Import or add one from
              catalog tools.
            </p>
          )}
        </div>
      </div>

      {localeEntries.map((entry) => (
        <Card key={entry.locale}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Locale {entry.locale}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-0">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Language</h3>
              <CatalogInspector data={entry.language} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Country</h3>
              <CatalogInspector data={entry.country} />
            </div>
          </CardContent>
        </Card>
      ))}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete catalog GEO {countryCode}?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes the database GEO for this country. Active landings block deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {deleteError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending || !meta.catalogGeoId}
              onClick={(event) => {
                event.preventDefault();
                if (meta.catalogGeoId) {
                  deleteMutation.mutate(meta.catalogGeoId);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export { GeoLocaleCountryDetail };
