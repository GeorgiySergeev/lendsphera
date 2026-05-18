"use client";

import { Check, ListFilter, PlusCircle, Search, X } from "lucide-react";
import * as React from "react";

import {
  Badge,
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  cn
} from "@workspace/ui";

import {
  landingStatuses,
  type CategoryOption,
  type GeoOption,
  type LandingStatus,
  type VariantOption
} from "../../lib/api/landings";

type LandingsFiltersBarProps = {
  search: string;
  geoCodes: string[];
  category: string;
  variant: string;
  status: string;
  total: number;
  geos: GeoOption[];
  categories: CategoryOption[];
  variants: VariantOption[];
  onSearchChange: (value: string) => void;
  onGeoChange: (codes: string[]) => void;
  onCategoryChange: (value: string) => void;
  onVariantChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onClearAll: () => void;
  embedded?: boolean;
};

type FacetedOption = {
  value: string;
  label: string;
  keywords?: string;
  leading?: React.ReactNode;
};

function LandingsFiltersBar({
  search,
  geoCodes,
  category,
  variant,
  status,
  total,
  geos,
  categories,
  variants,
  onSearchChange,
  onGeoChange,
  onCategoryChange,
  onVariantChange,
  onStatusChange,
  onClearAll,
  embedded = false
}: LandingsFiltersBarProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [draftSearch, setDraftSearch] = React.useState(search);

  React.useEffect(() => {
    setDraftSearch(search);
  }, [search]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      onSearchChange(draftSearch.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [draftSearch, onSearchChange]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      if (modifier && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const geoOptions = React.useMemo<FacetedOption[]>(
    () =>
      geos.map((geo) => ({
        value: geo.code,
        label: geo.name,
        keywords: `${geo.code} ${geo.name}`,
        leading: (
          <span className="text-base leading-none" aria-hidden="true">
            {geo.flagEmoji ?? "○"}
          </span>
        )
      })),
    [geos]
  );

  const categoryOptions = React.useMemo<FacetedOption[]>(
    () =>
      categories.map((item) => ({
        value: item.slug,
        label: item.name,
        keywords: `${item.slug} ${item.name}`
      })),
    [categories]
  );

  const variantOptions = React.useMemo<FacetedOption[]>(
    () =>
      variants.map((item) => ({
        value: item.slug,
        label: item.name,
        keywords: `${item.slug} ${item.name}`
      })),
    [variants]
  );

  const statusOptions = React.useMemo<FacetedOption[]>(
    () =>
      landingStatuses.map((item) => ({
        value: item,
        label: formatLandingStatus(item)
      })),
    []
  );

  const selectedCategory = categories.find((item) => item.slug === category);
  const selectedVariant = variants.find((item) => item.slug === variant);
  const selectedGeos = geos.filter((geo) => geoCodes.includes(geo.code));

  const hasActiveFilters =
    Boolean(search.trim()) ||
    geoCodes.length > 0 ||
    category !== "all" ||
    variant !== "all" ||
    status !== "all";

  return (
    <div
      className={cn(
        embedded
          ? "border-b px-4 py-4 sm:px-6"
          : "rounded-xl border bg-card/60 p-4 shadow-sm"
      )}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            ref={inputRef}
            type="search"
            value={draftSearch}
            onChange={(event) => setDraftSearch(event.target.value)}
            placeholder="Search by name, ID, slug, or notes…"
            aria-label="Search landings"
            className="h-10 pl-9 pr-14"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>

        <Separator orientation="vertical" className="hidden h-8 xl:block" />

        <div className="flex flex-wrap items-center gap-2">
          <FacetedFilter
            title="GEO"
            options={geoOptions}
            selectedValues={geoCodes}
            onSelectedValuesChange={onGeoChange}
          />
          <FacetedFilter
            title="Category"
            options={categoryOptions}
            selectedValues={category === "all" ? [] : [category]}
            onSelectedValuesChange={(values) => onCategoryChange(values[0] ?? "all")}
            closeOnSelect
          />
          <FacetedFilter
            title="Variant"
            options={variantOptions}
            selectedValues={variant === "all" ? [] : [variant]}
            onSelectedValuesChange={(values) => onVariantChange(values[0] ?? "all")}
            closeOnSelect
          />
          <FacetedFilter
            title="Status"
            options={statusOptions}
            selectedValues={status === "all" ? [] : [status]}
            onSelectedValuesChange={(values) => onStatusChange(values[0] ?? "all")}
            closeOnSelect
          />

          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 px-2 lg:px-3"
              onClick={onClearAll}
            >
              Reset
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>

        <p className="text-sm text-muted-foreground xl:ml-auto xl:text-right">
          {total} landing{total === 1 ? "" : "s"}
        </p>
      </div>

      {hasActiveFilters ? (
        <div
          className={cn(
            "mt-3 flex flex-wrap items-center gap-2 border-t pt-3",
            embedded ? "border-border" : "border-border/60"
          )}
        >
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ListFilter className="h-3.5 w-3.5" aria-hidden="true" />
            Active filters
          </span>
          {search.trim() ? (
            <FilterChip
              label={`"${search.trim()}"`}
              onRemove={() => {
                setDraftSearch("");
                onSearchChange("");
              }}
            />
          ) : null}
          {selectedGeos.map((geo) => (
            <FilterChip
              key={geo.code}
              label={`${geo.flagEmoji ?? ""} ${geo.code}`.trim()}
              onRemove={() => onGeoChange(geoCodes.filter((code) => code !== geo.code))}
            />
          ))}
          {selectedCategory ? (
            <FilterChip
              label={selectedCategory.name}
              onRemove={() => onCategoryChange("all")}
            />
          ) : null}
          {selectedVariant ? (
            <FilterChip
              label={selectedVariant.name}
              onRemove={() => onVariantChange("all")}
            />
          ) : null}
          {status !== "all" ? (
            <FilterChip
              label={formatLandingStatus(status as LandingStatus)}
              onRemove={() => onStatusChange("all")}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FacetedFilter({
  title,
  options,
  selectedValues,
  onSelectedValuesChange,
  closeOnSelect = false
}: {
  title: string;
  options: FacetedOption[];
  selectedValues: string[];
  onSelectedValuesChange: (values: string[]) => void;
  closeOnSelect?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const selectedCount = selectedValues.length;

  const toggleValue = (value: string) => {
    if (closeOnSelect) {
      onSelectedValuesChange(selectedValues.includes(value) ? [] : [value]);
      setOpen(false);
      return;
    }

    onSelectedValuesChange(
      selectedValues.includes(value)
        ? selectedValues.filter((item) => item !== value)
        : [...selectedValues, value]
    );
  };

  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-10 gap-2 border-dashed",
            selectedCount > 0 && "border-solid bg-muted/40"
          )}
          aria-label={`Filter by ${title}`}
        >
          <PlusCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {title}
          {selectedCount > 0 ? (
            <>
              <Separator orientation="vertical" className="mx-0.5 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden"
              >
                {selectedCount}
              </Badge>
              <div className="hidden items-center gap-1 lg:flex">
                {selectedLabels.length > 2 ? (
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                    {selectedCount} selected
                  </Badge>
                ) : (
                  selectedLabels.map((label) => (
                    <Badge
                      key={label}
                      variant="secondary"
                      className="max-w-[120px] truncate rounded-sm px-1 font-normal"
                    >
                      {label}
                    </Badge>
                  ))
                )}
              </div>
            </>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.includes(option.value);

                return (
                  <CommandItem
                    key={option.value}
                    value={option.keywords ?? `${option.label} ${option.value}`}
                    onSelect={() => toggleValue(option.value)}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </div>
                    {option.leading}
                    <span className="truncate">{option.label}</span>
                    {title === "GEO" ? (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {option.value}
                      </span>
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedCount > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      onSelectedValuesChange([]);
                      if (closeOnSelect) {
                        setOpen(false);
                      }
                    }}
                    className="justify-center text-center"
                  >
                    Clear {title}
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button type="button" onClick={onRemove}>
      <Badge
        variant="outline"
        className="gap-1.5 border-border/80 bg-background font-normal text-foreground"
      >
        {label}
        <X className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
      </Badge>
    </button>
  );
}

function formatLandingStatus(status: LandingStatus | string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export { LandingsFiltersBar };
