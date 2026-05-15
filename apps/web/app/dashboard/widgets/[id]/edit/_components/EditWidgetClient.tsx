"use client";

import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
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
import type { DashboardWidgetStatus, DashboardWidgetType } from "@workspace/types";

import {
  useCreateWidgetVersion,
  useUpdateWidget,
  useWidget,
  useWidgetVersions
} from "../../../../../../hooks/use-widgets";
import { toast } from "../../../../../../lib/toast";
import { formatWidgetStatus, formatWidgetType } from "../../../_components/widget-labels";

const defaultSchemaJson = `{
  "fields": []
}`;

const fieldLabelClass = "text-sm font-medium text-foreground";
const textareaClass =
  "min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

type EditWidgetClientProps = {
  widgetId: string;
};

function shortHash(hash: string): string {
  if (hash.length <= 12) {
    return hash;
  }

  return `${hash.slice(0, 12)}…`;
}

function EditWidgetClient({ widgetId }: EditWidgetClientProps) {
  const widgetQuery = useWidget(widgetId);
  const versionsQuery = useWidgetVersions(widgetId);
  const updateMutation = useUpdateWidget(widgetId);
  const createVersionMutation = useCreateWidgetVersion(widgetId);

  const w = widgetQuery.data;

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<DashboardWidgetType>("VANILLA_JS");
  const [status, setStatus] = React.useState<DashboardWidgetStatus>("DRAFT");
  const [category, setCategory] = React.useState("");
  const [tagsRaw, setTagsRaw] = React.useState("");
  const [thumbnailUrl, setThumbnailUrl] = React.useState("");
  const [previewUrl, setPreviewUrl] = React.useState("");

  const [verVersion, setVerVersion] = React.useState("0.1.0");
  const [verBundleUrl, setVerBundleUrl] = React.useState("");
  const [verBundleHash, setVerBundleHash] = React.useState("");
  const [verSchemaJson, setVerSchemaJson] = React.useState(defaultSchemaJson);
  const [verChangelog, setVerChangelog] = React.useState("");
  const [verIsLatest, setVerIsLatest] = React.useState(true);

  React.useEffect(() => {
    if (!w) {
      return;
    }

    setName(w.name);
    setSlug(w.slug);
    setDescription(w.description ?? "");
    setType(w.type);
    setStatus(w.status);
    setCategory(w.category ?? "");
    setTagsRaw(w.tags.join(", "));
    setThumbnailUrl(w.thumbnailUrl ?? "");
    setPreviewUrl(w.previewUrl ?? "");
  }, [w]);

  const saveMeta = async () => {
    if (!name.trim()) {
      toast.error("Name is required");

      return;
    }

    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      await updateMutation.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        type,
        status,
        category: category.trim() || undefined,
        tags,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        previewUrl: previewUrl.trim() || undefined
      });
    } catch {
      // handled in hook
    }
  };

  const addVersion = async () => {
    if (!verVersion.trim() || !verBundleUrl.trim() || !verBundleHash.trim()) {
      toast.error("Version, bundle URL, and hash are required");

      return;
    }

    let schema: unknown = {};

    try {
      schema = JSON.parse(verSchemaJson) as unknown;
    } catch {
      toast.error("Schema must be valid JSON");

      return;
    }

    try {
      await createVersionMutation.mutateAsync({
        version: verVersion.trim(),
        bundleUrl: verBundleUrl.trim(),
        bundleHash: verBundleHash.trim(),
        schema,
        changelog: verChangelog.trim() || undefined,
        isLatest: verIsLatest
      });
      setVerChangelog("");
    } catch {
      // handled in hook
    }
  };

  if (widgetQuery.isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full max-w-3xl" />
      </div>
    );
  }

  if (!w) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Widget not found.</p>
        <Button
          type="button"
          variant="ghost"
          asChild
          className="mt-2 h-auto px-0 py-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <Link href="/dashboard/widgets">Back to library</Link>
        </Button>
      </div>
    );
  }

  const versions = versionsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="icon" asChild>
          <Link href="/dashboard/widgets" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">Edit widget</h1>
          <p className="truncate font-mono text-sm text-muted-foreground">{w.slug}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className={fieldLabelClass} htmlFor="ew-name">
                Name
              </label>
              <Input
                id="ew-name"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setName(e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <label className={fieldLabelClass} htmlFor="ew-slug">
                Slug
              </label>
              <Input
                id="ew-slug"
                value={slug}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSlug(e.target.value)
                }
                className="font-mono text-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className={fieldLabelClass} htmlFor="ew-desc">
              Description
            </label>
            <textarea
              id="ew-desc"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              rows={3}
              className={textareaClass}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <span className={fieldLabelClass}>Type</span>
              <Select
                value={type}
                onValueChange={(v: string) => setType(v as DashboardWidgetType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VANILLA_JS">
                    {formatWidgetType("VANILLA_JS")}
                  </SelectItem>
                  <SelectItem value="REACT">{formatWidgetType("REACT")}</SelectItem>
                  <SelectItem value="WEB_COMPONENT">
                    {formatWidgetType("WEB_COMPONENT")}
                  </SelectItem>
                  <SelectItem value="IFRAME">{formatWidgetType("IFRAME")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className={fieldLabelClass}>Status</span>
              <Select
                value={status}
                onValueChange={(v: string) => setStatus(v as DashboardWidgetStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">{formatWidgetStatus("DRAFT")}</SelectItem>
                  <SelectItem value="PUBLISHED">
                    {formatWidgetStatus("PUBLISHED")}
                  </SelectItem>
                  <SelectItem value="DEPRECATED">
                    {formatWidgetStatus("DEPRECATED")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <label className={fieldLabelClass} htmlFor="ew-cat">
              Category
            </label>
            <Input
              id="ew-cat"
              value={category}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCategory(e.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <label className={fieldLabelClass} htmlFor="ew-tags">
              Tags (comma-separated)
            </label>
            <Input
              id="ew-tags"
              value={tagsRaw}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTagsRaw(e.target.value)
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className={fieldLabelClass} htmlFor="ew-thumb">
                Thumbnail URL
              </label>
              <Input
                id="ew-thumb"
                value={thumbnailUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setThumbnailUrl(e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <label className={fieldLabelClass} htmlFor="ew-preview">
                Preview URL
              </label>
              <Input
                id="ew-preview"
                value={previewUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPreviewUrl(e.target.value)
                }
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => void saveMeta()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : "Save metadata"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Versions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {versionsQuery.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No versions yet. Add one below.
            </p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Latest</TableHead>
                    <TableHead>Hash (short)</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono text-xs">{v.version}</TableCell>
                      <TableCell>{v.isLatest ? "Yes" : "—"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {shortHash(v.bundleHash)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(v.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="border-t pt-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Register new version
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className={fieldLabelClass} htmlFor="nv-ver">
                  Version
                </label>
                <Input
                  id="nv-ver"
                  value={verVersion}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setVerVersion(e.target.value)
                  }
                  placeholder="0.1.0"
                />
              </div>
              <div className="space-y-2">
                <label className={fieldLabelClass} htmlFor="nv-hash">
                  Bundle hash (sha256)
                </label>
                <Input
                  id="nv-hash"
                  value={verBundleHash}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setVerBundleHash(e.target.value)
                  }
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <label className={fieldLabelClass} htmlFor="nv-url">
                Bundle URL
              </label>
              <Input
                id="nv-url"
                value={verBundleUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setVerBundleUrl(e.target.value)
                }
                className="font-mono text-xs"
              />
            </div>
            <div className="mt-4 space-y-2">
              <label className={fieldLabelClass} htmlFor="nv-schema">
                Schema (JSON)
              </label>
              <textarea
                id="nv-schema"
                value={verSchemaJson}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setVerSchemaJson(e.target.value)
                }
                className={textareaClass}
              />
            </div>
            <div className="mt-4 space-y-2">
              <label className={fieldLabelClass} htmlFor="nv-changelog">
                Changelog
              </label>
              <Input
                id="nv-changelog"
                value={verChangelog}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setVerChangelog(e.target.value)
                }
              />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Checkbox
                id="nv-latest"
                checked={verIsLatest}
                onCheckedChange={(c) => setVerIsLatest(Boolean(c))}
              />
              <label htmlFor="nv-latest" className="text-sm font-normal text-foreground">
                Mark as latest
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                onClick={() => void addVersion()}
                disabled={createVersionMutation.isPending}
              >
                {createVersionMutation.isPending ? "Saving…" : "Add version"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { EditWidgetClient };
