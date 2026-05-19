"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Column,
  type RowSelectionState
} from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Edit,
  Eye,
  FileClock,
  Grid2X2,
  List,
  MoreHorizontal,
  Plus,
  Settings,
  Trash2
} from "lucide-react";
import type { BuilderPageSummary } from "@workspace/types";
import Link from "next/link";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
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
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn
} from "@workspace/ui";

import {
  bulkDeleteLandings,
  bulkUpdateLandingStatus,
  createLandingFromZip,
  deleteLanding,
  duplicateLanding,
  fetchCategoryOptions,
  fetchGeoOptions,
  fetchLandings,
  fetchLandingVersions,
  fetchVariantOptions,
  getDuplicateGeoError,
  landingStatuses,
  type GeoOption,
  type LandingRow,
  type LandingStatus,
  type TemplateOption
} from "../../lib/api/landings";
import { useBuilderPages } from "../../hooks/use-builder";
import { CreateLandingWizard } from "./create-landing-wizard";
import { LandingsFiltersBar } from "./landings-filters-bar";

const queryKeys = {
  categories: ["landings", "filters", "categories"] as const,
  geos: ["landings", "filters", "geos"] as const,
  list: (filters: ReturnType<typeof getApiFilters>) =>
    ["landings", "list", filters] as const,
  variants: ["landings", "filters", "variants"] as const,
  versions: (landingId: string) => ["landings", landingId, "versions"] as const
};

const filterParsers = {
  category: parseAsString.withDefault("all"),
  geo: parseAsString.withDefault(""),
  limit: parseAsInteger.withDefault(20),
  page: parseAsInteger.withDefault(1),
  search: parseAsString.withDefault(""),
  status: parseAsString.withDefault("all"),
  variant: parseAsString.withDefault("all")
};

type BuilderDraftsViewMode = "grid" | "list";
const BUILDER_DRAFTS_VIEW_KEY = "landings-builder-drafts-view";

