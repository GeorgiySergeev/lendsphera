"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  GripVertical,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X
} from "lucide-react";
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
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@workspace/ui";

import {
  createCategory,
  createGeo,
  createVariant,
  deleteTaxonomyItem,
  fetchCategories,
  fetchGeos,
  fetchVariants,
  getDeleteConflictMessage,
  importGeos,
  reorderTaxonomyItems,
  taxonomyQueryKeys,
  updateCategory,
  updateGeo,
  updateVariant,
  type CategoryTaxonomyItem,
  type GeoImportResult,
  type GeoTaxonomyItem,
  type ListResponse,
  type TaxonomyItem,
  type TaxonomyKind,
  type VariantTaxonomyItem
} from "../../../lib/api/taxonomy";
import {
  categoryFormSchema,
  geoFormSchema,
  parseGeoCsvText,
  variantFormSchema,
  type CategoryFormValues,
  type GeoCsvRow,
  type GeoFormValues,
  type TaxonomyFormValues,
  type VariantFormValues
} from "../../../lib/taxonomy/schemas";

type TaxonomyDraft = Partial<GeoFormValues & CategoryFormValues & VariantFormValues> & {
  isActive: boolean;
};

type TaxonomyConfig = {
  description: string;
  kind: TaxonomyKind;
  label: string;
  plural: string;
};

const configs: Record<TaxonomyKind, TaxonomyConfig> = {
  categories: {
    description: "Control content categories used by templates and landing records.",
    kind: "categories",
    label: "Category",
    plural: "Categories"
  },
  geos: {
    description: "Manage GEO catalog, locale defaults, currencies, and flags.",
    kind: "geos",
    label: "GEO",
    plural: "GEOs"
  },
  variants: {
    description: "Manage landing flow variants used during creation and filtering.",
    kind: "variants",
    label: "Variant",
    plural: "Variants"
  }
};

