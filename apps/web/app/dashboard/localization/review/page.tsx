"use client";

import Link from "next/link";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";

import { Button, Input } from "@workspace/ui";

import { ReviewPane } from "../../../../features/i18n/review-pane";
import { useI18nReviewQueue } from "../../../../hooks/use-i18n";

export default function LocalizationReviewPage() {
  const [cursor, setCursor] = useQueryState("cursor", parseAsInteger.withDefault(0));
  const [lang, setLang] = useQueryState("lang", parseAsString.withDefault(""));

  const query = useI18nReviewQueue({
    take: 20,
    cursor,
    lang: lang || undefined
  });

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Human Translation Review</h1>
          <p className="text-sm text-muted-foreground">
            Approve or reject LLM-generated strings.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/localization">Back to Localization</Link>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Filter by lang (de, fr, es...)"
          value={lang}
          onChange={(event) => void setLang(event.target.value.toLowerCase())}
          className="w-64"
        />
      </div>

      <ReviewPane items={query.data?.items ?? []} />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Cursor: {query.data?.meta.cursor ?? cursor}</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={cursor <= 0}
            onClick={() => void setCursor(Math.max(0, cursor - 20))}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            disabled={!query.data?.meta.nextCursor}
            onClick={() => void setCursor(query.data?.meta.nextCursor ?? cursor)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
