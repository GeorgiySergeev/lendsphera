const fs = require("fs");

const filePath =
  "d:\\APP\\landsphera--app\\apps\\web\\components\\dashboard\\landings-table-page.tsx";
let content = fs.readFileSync(filePath, "utf8");

// Replace layout
content = content.replace(
  /<div className="space-y-5">[\s\S]*?<\/Card>/g, // up to the end of the first Card
  `    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Landings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage landing pages, publication state, GEO coverage, and revisions.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Badge variant="secondary" className="px-2.5 py-0.5 text-sm font-medium text-muted-foreground w-fit">
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

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Wrench className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Builder drafts</h2>
                <p className="text-xs text-muted-foreground">
                  Open pages created in Builder directly from the Landings workspace.
                </p>
              </div>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/builder">Open Builder</Link>
          </Button>
        </div>

        <div className="mt-4">
          {builderPagesQuery.isLoading ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : builderPagesQuery.isError ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Builder drafts could not be loaded right now.
            </div>
          ) : builderPagesQuery.data?.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {builderPagesQuery.data.slice(0, 6).map((page) => (
                <div key={page.id} className="rounded-lg border bg-background p-3 transition-colors hover:bg-muted/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{page.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Updated {formatDate(page.updatedAt)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{formatStatus(page.status)}</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button asChild size="sm" variant="secondary" className="h-8">
                      <Link href={\`/dashboard/builder?id=\${page.id}\`}>Open in Builder</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No builder drafts yet. Start a page in Builder and it will appear here.
            </div>
          )}
        </div>
      </div>`
);

// We still need to replace the grid of filters
content = content.replace(
  /<div className="grid gap-3 lg:grid-cols-\[1fr_auto_auto_auto_auto\]">[\s\S]*?<\/Select>\s*<\/div>/g,
  `      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="Search landings"
            placeholder="Search by name, ID, slug..."
            value={filters.search}
            className="pl-9 h-9 bg-background"
            onChange={(event) => updateFilters({ search: event.target.value })}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            <SelectTrigger className="h-9 w-fit sm:w-[140px] bg-background" aria-label="Filter by status">
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
      </div>`
);

// We need to remove the first Card that we just skipped or fix the regex.
// Wait, my first replace removed the header, and my second replace removed the grid filters.
// Let's just do a string replacement for createColumns.

content = content.replace(
  /function createColumns[\s\S]*?\];\r?\n\}/g,
  `function createColumns({
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
          className="translate-y-[2px]"
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
          aria-label={\`Select \${row.original.name}\`}
          className="translate-y-[2px]"
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
        />
      ),
      meta: { className: "w-10 pr-0" }
    },
    {
      id: "preview",
      header: "Preview",
      cell: ({ row }) => <PreviewThumb landing={row.original} />,
      meta: { className: "w-16" }
    },
    {
      id: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="min-w-0">
          <Link href={\`/dashboard/landings/\${row.original.id}/edit\`} className="truncate font-medium text-sm text-foreground hover:underline">
            {row.original.name}
          </Link>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
             <span className="font-mono text-[11px]">{row.original.publicId}</span>
          </div>
        </div>
      ),
      meta: { className: "min-w-60" }
    },
    {
      id: "geo",
      header: "GEO",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none" aria-hidden="true">
            {row.original.geo.flagEmoji ?? "○"}
          </span>
          <span className="text-xs font-medium">{row.original.geo.code}</span>
        </div>
      )
    },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.category.name}</span>
    },
    {
      id: "variant",
      header: "Variant",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.variant.name}</span>
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex items-center">
          <div className={\`mr-2 h-2 w-2 rounded-full \${getStatusDotColor(row.original.status)}\`} />
          <span className="text-xs font-medium text-muted-foreground">{formatStatus(row.original.status)}</span>
        </div>
      )
    },
    {
      id: "updated",
      header: "Updated",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
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
}`
);

// Replace getStatusVariant
content = content.replace(
  /function getStatusVariant[\s\S]*?return "secondary";\r?\n\}/g,
  `function getStatusDotColor(status: LandingStatus) {
  if (status === "PUBLISHED") return "bg-emerald-500";
  if (status === "ARCHIVED") return "bg-muted-foreground";
  return "bg-amber-500";
}`
);

content = content.replace(
  /function PreviewThumb[\s\S]*?return \([\s\S]*?<\/div>\s*\);\s*\}/g,
  `function PreviewThumb({ landing }: { landing: LandingRow }) {
  const thumbnailUrl = landing.template?.thumbnailUrl;

  if (thumbnailUrl) {
    return (
      <div
        aria-hidden="true"
        className="h-10 w-16 rounded-md border shadow-sm object-cover"
        style={{
          backgroundImage: \`url(\${thumbnailUrl})\`,
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
}`
);

fs.writeFileSync(filePath, content);
console.log("Script done");
