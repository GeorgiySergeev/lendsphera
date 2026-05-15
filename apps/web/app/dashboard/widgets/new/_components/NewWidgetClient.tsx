"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@workspace/ui";
import type { DashboardWidgetStatus, DashboardWidgetType } from "@workspace/types";

import { useCreateWidget } from "../../../../../hooks/use-widgets";
import { slugify } from "../../../../../lib/utils/slugify";
import { toast } from "../../../../../lib/toast";
import { formatWidgetStatus, formatWidgetType } from "../../_components/widget-labels";

const fieldLabelClass = "text-sm font-medium text-foreground";
const textareaClass =
  "min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function NewWidgetClient() {
  const router = useRouter();
  const createMutation = useCreateWidget();

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugManual, setSlugManual] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<DashboardWidgetType>("VANILLA_JS");
  const [status, setStatus] = React.useState<DashboardWidgetStatus>("DRAFT");
  const [category, setCategory] = React.useState("");
  const [tagsRaw, setTagsRaw] = React.useState("");

  React.useEffect(() => {
    if (!slugManual) {
      setSlug(slugify(name));
    }
  }, [name, slugManual]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Name is required");

      return;
    }

    if (!slug.trim()) {
      toast.error("Slug is required");

      return;
    }

    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const widget = await createMutation.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        type,
        status,
        category: category.trim() || undefined,
        tags: tags.length ? tags : undefined
      });

      router.push(`/dashboard/widgets/${widget.id}/edit`);
    } catch {
      // toast from mutation
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" asChild>
          <Link href="/dashboard/widgets" aria-label="Back to widgets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">New widget</h1>
          <p className="text-sm text-muted-foreground">
            Create metadata, then register a bundle version.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className={fieldLabelClass} htmlFor="widget-name">
              Name
            </label>
            <Input
              id="widget-name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
              placeholder="Fortune wheel"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className={fieldLabelClass} htmlFor="widget-slug">
                Slug
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSlugManual((m) => !m)}
              >
                {slugManual ? "Auto from name" : "Edit manually"}
              </Button>
            </div>
            <Input
              id="widget-slug"
              value={slug}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSlugManual(true);
                setSlug(e.target.value);
              }}
              className="font-mono text-sm"
              placeholder="fortune-wheel"
            />
          </div>
          <div className="space-y-2">
            <label className={fieldLabelClass} htmlFor="widget-desc">
              Description
            </label>
            <textarea
              id="widget-desc"
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
            <label className={fieldLabelClass} htmlFor="widget-cat">
              Category
            </label>
            <Input
              id="widget-cat"
              value={category}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCategory(e.target.value)
              }
              placeholder="engagement"
            />
          </div>
          <div className="space-y-2">
            <label className={fieldLabelClass} htmlFor="widget-tags">
              Tags (comma-separated)
            </label>
            <Input
              id="widget-tags"
              value={tagsRaw}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTagsRaw(e.target.value)
              }
              placeholder="landing, gamification"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/widgets">Cancel</Link>
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Saving…" : "Create widget"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { NewWidgetClient };
