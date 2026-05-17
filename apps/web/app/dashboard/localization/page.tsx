"use client";

import Link from "next/link";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";

import { Button, Input } from "@workspace/ui";

import { useI18nList, useI18nMissing } from "../../../hooks/use-i18n";
import { InlineI18nEdit } from "../../../features/i18n/inline-edit";

const DEFAULT_LANGS = ["en", "de", "fr", "es", "uk"];

export default function LocalizationPage() {
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [namespace, setNamespace] = useQueryState("ns", parseAsString.withDefault(""));
  const [lang, setLang] = useQueryState("lang", parseAsString.withDefault("de"));
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [missingOnly, setMissingOnly] = useQueryState(
    "missing",
    parseAsString.withDefault("0")
  );

  const listQuery = useI18nList({
    page,
    limit: 25,
    search: search || undefined,
    namespace: namespace || undefined,
    lang,
    missingFor: missingOnly === "1" ? lang : undefined
  });

  const missingQuery = useI18nMissing({
    lang,
    namespace: namespace || undefined,
    search: search || undefined
  });

  const rows = listQuery.data?.items ?? [];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by key"
          value={search}
          onChange={(event) => void setSearch(event.target.value)}
          className="max-w-xs"
        />
        <Input
          placeholder="Namespace (e.g. cta)"
          value={namespace}
          onChange={(event) => void setNamespace(event.target.value)}
          className="max-w-xs"
        />
        <Input
          placeholder="Lang"
          value={lang}
          onChange={(event) => void setLang(event.target.value.toLowerCase())}
          className="w-24"
        />
        <Button
          type="button"
          variant={missingOnly === "1" ? "default" : "outline"}
          onClick={() => void setMissingOnly(missingOnly === "1" ? "0" : "1")}
        >
          Missing for {lang}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/localization/review">Open review queue</Link>
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        {missingQuery.data
          ? `${missingQuery.data.count} keys missing for ${lang}`
          : "Loading..."}
      </div>

      <InlineI18nEdit
        rows={rows}
        languages={
          DEFAULT_LANGS.includes(lang) ? DEFAULT_LANGS : [...DEFAULT_LANGS, lang]
        }
      />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {listQuery.data?.meta.page ?? page} / {listQuery.data?.meta.pageCount ?? 1}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => void setPage(Math.max(1, page - 1))}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            disabled={Boolean(listQuery.data && page >= listQuery.data.meta.pageCount)}
            onClick={() => void setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
