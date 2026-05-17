"use client";

import { useMemo, useState } from "react";

import { Button, Input } from "@workspace/ui";

import type { I18nReviewItem } from "../../lib/api/localization";
import { useApproveI18nReview, useRejectI18nReview } from "../../hooks/use-i18n";

type ReviewPaneProps = {
  items: I18nReviewItem[];
};

export function ReviewPane({ items }: ReviewPaneProps) {
  const approve = useApproveI18nReview();
  const reject = useRejectI18nReview();

  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const [draft, setDraft] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0] ?? null,
    [items, selectedId]
  );

  const currentDraft = draft || selected?.mtValue || "";

  return (
    <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
      <div className="rounded-lg border bg-card">
        <div className="border-b px-3 py-2 text-sm font-medium">Pending translations</div>
        <div className="max-h-[70vh] overflow-auto p-2">
          {items.length === 0 ? (
            <div className="rounded border border-dashed p-4 text-sm text-muted-foreground">
              No pending machine translations.
            </div>
          ) : null}
          <div className="space-y-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedId(item.id);
                  setDraft(item.mtValue);
                  setRejectReason("");
                }}
                className={`w-full rounded border p-2 text-left text-sm ${
                  selected?.id === item.id
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <div className="font-mono text-xs">{item.key}</div>
                <div className="mt-1 text-xs text-muted-foreground uppercase">
                  {item.lang}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border bg-card p-4">
        {selected ? (
          <>
            <div>
              <div className="text-xs text-muted-foreground">Key</div>
              <div className="font-mono text-sm">{selected.key}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">
                Source ({selected.source?.lang ?? "n/a"})
              </div>
              <div className="mt-1 rounded border bg-muted/20 p-3 text-sm whitespace-pre-wrap">
                {selected.source?.value ?? "No source string found"}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">
                Machine translation ({selected.lang})
              </div>
              <textarea
                className="mt-1 min-h-[180px] w-full rounded-md border bg-background p-3 text-sm"
                value={currentDraft}
                onChange={(event) => setDraft(event.target.value)}
              />
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Context</div>
              <div className="mt-1 rounded border bg-muted/20 p-2 text-sm">
                {selected.context ?? "-"}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <Input
                placeholder="Reject reason (used in next LLM prompt)"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
              />
              <Button
                variant="outline"
                disabled={reject.isPending || rejectReason.trim().length < 3}
                onClick={() => {
                  reject.mutate({ id: selected.id, reason: rejectReason.trim() });
                }}
              >
                Reject + requeue
              </Button>
              <Button
                disabled={approve.isPending || currentDraft.trim().length === 0}
                onClick={() => {
                  approve.mutate({ id: selected.id, value: currentDraft.trim() });
                }}
              >
                Approve
              </Button>
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            Select a queued translation to review.
          </div>
        )}
      </div>
    </div>
  );
}
