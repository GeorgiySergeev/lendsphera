"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileSearch, Trash2 } from "lucide-react";
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
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@workspace/ui";

import {
  deleteTaxonomyItem,
  getDeleteConflictMessage,
  taxonomyQueryKeys
} from "../../../lib/api/taxonomy";
import {
  fetchGeoLocalesList,
  geoLocalesQueryKeys,
  type GeoLocaleListItem
} from "../../../lib/api/geo-locales";
import { parseAsInteger, useQueryStates } from "nuqs";

const filterParsers = {
  limit: parseAsInteger.withDefault(25),
  page: parseAsInteger.withDefault(1)
};

function flagSrc(countryCode: string): string {
  return `/flags/${countryCode.toLowerCase()}.svg`;
}

function GeosLocalesTablePage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useQueryStates(filterParsers);
  const [deleteTarget, setDeleteTarget] = React.useState<GeoLocaleListItem | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: geoLocalesQueryKeys.list({ page: filters.page, limit: filters.limit }),
    queryFn: () => fetchGeoLocalesList({ page: filters.page, limit: filters.limit })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTaxonomyItem("geos", id),
    onError: (error) => {
      setDeleteError(getDeleteConflictMessage("GEO", error));
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      setDeleteError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["geo-locales"] }),
        queryClient.invalidateQueries({ queryKey: taxonomyQueryKeys.geos() })
      ]);
    }
  });

  const updatePage = (page: number) => {
    void setFilters({ page, limit: filters.limit });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
            <Link href="/dashboard/taxonomy">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Taxonomy
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">GEOs</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Reference locales from the geo catalog (ISO country × locale). Pagination
            shows 25 rows per page. Manage database GEO records (reorder, CSV) from
            catalog tools.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Badge variant="outline" className="w-fit">
            {listQuery.data?.meta.total ?? 0} locale rows
          </Badge>
          <Button variant="outline" asChild>
            <Link href="/dashboard/taxonomy/geos/catalog">Catalog tools</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {listQuery.isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : listQuery.isError ? (
            <div className="p-6">
              <p className="text-sm font-medium">Unable to load geo locales</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Check API availability and authentication, then retry.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => void listQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">Flag</TableHead>
                    <TableHead>Country code</TableHead>
                    <TableHead>Country name (local)</TableHead>
                    <TableHead>Language (ISO 639-1)</TableHead>
                    <TableHead>Locale code</TableHead>
                    <TableHead>Continent</TableHead>
                    <TableHead>Landings</TableHead>
                    <TableHead className="w-12 text-center">Detail</TableHead>
                    <TableHead className="w-12 text-center">Delete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listQuery.data?.items.length ? (
                    listQuery.data.items.map((row) => (
                      <TableRow key={`${row.locale}-${row.countryCode}`}>
                        <TableCell>
                          <img
                            src={flagSrc(row.countryCode)}
                            width={28}
                            height={20}
                            className="rounded-sm border border-border object-cover"
                            alt=""
                            loading="lazy"
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium">
                          {row.countryCode}
                        </TableCell>
                        <TableCell className="min-w-44 max-w-xs whitespace-normal wrap-break-word text-sm">
                          {row.countryNameLocal}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {row.languageCode.trim() ? row.languageCode : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{row.locale}</TableCell>
                        <TableCell className="min-w-36">
                          <span className="text-sm">{row.continent}</span>
                          <p className="text-xs text-muted-foreground">{row.region}</p>
                        </TableCell>
                        <TableCell>
                          {row.landingCount > 0 ? (
                            <Link
                              href={`/dashboard/landings?geo=${encodeURIComponent(row.countryCode)}`}
                              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                            >
                              {row.landingCount}
                            </Link>
                          ) : (
                            <span className="text-sm text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" asChild>
                            <Link
                              href={`/dashboard/taxonomy/geos/${row.countryCode}`}
                              aria-label="Open country details"
                            >
                              <FileSearch className="h-4 w-4" aria-hidden="true" />
                            </Link>
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={!row.catalogGeoId}
                            aria-label="Delete catalog GEO"
                            onClick={() => {
                              if (row.catalogGeoId) {
                                setDeleteTarget(row);
                                setDeleteError(null);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="h-32 text-center text-muted-foreground"
                      >
                        No locale rows found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {listQuery.data ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {listQuery.data.meta.page} of {listQuery.data.meta.pageCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={filters.page <= 1 || listQuery.isFetching}
              onClick={() => updatePage(Math.max(1, filters.page - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={
                filters.page >= listQuery.data.meta.pageCount || listQuery.isFetching
              }
              onClick={() => updatePage(filters.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete catalog GEO {deleteTarget?.countryCode}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Removes the database GEO matched by this country code. Reference data in
              locales.json is unchanged. Active landings block deletion.
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
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (deleteTarget?.catalogGeoId) {
                  deleteMutation.mutate(deleteTarget.catalogGeoId);
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

export { GeosLocalesTablePage };