function LandingsTablePage() {
  const queryClient = useQueryClient();
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [deleteTarget, setDeleteTarget] = React.useState<LandingRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [bulkStatus, setBulkStatus] = React.useState<LandingStatus | "">("");
  const [duplicateTarget, setDuplicateTarget] = React.useState<LandingRow | null>(null);
  const [duplicateGeoId, setDuplicateGeoId] = React.useState("");
  const [duplicateError, setDuplicateError] = React.useState<string | null>(null);
  const [zipImportOpen, setZipImportOpen] = React.useState(false);
  const [versionsTarget, setVersionsTarget] = React.useState<LandingRow | null>(null);
  const [filters, setFilters] = useQueryStates(filterParsers);
  const [builderDraftsView, setBuilderDraftsView] =
    React.useState<BuilderDraftsViewMode>("list");

  React.useEffect(() => {
    const saved = window.localStorage.getItem(BUILDER_DRAFTS_VIEW_KEY);
    if (saved === "grid" || saved === "list") {
      setBuilderDraftsView(saved);
    }
  }, []);

  const updateBuilderDraftsView = React.useCallback((next: BuilderDraftsViewMode) => {
    setBuilderDraftsView(next);
    window.localStorage.setItem(BUILDER_DRAFTS_VIEW_KEY, next);
  }, []);

  const apiFilters = getApiFilters(filters);
  const selectedIds = React.useMemo(() => Object.keys(rowSelection), [rowSelection]);

  const landingsQuery = useQuery({
    queryKey: queryKeys.list(apiFilters),
    queryFn: () => fetchLandings(apiFilters)
  });
  const builderPagesQuery = useBuilderPages();
  const geosQuery = useQuery({
    queryKey: queryKeys.geos,
    queryFn: fetchGeoOptions
  });
  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: fetchCategoryOptions
  });
  const variantsQuery = useQuery({
    queryKey: queryKeys.variants,
    queryFn: fetchVariantOptions
  });
  const versionsQuery = useQuery({
    enabled: Boolean(versionsTarget),
    queryKey: versionsTarget
      ? queryKeys.versions(versionsTarget.id)
      : ["landings", "versions", "idle"],
    queryFn: () => fetchLandingVersions(versionsTarget?.id ?? "")
  });

  const invalidateLandings = async () => {
    await queryClient.invalidateQueries({ queryKey: ["landings"] });
    setRowSelection({});
  };

  const deleteMutation = useMutation({
    mutationFn: deleteLanding,
    onSuccess: async () => {
      setDeleteTarget(null);
      await invalidateLandings();
    }
  });
  const duplicateMutation = useMutation({
    mutationFn: ({ geoId, id }: { geoId: string; id: string }) =>
      duplicateLanding(id, geoId),
    onSuccess: async () => {
      setDuplicateTarget(null);
      setDuplicateGeoId("");
      setDuplicateError(null);
      await invalidateLandings();
    }
  });
  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteLandings,
    onSuccess: async () => {
      setBulkDeleteOpen(false);
      await invalidateLandings();
    }
  });
  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: LandingStatus }) =>
      bulkUpdateLandingStatus(ids, status),
    onSuccess: async () => {
      setBulkStatus("");
      await invalidateLandings();
    }
  });
  const zipImportMutation = useMutation({
    mutationFn: createLandingFromZip,
    onSuccess: async () => {
      setZipImportOpen(false);
      await invalidateLandings();
    }
  });

  const columns = React.useMemo(
    () =>
      createColumns({
        onDelete: setDeleteTarget,
        onDuplicate: (landing) => {
          setDuplicateTarget(landing);
          setDuplicateGeoId("");
          setDuplicateError(null);
        },
        onVersions: setVersionsTarget
      }),
    []
  );

  const table = useReactTable({
    columns,
    data: landingsQuery.data?.items ?? [],
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualPagination: true,
    onRowSelectionChange: setRowSelection,
    pageCount: landingsQuery.data?.meta.pageCount ?? 0,
    state: { rowSelection }
  });

  const updateFilters = (next: Partial<typeof filters>) => {
    void setFilters({ ...next, page: next.page ?? 1 });
  };

  const selectedGeoCodes = apiFilters.geo;
  const isBulkBusy = bulkDeleteMutation.isPending || bulkStatusMutation.isPending;

  return (
    <>
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b px-4 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Landings
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage landing pages, publication state, GEO coverage, and revisions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setZipImportOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Import ZIP
            </Button>
            <CreateLandingWizard
              geos={geosQuery.data ?? []}
              geosLoading={geosQuery.isLoading}
              variants={variantsQuery.data ?? []}
              variantsLoading={variantsQuery.isLoading}
            />
          </div>
        </div>

        <LandingsFiltersBar
          embedded
          search={filters.search}
          geoCodes={selectedGeoCodes}
          category={filters.category}
          variant={filters.variant}
          status={filters.status}
          total={landingsQuery.data?.meta.total ?? 0}
          geos={geosQuery.data ?? []}
          categories={categoriesQuery.data ?? []}
          variants={variantsQuery.data ?? []}
          onSearchChange={(value) => updateFilters({ search: value })}
          onGeoChange={(codes) => updateFilters({ geo: codes.join(",") })}
          onCategoryChange={(value) => updateFilters({ category: value })}
          onVariantChange={(value) => updateFilters({ variant: value })}
          onStatusChange={(value) => updateFilters({ status: value })}
          onClearAll={() =>
            updateFilters({
              search: "",
              geo: "",
              category: "all",
              variant: "all",
              status: "all"
            })
          }
        />

        <section className="border-b">
          <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-sm font-semibold">Builder drafts</h2>
              <p className="text-xs text-muted-foreground">
                Open pages created in Builder directly from the Landings workspace.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <BuilderDraftsViewToggle
                view={builderDraftsView}
                onViewChange={updateBuilderDraftsView}
              />
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/builder">Open Builder</Link>
              </Button>
            </div>
          </div>

          <BuilderDraftsContent
            pages={builderPagesQuery.data ?? []}
            view={builderDraftsView}
            isLoading={builderPagesQuery.isLoading}
            isError={builderPagesQuery.isError}
          />
        </section>

        {selectedIds.length ? (
          <div className="flex flex-col gap-3 border-b bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm font-medium">{selectedIds.length} selected</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                value={bulkStatus}
                onValueChange={(value) => setBulkStatus(value as LandingStatus)}
              >
                <SelectTrigger className="sm:w-44" aria-label="Bulk status">
                  <SelectValue placeholder="Change status" />
                </SelectTrigger>
                <SelectContent>
                  {landingStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatStatus(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                disabled={!bulkStatus || isBulkBusy}
                onClick={() => {
                  if (bulkStatus) {
                    bulkStatusMutation.mutate({
                      ids: selectedIds,
                      status: bulkStatus
                    });
                  }
                }}
              >
                Apply status
              </Button>
              <Button
                variant="outline"
                disabled={isBulkBusy}
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete selected
              </Button>
            </div>
          </div>
        ) : null}

        {landingsQuery.isLoading ? (
          <div className="space-y-3 p-4 sm:px-6">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : landingsQuery.isError ? (
          <div className="p-6">
            <p className="text-sm font-medium">Unable to load landings</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Check the API server and authentication state, then retry.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => void landingsQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={`h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground ${getColumnClass(header.column) ?? ""}`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className="border-b transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={getColumnClass(cell.column)}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No landings match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        <div className="flex flex-col gap-3 border-t bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-muted-foreground">
            Page {landingsQuery.data?.meta.page ?? filters.page} of{" "}
            {landingsQuery.data?.meta.pageCount ?? 1}
          </p>
          <div className="flex items-center gap-2">
            <Select
              value={String(filters.limit)}
              onValueChange={(value) => updateFilters({ limit: Number(value), page: 1 })}
            >
              <SelectTrigger className="w-28" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((limit) => (
                  <SelectItem key={limit} value={String(limit)}>
                    {limit} rows
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              disabled={filters.page <= 1 || landingsQuery.isFetching}
              onClick={() => updateFilters({ page: Math.max(1, filters.page - 1) })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={
                filters.page >= (landingsQuery.data?.meta.pageCount ?? 1) ||
                landingsQuery.isFetching
              }
              onClick={() => updateFilters({ page: filters.page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <DuplicateDialog
        error={duplicateError}
        geos={geosQuery.data ?? []}
        landing={duplicateTarget}
        open={Boolean(duplicateTarget)}
        pending={duplicateMutation.isPending}
        selectedGeoId={duplicateGeoId}
        onOpenChange={(open) => {
          if (!open) {
            setDuplicateTarget(null);
            setDuplicateError(null);
          }
        }}
        onSelectedGeoIdChange={(geoId) => {
          setDuplicateGeoId(geoId);
          setDuplicateError(null);
        }}
        onSubmit={() => {
          const error = getDuplicateGeoError(duplicateGeoId);
          setDuplicateError(error);

          if (duplicateTarget && !error) {
            duplicateMutation.mutate({ geoId: duplicateGeoId, id: duplicateTarget.id });
          }
        }}
      />

      <VersionsDialog
        landing={versionsTarget}
        versions={versionsQuery.data ?? []}
        loading={versionsQuery.isLoading}
        open={Boolean(versionsTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setVersionsTarget(null);
          }
        }}
      />

      <ImportZipDialog
        categories={categoriesQuery.data ?? []}
        geos={geosQuery.data ?? []}
        onOpenChange={setZipImportOpen}
        onSubmit={(payload) => zipImportMutation.mutate(payload)}
        open={zipImportOpen}
        pending={zipImportMutation.isPending}
        templates={[]}
        variants={variantsQuery.data ?? []}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete landing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete {deleteTarget?.name}. It can be recovered from the
              backend, but it will leave the active workspace list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected landings?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete {selectedIds.length} selected landing
              {selectedIds.length === 1 ? "" : "s"} from the active workspace list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkDeleteMutation.isPending}
              onClick={() => bulkDeleteMutation.mutate(selectedIds)}
            >
              Delete selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function BuilderDraftsViewToggle({
  view,
  onViewChange
}: {
  view: BuilderDraftsViewMode;
  onViewChange: (view: BuilderDraftsViewMode) => void;
}) {
  return (
    <div
      className="inline-flex rounded-md border bg-background p-1"
      role="group"
      aria-label="Builder drafts layout"
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("h-8 gap-1", view === "grid" && "bg-muted")}
        onClick={() => onViewChange("grid")}
        aria-pressed={view === "grid"}
      >
        <Grid2X2 className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Grid</span>
        <span className="sr-only sm:hidden">Grid view</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("h-8 gap-1", view === "list" && "bg-muted")}
        onClick={() => onViewChange("list")}
        aria-pressed={view === "list"}
      >
        <List className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">List</span>
        <span className="sr-only sm:hidden">List view</span>
      </Button>
    </div>
  );
}

const builderTableHeadClass =
  "h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground";

function BuilderDraftsContent({
  pages,
  view,
  isLoading,
  isError
}: {
  pages: BuilderPageSummary[];
  view: BuilderDraftsViewMode;
  isLoading: boolean;
  isError: boolean;
}) {
  const visiblePages = pages.slice(0, 6);

  if (isLoading) {
    return (
      <div className="space-y-3 p-4 sm:px-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 sm:px-6">
        <p className="text-sm font-medium">Unable to load builder drafts</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Check the API server and try again.
        </p>
      </div>
    );
  }

  if (!visiblePages.length) {
    return (
      <div className="p-6 sm:px-6">
        <p className="text-sm text-muted-foreground">
          No builder drafts yet. Start a page in Builder and it will appear here.
        </p>
      </div>
    );
  }

  return view === "grid" ? (
    <BuilderDraftsGrid pages={visiblePages} />
  ) : (
    <BuilderDraftsTable pages={visiblePages} />
  );
}

function BuilderDraftsGrid({ pages }: { pages: BuilderPageSummary[] }) {
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
      {pages.map((page) => (
        <article
          key={page.id}
          className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm"
        >
          <BuilderDraftPreviewThumb page={page} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{page.name}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{page.id}</p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <BuilderDraftStatusCell status={page.status} />
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {formatDate(page.updatedAt)}
            </span>
          </div>
          <div className="flex justify-end">
            <BuilderDraftActions page={page} />
          </div>
        </article>
      ))}
    </div>
  );
}

function BuilderDraftsTable({ pages }: { pages: BuilderPageSummary[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className={cn(builderTableHeadClass, "min-w-24")}>Preview</TableHead>
          <TableHead className={cn(builderTableHeadClass, "min-w-60")}>
            Name + ID
          </TableHead>
          <TableHead className={builderTableHeadClass}>Status</TableHead>
          <TableHead className={builderTableHeadClass}>Updated</TableHead>
          <TableHead className={cn(builderTableHeadClass, "w-12 text-right")} />
        </TableRow>
      </TableHeader>
      <TableBody>
        {pages.map((page) => (
          <TableRow
            key={page.id}
            className="border-b transition-colors hover:bg-muted/40"
          >
            <TableCell className="min-w-24">
              <BuilderDraftPreviewThumb page={page} />
            </TableCell>
            <TableCell className="min-w-60">
              <div className="min-w-52">
                <p className="truncate font-medium">{page.name}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{page.id}</p>
              </div>
            </TableCell>
            <TableCell>
              <BuilderDraftStatusCell status={page.status} />
            </TableCell>
            <TableCell>
              <span className="whitespace-nowrap text-sm text-muted-foreground">
                {formatDate(page.updatedAt)}
              </span>
            </TableCell>
            <TableCell className="w-12 text-right">
              <BuilderDraftActions page={page} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function BuilderDraftPreviewThumb({ page }: { page: BuilderPageSummary }) {
  const label = page.name.trim().slice(0, 2).toUpperCase() || "BL";

  return (
    <div
      aria-hidden="true"
      className="flex h-10 w-16 items-center justify-center rounded-md border bg-muted/50 text-[10px] font-medium text-muted-foreground shadow-sm"
    >
      {label}
    </div>
  );
}

function BuilderDraftStatusCell({ status }: { status: BuilderPageSummary["status"] }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn("h-2 w-2 rounded-full", getStatusDotColor(status))}
        aria-hidden="true"
      />
      {formatStatus(status)}
    </div>
  );
}

function BuilderDraftActions({ page }: { page: BuilderPageSummary }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${page.name}`}>
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/builder?id=${page.id}`}>
            <Edit className="h-4 w-4" aria-hidden="true" />
            Open in Builder
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/builder">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New draft
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function createColumns({
  onDelete,
  onDuplicate,
  onVersions
}: {
  onDelete: (landing: LandingRow) => void;
  onDuplicate: (landing: LandingRow) => void;
  onVersions: (landing: LandingRow) => void;
}): ColumnDef<LandingRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all landings"
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Select ${row.original.name}`}
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
        />
      ),
      meta: { className: "w-10" }
    },
    {
      id: "preview",
      header: "Preview",
      cell: ({ row }) => <PreviewThumb landing={row.original} />,
      meta: { className: "min-w-24" }
    },
    {
      id: "name",
      header: "Name + ID",
      cell: ({ row }) => (
        <div className="min-w-52">
          <p className="truncate font-medium">{row.original.name}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {row.original.publicId}
          </p>
        </div>
      ),
      meta: { className: "min-w-60" }
    },
    {
      id: "geo",
      header: "GEO",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">
            {row.original.geo.flagEmoji ?? "○"}
          </span>
          <span className="text-sm font-medium">{row.original.geo.code}</span>
        </div>
      )
    },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) => <Badge variant="outline">{row.original.category.name}</Badge>
    },
    {
      id: "variant",
      header: "Variant",
      cell: ({ row }) => <Badge variant="muted">{row.original.variant.name}</Badge>
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${getStatusDotColor(row.original.status)}`}
          />
          {formatStatus(row.original.status)}
        </div>
      )
    },
    {
      id: "updated",
      header: "Updated",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatDate(row.original.updatedAt)}
        </span>
      )
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <LandingActions
          landing={row.original}
          onDelete={() => onDelete(row.original)}
          onDuplicate={() => onDuplicate(row.original)}
          onVersions={() => onVersions(row.original)}
        />
      ),
      meta: { className: "w-12 text-right" }
    }
  ];
}

function getColumnClass(column: Column<LandingRow, unknown>) {
  return (column.columnDef.meta as { className?: string } | undefined)?.className;
}

function LandingActions({
  landing,
  onDelete,
  onDuplicate,
  onVersions
}: {
  landing: LandingRow;
  onDelete: () => void;
  onDuplicate: () => void;
  onVersions: () => void;
}) {
  const previewUrl = landing.previewUrl ?? landing.publishedUrl;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${landing.name}`}>
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/landings/${landing.id}/edit`}>
            <Edit className="h-4 w-4" aria-hidden="true" />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!previewUrl}
          onSelect={() =>
            previewUrl && window.open(previewUrl, "_blank", "noopener,noreferrer")
          }
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          Preview
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            onDuplicate();
          }}
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/landings/${landing.id}/settings`}>
            <Settings className="h-4 w-4" aria-hidden="true" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            onVersions();
          }}
        >
          <FileClock className="h-4 w-4" aria-hidden="true" />
          View Versions
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={(event) => {
            event.preventDefault();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DuplicateDialog({
  error,
  geos,
  landing,
  open,
  pending,
  selectedGeoId,
  onOpenChange,
  onSelectedGeoIdChange,
  onSubmit
}: {
  error: string | null;
  geos: GeoOption[];
  landing: LandingRow | null;
  open: boolean;
  pending: boolean;
  selectedGeoId: string;
  onOpenChange: (open: boolean) => void;
  onSelectedGeoIdChange: (geoId: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate landing</DialogTitle>
          <DialogDescription>
            Choose the GEO for the copied draft of {landing?.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Select value={selectedGeoId} onValueChange={onSelectedGeoIdChange}>
            <SelectTrigger aria-label="Duplicate GEO">
              <SelectValue placeholder="Select GEO" />
            </SelectTrigger>
            <SelectContent>
              {geos.map((geo) => (
                <SelectItem key={geo.id} value={geo.id}>
                  {geo.flagEmoji ? `${geo.flagEmoji} ` : ""}
                  {geo.code} · {geo.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={pending} onClick={onSubmit}>
            Duplicate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportZipDialog({
  categories,
  geos,
  onOpenChange,
  onSubmit,
  open,
  pending,
  templates,
  variants
}: {
  categories: Array<{ id: string; name: string }>;
  geos: GeoOption[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: {
    categoryId: string;
    file: File;
    geoId: string;
    name: string;
    publicId: string;
    slug: string;
    templateId?: string;
    variantId: string;
  }) => void;
  open: boolean;
  pending: boolean;
  templates: TemplateOption[];
  variants: Array<{ id: string; name: string }>;
}) {
  const [categoryId, setCategoryId] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [geoId, setGeoId] = React.useState("");
  const [name, setName] = React.useState("");
  const [publicId, setPublicId] = React.useState("");
  const [templateId, setTemplateId] = React.useState("auto");
  const [variantId, setVariantId] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setGeoId((current) => current || geos[0]?.id || "");
    setCategoryId((current) => current || categories[0]?.id || "");
    setVariantId((current) => current || variants[0]?.id || "");
  }, [categories, geos, open, variants]);

  const canSubmit = Boolean(
    file && name.trim() && publicId.trim() && geoId && categoryId && variantId
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setFile(null);
          setName("");
          setPublicId("");
          setTemplateId("auto");
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import landing from ZIP</DialogTitle>
          <DialogDescription>
            Create a new landing draft from a ZIP archive with HTML, CSS, and assets.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="zip-name">
                Name
              </label>
              <input
                id="zip-name"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={name}
                onChange={(event) => {
                  const nextName = event.target.value;
                  setName(nextName);
                  if (!publicId) {
                    setPublicId(slugifyLandingValue(nextName));
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="zip-public-id">
                Public ID
              </label>
              <input
                id="zip-public-id"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={publicId}
                onChange={(event) => setPublicId(slugifyLandingValue(event.target.value))}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={geoId} onValueChange={setGeoId}>
              <SelectTrigger aria-label="ZIP import GEO">
                <SelectValue placeholder="GEO" />
              </SelectTrigger>
              <SelectContent>
                {geos.map((geo) => (
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
                {categories.map((category) => (
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
                {variants.map((variant) => (
                  <SelectItem key={variant.id} value={variant.id}>
                    {variant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger aria-label="ZIP import template">
              <SelectValue placeholder="Template mapping" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto template</SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="zip-file">
              ZIP file
            </label>
            <input
              id="zip-file"
              accept=".zip,application/zip"
              className="block w-full rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm"
              type="file"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setFile(nextFile);
                if (nextFile && !name) {
                  const inferredName = nextFile.name
                    .replace(/\.zip$/i, "")
                    .replace(/[-_]+/g, " ");
                  setName(inferredName);
                  setPublicId(slugifyLandingValue(inferredName));
                }
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit || pending}
            onClick={() => {
              if (!file) {
                return;
              }

              onSubmit({
                categoryId,
                file,
                geoId,
                name: name.trim(),
                publicId: publicId.trim(),
                slug: publicId.trim(),
                templateId: templateId === "auto" ? undefined : templateId,
                variantId
              });
            }}
          >
            Import ZIP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VersionsDialog({
  landing,
  versions,
  loading,
  open,
  onOpenChange
}: {
  landing: LandingRow | null;
  versions: Array<{
    id: string;
    versionNum: number;
    status: string;
    message?: string | null;
    createdAt: string;
    author?: { email: string; name?: string | null };
  }>;
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Versions</DialogTitle>
          <DialogDescription>Recent versions for {landing?.name}.</DialogDescription>
        </DialogHeader>
        <div className="max-h-96 overflow-auto rounded-md border">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : versions.length ? (
            <div className="divide-y">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="grid gap-1 p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                >
                  <Badge variant="outline">v{version.versionNum}</Badge>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {version.message ?? "Version update"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {version.author?.name ?? version.author?.email ?? "Unknown author"}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(version.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-sm text-muted-foreground">
              No versions are available for this landing.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewThumb({ landing }: { landing: LandingRow }) {
  const thumbnailUrl = landing.template?.thumbnailUrl;

  if (thumbnailUrl) {
    return (
      <div
        aria-hidden="true"
        className="h-10 w-16 rounded-md border shadow-sm object-cover"
        style={{
          backgroundImage: `url(${thumbnailUrl})`,
          backgroundPosition: "center",
          backgroundSize: "cover"
        }}
      />
    );
  }

  return (
    <div className="flex h-10 w-16 items-center justify-center rounded-md border bg-muted/50 text-[10px] font-medium text-muted-foreground shadow-sm">
      {landing.geo.code}
    </div>
  );
}

function getApiFilters(filters: {
  category: string;
  geo: string;
  limit: number;
  page: number;
  search: string;
  status: string;
  variant: string;
}) {
  return {
    category: filters.category === "all" ? undefined : filters.category,
    geo: filters.geo
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    limit: filters.limit,
    page: filters.page,
    search: filters.search,
    status: filters.status === "all" ? undefined : (filters.status as LandingStatus),
    variant: filters.variant === "all" ? undefined : filters.variant
  };
}

function formatStatus(status: LandingStatus | string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusDotColor(status: LandingStatus | BuilderPageSummary["status"]) {
  if (status === "PUBLISHED") {
    return "bg-emerald-500";
  }

  if (status === "ARCHIVED") {
    return "bg-muted-foreground";
  }

  return "bg-amber-500";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function slugifyLandingValue(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "imported-landing"
  );
}

export { LandingsTablePage };
