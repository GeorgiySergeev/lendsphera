"use client";

import { Check, Pencil, Save, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button, Input } from "@workspace/ui";

import type { I18nGridRow } from "../../lib/api/localization";
import { useRenameI18nKey, useUpsertI18n } from "../../hooks/use-i18n";

type Props = {
  rows: I18nGridRow[];
  languages: string[];
};

export function InlineI18nEdit({ rows, languages }: Props) {
  const upsert = useUpsertI18n();
  const rename = useRenameI18nKey();
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [newKeyDraft, setNewKeyDraft] = useState("");

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.key.localeCompare(b.key)),
    [rows]
  );

  return (
    <div className="overflow-auto rounded-lg border bg-card">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Key</th>
            <th className="px-3 py-2 text-left font-medium">Context</th>
            {languages.map((lang) => (
              <th key={lang} className="px-3 py-2 text-left font-medium uppercase">
                {lang}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={row.key} className="border-t align-top">
              <td className="px-3 py-2">
                {renamingKey === row.key ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newKeyDraft}
                      onChange={(event) => setNewKeyDraft(event.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!newKeyDraft.trim()) return;
                        rename.mutate({ oldKey: row.key, newKey: newKeyDraft.trim() });
                        setRenamingKey(null);
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRenamingKey(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{row.key}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setRenamingKey(row.key);
                        setNewKeyDraft(row.key);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground">{row.context ?? "-"}</td>
              {languages.map((lang) => {
                const cellId = `${row.key}::${lang}`;
                const value = row.translations[lang] ?? "";
                const isMissing = !row.translations[lang];

                return (
                  <td key={cellId} className="px-3 py-2">
                    {editingCell === cellId ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={draftValue}
                          onChange={(event) => setDraftValue(event.target.value)}
                          autoFocus
                        />
                        <Button
                          size="icon"
                          onClick={() => {
                            upsert.mutate({ key: row.key, lang, value: draftValue });
                            setEditingCell(null);
                          }}
                        >
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={`w-full rounded border px-2 py-1 text-left ${
                          isMissing
                            ? "border-amber-300 bg-amber-50"
                            : "border-transparent"
                        }`}
                        onClick={() => {
                          setEditingCell(cellId);
                          setDraftValue(value);
                        }}
                      >
                        {value || "Missing"}
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
