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
  MoreHorizontal,
  Search,
  Settings,
  Trash2
} from "lucide-react";
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
  Card,
  CardContent,
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
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
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
  TableRow
} from "@workspace/ui";

import {
  bulkDeleteLandings,
  bulkUpdateLandingStatus,
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
  type LandingStatus
} from "../../lib/api/landings";
import { CreateLandingWizard } from "./create-landing-wizard";

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

function LandingsTablePage() {
  const queryClient = useQueryClient();
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [deleteTarget, setDeleteTarget] = React.useState<LandingRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [bulkStatus, setBulkStatus] = React.useState<LandingStatus | "">("");
  const [duplicateTarget, setDuplicateTarget] = React.useState<LandingRow | null>(null);
  const [duplicateGeoId, setDuplicateGeoId] = React.useState("");
  const [duplicateError, setDuplicateError] = React.useState<string | null>(null);
  const [versionsTarget, setVersionsTarget] = React.useState<LandingRow | null>(null);
  const [filters, setFilters] = useQueryStates(filterParsers);

  const apiFilters = getApiFilters(filters);
  const selectedIds = React.useMemo(() => Object.keys(rowSelection), [rowSelection]);

  const landingsQuery = useQuery({
    queryKey: queryKeys.list(apiFilters),
    queryFn: () => fetchLandings(apiFilters)
  });
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
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">
            Landings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage landing pages, publication state, GEO coverage, and revisions.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Badge variant="outline" className="w-fit">
            {landingsQuery.data?.meta.total ?? 0} records
          </Badge>
          <CreateLandingWizard
            geos={geosQuery.data ?? []}
            geosLoading={geosQuery.isLoading}
            variants={variantsQuery.data ?? []}
            variantsLoading={variantsQuery.isLoading}
          />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto]">
        <div className="relative min-w-0">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="Search landings"
            placeholder="Search by name, ID, slug, or notes"
            value={filters.search}
            className="pl-9"
            onChange={(event) => updateFilters({ search: event.target.value })}
          />
        </div>
        <GeoMultiSelect
          geos={geosQuery.data ?? []}
          selectedCodes={selectedGeoCodes}
          onChange={(codes) => updateFilters({ geo: codes.join(",") })}
        />
        <SingleFilter
          label="Category"
          value={filters.category}
          options={categoriesQuery.data ?? []}
          getValue={(item) => item.slug}
          getLabel={(item) => item.name}
          onChange={(value) => updateFilters({ category: value })}
        />
        <SingleFilter
          label="Variant"
          value={filters.variant}
          options={variantsQuery.data ?? []}
          getValue={(item) => item.slug}
          getLabel={(item) => item.name}
          onChange={(value) => updateFilters({ variant: value })}
        />
        <Select
          value={filters.status}
          onValueChange={(value) => updateFilters({ status: value })}
        >
          <SelectTrigger aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {landingStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {formatStatus(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedIds.length ? (
        <div className="flex flex-col gap-3 rounded-md border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
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

      <Card>
        <CardContent className="p-0">
          {landingsQuery.isLoading ? (
            <div className="space-y-3 p-4">
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
                        className={getColumnClass(header.column)}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
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
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
    </div>
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
        <Badge variant={getStatusVariant(row.original.status)}>
          {formatStatus(row.original.status)}
        </Badge>
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

function GeoMultiSelect({
  geos,
  selectedCodes,
  onChange
}: {
  geos: GeoOption[];
  selectedCodes: string[];
  onChange: (codes: string[]) => void;
}) {
  const toggle = (code: string) => {
    onChange(
      selectedCodes.includes(code)
        ? selectedCodes.filter((item) => item !== code)
        : [...selectedCodes, code]
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between lg:w-48">
          {selectedCodes.length ? `${selectedCodes.length} GEO selected` : "All GEOs"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">GEO</p>
            {selectedCodes.length ? (
              <Button variant="ghost" size="sm" onClick={() => onChange([])}>
                Clear
              </Button>
            ) : null}
          </div>
          <div className="max-h-64 space-y-1 overflow-auto pr-1">
            {geos.map((geo) => (
              <label
                key={geo.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={selectedCodes.includes(geo.code)}
                  onCheckedChange={() => toggle(geo.code)}
                />
                <span aria-hidden="true">{geo.flagEmoji ?? "○"}</span>
                <span className="font-medium">{geo.code}</span>
                <span className="truncate text-muted-foreground">{geo.name}</span>
              </label>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SingleFilter<T>({
  label,
  value,
  options,
  getValue,
  getLabel,
  onChange
}: {
  label: string;
  value: string;
  options: T[];
  getValue: (item: T) => string;
  getLabel: (item: T) => string;
  onChange: (value: string) => void;
}) {
  const pluralLabel = label === "Category" ? "categories" : `${label.toLowerCase()}s`;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={`Filter by ${label.toLowerCase()}`}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {pluralLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={getValue(option)} value={getValue(option)}>
            {getLabel(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
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
        className="h-12 w-20 rounded-md border object-cover"
        style={{
          backgroundImage: `url(${thumbnailUrl})`,
          backgroundPosition: "center",
          backgroundSize: "cover"
        }}
      />
    );
  }

  return (
    <div className="flex h-12 w-20 items-center justify-center rounded-md border bg-muted text-xs font-medium text-muted-foreground">
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

function getStatusVariant(status: LandingStatus) {
  if (status === "PUBLISHED") {
    return "default";
  }

  if (status === "ARCHIVED") {
    return "muted";
  }

  return "secondary";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export { LandingsTablePage };