function TaxonomyTablePage({ kind }: { kind: TaxonomyKind }) {
  const config = configs[kind];
  const queryClient = useQueryClient();
  const filters = React.useMemo(() => ({ limit: 100, page: 1 }), []);
  const [items, setItems] = React.useState<TaxonomyItem[]>([]);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<TaxonomyDraft>(() => defaultDraft(kind));
  const [formError, setFormError] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<TaxonomyItem | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [reorderError, setReorderError] = React.useState<string | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const query = useQuery<ListResponse<TaxonomyItem>>({
    queryKey: taxonomyQueryKeys[kind](filters),
    queryFn: () => fetchItems(kind, filters)
  });
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  React.useEffect(() => {
    setItems(query.data?.items ?? []);
  }, [query.data?.items]);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["taxonomy", kind] }),
      queryClient.invalidateQueries({ queryKey: ["landings"] })
    ]);
  };
  const saveMutation = useMutation({
    mutationFn: ({ id, values }: { id?: string; values: TaxonomyFormValues }) =>
      saveItem(kind, values, id),
    onSuccess: async () => {
      setEditingId(null);
      setFormError(null);
      await invalidate();
    }
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTaxonomyItem(kind, id),
    onError: (error) => {
      setDeleteError(getDeleteConflictMessage(config.label, error));
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      setDeleteError(null);
      await invalidate();
    }
  });
  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => reorderTaxonomyItems(kind, ids),
    onError: async () => {
      setReorderError("Unable to save order. The list has been restored.");
      await query.refetch();
    },
    onSuccess: async () => {
      setReorderError(null);
      await invalidate();
    }
  });

  const beginAdd = () => {
    setEditingId("new");
    setDraft(defaultDraft(kind));
    setFormError(null);
  };
  const beginEdit = (item: TaxonomyItem) => {
    setEditingId(item.id);
    setDraft(itemToDraft(kind, item));
    setFormError(null);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraft(defaultDraft(kind));
    setFormError(null);
  };
  const saveDraft = () => {
    const parsed = parseDraft(kind, draft);

    if (!parsed.success) {
      setFormError(parsed.error);
      return;
    }

    saveMutation.mutate({
      id: editingId === "new" ? undefined : (editingId ?? undefined),
      values: parsed.values
    });
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || editingId) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const previous = items;
    const next = arrayMove(items, oldIndex, newIndex);

    setItems(next);
    reorderMutation.mutate(
      next.map((item) => item.id),
      {
        onError: () => setItems(previous)
      }
    );
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
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">
            {config.plural}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {config.description}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Badge variant="outline" className="w-fit">
            {query.data?.meta.total ?? 0} records
          </Badge>
          {kind === "geos" ? (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              Import CSV
            </Button>
          ) : null}
          <Button onClick={beginAdd} disabled={Boolean(editingId)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add {config.label}
          </Button>
        </div>
      </div>

      {formError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      {reorderError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {reorderError}
        </p>
      ) : null}

      <Card>
        <CardContent className="p-0">
          {query.isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : query.isError ? (
            <div className="p-6">
              <p className="text-sm font-medium">Unable to load {config.plural}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Check API availability and authentication, then retry.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => void query.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>{renderHeader(kind)}</TableHeader>
                  <TableBody>
                    {editingId === "new" ? (
                      <TableRow className="bg-muted/35">
                        {renderEditableCells(kind, draft, setDraft)}
                        <ActionCells
                          busy={saveMutation.isPending}
                          editing
                          onCancel={cancelEdit}
                          onSave={saveDraft}
                        />
                      </TableRow>
                    ) : null}
                    <SortableContext
                      items={items.map((item) => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {items.map((item) =>
                        editingId === item.id ? (
                          <TableRow key={item.id} className="bg-muted/35">
                            {renderEditableCells(kind, draft, setDraft)}
                            <ActionCells
                              busy={saveMutation.isPending}
                              editing
                              onCancel={cancelEdit}
                              onSave={saveDraft}
                            />
                          </TableRow>
                        ) : (
                          <SortableTaxonomyRow
                            key={item.id}
                            disabled={Boolean(editingId)}
                            item={item}
                          >
                            <>
                              {renderReadCells(kind, item)}
                              <ActionCells
                                onDelete={() => {
                                  setDeleteTarget(item);
                                  setDeleteError(null);
                                }}
                                onEdit={() => beginEdit(item)}
                              />
                            </>
                          </SortableTaxonomyRow>
                        )
                      )}
                    </SortableContext>
                    {!items.length && editingId !== "new" ? (
                      <TableRow>
                        <TableCell
                          colSpan={kind === "geos" ? 10 : 9}
                          className="h-32 text-center text-muted-foreground"
                        >
                          No {config.plural.toLowerCase()} found.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </DndContext>
            </div>
          )}
        </CardContent>
      </Card>

      {kind === "geos" ? (
        <GeoImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onSuccess={invalidate}
        />
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
            <AlertDialogTitle>Delete {deleteTargetName(deleteTarget)}?</AlertDialogTitle>
            <AlertDialogDescription>
              This checks linked active landings before deletion.
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
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id);
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

function SortableTaxonomyRow({
  children,
  disabled,
  item
}: {
  children: React.ReactNode;
  disabled: boolean;
  item: TaxonomyItem;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    disabled,
    id: item.id
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-10">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-grab"
          disabled={disabled}
          aria-label={`Reorder ${deleteTargetName(item)}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </Button>
      </TableCell>
      {children}
    </TableRow>
  );
}

function renderHeader(kind: TaxonomyKind) {
  if (kind === "geos") {
    return (
      <TableRow>
        <TableHead className="w-10" />
        <TableHead>Flag</TableHead>
        <TableHead>Code</TableHead>
        <TableHead>Name</TableHead>
        <TableHead>Language</TableHead>
        <TableHead>Currency</TableHead>
        <TableHead>Timezone</TableHead>
        <TableHead>Active</TableHead>
        <TableHead>Landings</TableHead>
        <TableHead className="w-28 text-right">Actions</TableHead>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableHead className="w-10" />
      <TableHead>{kind === "categories" ? "Color/Icon" : "Icon"}</TableHead>
      <TableHead>Slug</TableHead>
      <TableHead>Name</TableHead>
      <TableHead>Description</TableHead>
      <TableHead>Active</TableHead>
      <TableHead>Landings</TableHead>
      <TableHead>{kind === "categories" ? "Templates" : ""}</TableHead>
      <TableHead className="w-28 text-right">Actions</TableHead>
    </TableRow>
  );
}

function renderReadCells(kind: TaxonomyKind, item: TaxonomyItem) {
  if (kind === "geos") {
    const geo = item as GeoTaxonomyItem;

    return (
      <>
        <TableCell className="text-lg">{geo.flagEmoji || "o"}</TableCell>
        <TableCell className="font-medium">{geo.code}</TableCell>
        <TableCell className="min-w-44">{geo.name}</TableCell>
        <TableCell>{geo.language}</TableCell>
        <TableCell>{geo.currency}</TableCell>
        <TableCell className="min-w-40 text-muted-foreground">
          {geo.timezone || "None"}
        </TableCell>
        <TableCell>
          <StatusBadge active={geo.isActive} />
        </TableCell>
        <TableCell>{geo._count.landings}</TableCell>
      </>
    );
  }

  if (kind === "categories") {
    const category = item as CategoryTaxonomyItem;

    return (
      <>
        <TableCell>
          <span className="flex items-center gap-2">
            <span
              className="h-4 w-4 rounded-full border"
              style={{ backgroundColor: category.color || "transparent" }}
            />
            <span className="text-xs text-muted-foreground">
              {category.icon || "None"}
            </span>
          </span>
        </TableCell>
        <TableCell className="font-medium">{category.slug}</TableCell>
        <TableCell className="min-w-44">{category.name}</TableCell>
        <TableCell className="max-w-72 truncate text-muted-foreground">
          {category.description || "No description"}
        </TableCell>
        <TableCell>
          <StatusBadge active={category.isActive} />
        </TableCell>
        <TableCell>{category._count.landings}</TableCell>
        <TableCell>{category._count.templates ?? 0}</TableCell>
      </>
    );
  }

  const variant = item as VariantTaxonomyItem;

  return (
    <>
      <TableCell>{variant.icon || "None"}</TableCell>
      <TableCell className="font-medium">{variant.slug}</TableCell>
      <TableCell className="min-w-44">{variant.name}</TableCell>
      <TableCell className="max-w-72 truncate text-muted-foreground">
        {variant.description || "No description"}
      </TableCell>
      <TableCell>
        <StatusBadge active={variant.isActive} />
      </TableCell>
      <TableCell>{variant._count.landings}</TableCell>
      <TableCell />
    </>
  );
}

function renderEditableCells(
  kind: TaxonomyKind,
  draft: TaxonomyDraft,
  setDraft: React.Dispatch<React.SetStateAction<TaxonomyDraft>>
) {
  const update = (key: keyof TaxonomyDraft, value: string | boolean) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  if (kind === "geos") {
    return (
      <>
        <TableCell className="w-10" />
        <TableCell>
          <Input
            aria-label="Flag emoji"
            className="w-20"
            value={draft.flagEmoji ?? ""}
            onChange={(event) => update("flagEmoji", event.target.value)}
          />
        </TableCell>
        <TableCell>
          <Input
            aria-label="GEO code"
            className="w-24"
            value={draft.code ?? ""}
            onChange={(event) => update("code", event.target.value.toUpperCase())}
          />
        </TableCell>
        <TableCell>
          <Input
            aria-label="GEO name"
            className="min-w-44"
            value={draft.name ?? ""}
            onChange={(event) => update("name", event.target.value)}
          />
        </TableCell>
        <TableCell>
          <Input
            aria-label="Language"
            className="w-24"
            value={draft.language ?? ""}
            onChange={(event) => update("language", event.target.value)}
          />
        </TableCell>
        <TableCell>
          <Input
            aria-label="Currency"
            className="w-24"
            value={draft.currency ?? ""}
            onChange={(event) => update("currency", event.target.value.toUpperCase())}
          />
        </TableCell>
        <TableCell>
          <Input
            aria-label="Timezone"
            className="min-w-44"
            value={draft.timezone ?? ""}
            onChange={(event) => update("timezone", event.target.value)}
          />
        </TableCell>
        <TableCell>
          <Checkbox
            aria-label="Active"
            checked={draft.isActive}
            onCheckedChange={(value) => update("isActive", Boolean(value))}
          />
        </TableCell>
        <TableCell />
      </>
    );
  }

  return (
    <>
      <TableCell className="w-10" />
      <TableCell>
        <div className="flex items-center gap-2">
          {kind === "categories" ? (
            <Input
              aria-label="Color"
              className="w-24"
              value={draft.color ?? ""}
              onChange={(event) => update("color", event.target.value)}
            />
          ) : null}
          <Input
            aria-label="Icon"
            className="w-28"
            value={draft.icon ?? ""}
            onChange={(event) => update("icon", event.target.value)}
          />
        </div>
      </TableCell>
      <TableCell>
        <Input
          aria-label="Slug"
          className="min-w-40"
          value={draft.slug ?? ""}
          onChange={(event) => update("slug", slugifyDraft(event.target.value))}
        />
      </TableCell>
      <TableCell>
        <Input
          aria-label="Name"
          className="min-w-44"
          value={draft.name ?? ""}
          onChange={(event) => update("name", event.target.value)}
        />
      </TableCell>
      <TableCell>
        <Input
          aria-label="Description"
          className="min-w-64"
          value={draft.description ?? ""}
          onChange={(event) => update("description", event.target.value)}
        />
      </TableCell>
      <TableCell>
        <Checkbox
          aria-label="Active"
          checked={draft.isActive}
          onCheckedChange={(value) => update("isActive", Boolean(value))}
        />
      </TableCell>
      <TableCell />
      <TableCell />
    </>
  );
}

function ActionCells({
  busy,
  editing,
  onCancel,
  onDelete,
  onEdit,
  onSave
}: {
  busy?: boolean;
  editing?: boolean;
  onCancel?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onSave?: () => void;
}) {
  return (
    <TableCell className="text-right">
      <div className="flex justify-end gap-1">
        {editing ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={busy}
              onClick={onSave}
              aria-label="Save row"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onCancel}
              aria-label="Cancel edit"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onEdit}
              aria-label="Edit row"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDelete}
              aria-label="Delete row"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        )}
      </div>
    </TableCell>
  );
}

function GeoImportDialog({
  onOpenChange,
  onSuccess,
  open
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => Promise<void>;
}) {
  const [rows, setRows] = React.useState<GeoCsvRow[]>([]);
  const [errors, setErrors] = React.useState<Array<{ message: string; row: number }>>([]);
  const [result, setResult] = React.useState<GeoImportResult | null>(null);
  const mutation = useMutation({
    mutationFn: importGeos,
    onSuccess: async (data) => {
      setResult(data);
      await onSuccess();
    }
  });

  const reset = () => {
    setRows([]);
    setErrors([]);
    setResult(null);
    mutation.reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          reset();
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import GEO CSV</DialogTitle>
          <DialogDescription>
            CSV headers: code, name, language, currency, flagEmoji, flagUrl, timezone,
            sortOrder, isActive.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            aria-label="GEO CSV file"
            type="file"
            accept=".csv,text/csv"
            onChange={async (event) => {
              const file = event.target.files?.[0];

              if (!file) {
                return;
              }

              const parsed = parseGeoCsvText(await file.text());

              setRows(parsed.rows);
              setErrors(parsed.errors);
              setResult(null);
            }}
          />
          <div className="rounded-md border bg-card p-3 text-sm">
            <p className="font-medium">{rows.length} valid rows ready</p>
            {errors.length ? (
              <div className="mt-2 space-y-1 text-sm text-destructive">
                {errors.slice(0, 4).map((error) => (
                  <p key={`${error.row}-${error.message}`}>
                    Row {error.row}: {error.message}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-muted-foreground">
                Existing GEO codes will be updated.
              </p>
            )}
            {result ? (
              <p className="mt-2 text-muted-foreground">
                Created {result.created}, updated {result.updated}, API errors{" "}
                {result.errors.length}.
              </p>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!rows.length || mutation.isPending || Boolean(errors.length)}
            onClick={() => mutation.mutate(rows)}
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Import
          </Button>
          <Button variant="ghost" asChild>
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(
                "code,name,language,currency,flagEmoji,flagUrl,timezone,sortOrder,isActive\nUS,United States,en,USD,🇺🇸,,America/New_York,0,true"
              )}`}
              download="geos-template.csv"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Template
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "secondary" : "muted"}>{active ? "Active" : "Off"}</Badge>
  );
}

async function fetchItems(
  kind: TaxonomyKind,
  filters: { limit: number; page: number }
): Promise<ListResponse<TaxonomyItem>> {
  if (kind === "geos") {
    return (await fetchGeos(filters)) as ListResponse<TaxonomyItem>;
  }

  if (kind === "categories") {
    return (await fetchCategories(filters)) as ListResponse<TaxonomyItem>;
  }

  return (await fetchVariants(filters)) as ListResponse<TaxonomyItem>;
}

async function saveItem(
  kind: TaxonomyKind,
  values: TaxonomyFormValues,
  id?: string
): Promise<TaxonomyItem> {
  if (kind === "geos") {
    return (
      id ? updateGeo(id, values as GeoFormValues) : createGeo(values as GeoFormValues)
    ) as Promise<TaxonomyItem>;
  }

  if (kind === "categories") {
    return (
      id
        ? updateCategory(id, values as CategoryFormValues)
        : createCategory(values as CategoryFormValues)
    ) as Promise<TaxonomyItem>;
  }

  return (
    id
      ? updateVariant(id, values as VariantFormValues)
      : createVariant(values as VariantFormValues)
  ) as Promise<TaxonomyItem>;
}

function defaultDraft(kind: TaxonomyKind): TaxonomyDraft {
  if (kind === "geos") {
    return {
      code: "",
      currency: "",
      flagEmoji: "",
      isActive: true,
      language: "",
      name: "",
      timezone: ""
    };
  }

  return {
    color: kind === "categories" ? "#64748b" : "",
    description: "",
    icon: "",
    isActive: true,
    name: "",
    slug: ""
  };
}

function itemToDraft(kind: TaxonomyKind, item: TaxonomyItem): TaxonomyDraft {
  if (kind === "geos") {
    const geo = item as GeoTaxonomyItem;

    return {
      code: geo.code,
      currency: geo.currency,
      flagEmoji: geo.flagEmoji ?? "",
      flagUrl: geo.flagUrl ?? "",
      isActive: geo.isActive,
      language: geo.language,
      name: geo.name,
      timezone: geo.timezone ?? ""
    };
  }

  if (kind === "categories") {
    const category = item as CategoryTaxonomyItem;

    return {
      color: category.color ?? "",
      description: category.description ?? "",
      icon: category.icon ?? "",
      isActive: category.isActive,
      name: category.name,
      slug: category.slug
    };
  }

  const variant = item as VariantTaxonomyItem;

  return {
    description: variant.description ?? "",
    icon: variant.icon ?? "",
    isActive: variant.isActive,
    name: variant.name,
    slug: variant.slug
  };
}

function parseDraft(kind: TaxonomyKind, draft: TaxonomyDraft) {
  const schema =
    kind === "geos"
      ? geoFormSchema
      : kind === "categories"
        ? categoryFormSchema
        : variantFormSchema;
  const result = schema.safeParse(draft);

  if (!result.success) {
    return {
      error: result.error.issues[0]?.message ?? "Check required fields.",
      success: false as const
    };
  }

  return { success: true as const, values: result.data };
}

function deleteTargetName(item: TaxonomyItem | null) {
  if (!item) {
    return "record";
  }

  return "code" in item ? item.code : item.name;
}

function slugifyDraft(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export { TaxonomyTablePage };
