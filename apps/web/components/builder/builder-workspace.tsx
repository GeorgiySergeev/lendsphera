"use client";

import dynamic from "next/dynamic";
import type { EditorRef, EmailEditorProps } from "react-email-editor";
import {
  CheckCircle2,
  Code2,
  CopyPlus,
  Download,
  Eye,
  EyeOff,
  FilePlus2,
  Rocket,
  Save
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Badge, Button, Input, Skeleton } from "@workspace/ui";

import {
  useBuilderPage,
  useBuilderVersions,
  useCreateBuilderPage,
  useDuplicateBuilderPage,
  useLatestBuilderPage,
  useSaveBuilderDraft,
  useUpdateBuilderPage
} from "../../hooks/use-builder";
import { toast } from "../../lib/toast";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EmailEditor = dynamic(() => import("react-email-editor"), { ssr: false }) as any;

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

const UNLAYER_PROJECT_ID = 286886;

function BuilderWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageId = searchParams.get("id");
  const emailEditorRef = React.useRef<EditorRef | null>(null);
  const lastSavedRef = React.useRef<string>("");
  const hydrationRef = React.useRef(false);
  const createRequestedRef = React.useRef(false);
  const [resolvedPageId, setResolvedPageId] = React.useState<string | null>(pageId);

  const latestPageQuery = useLatestBuilderPage();
  const pageQuery = useBuilderPage(resolvedPageId);
  const versionsQuery = useBuilderVersions(resolvedPageId);
  const createPageMutation = useCreateBuilderPage();
  const duplicatePageMutation = useDuplicateBuilderPage();

  const saveDraftMutation = useSaveBuilderDraft(resolvedPageId ?? "");
  const updatePageMutation = useUpdateBuilderPage(resolvedPageId ?? "");

  const [preview, setPreview] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);
  const [titleDraft, setTitleDraft] = React.useState("Untitled builder page");

  React.useEffect(() => {
    if (pageId) {
      setResolvedPageId(pageId);
    }
  }, [pageId]);

  React.useEffect(() => {
    if (!resolvedPageId && latestPageQuery.isSuccess && !createRequestedRef.current) {
      createRequestedRef.current = true;

      if (latestPageQuery.data?.id) {
        setResolvedPageId(latestPageQuery.data.id);
        router.replace(`${pathname}?id=${latestPageQuery.data.id}`);
        return;
      }

      createPageMutation.mutate(
        { name: "Untitled builder page" },
        {
          onSuccess: (page) => {
            setResolvedPageId(page.id);
            router.replace(`${pathname}?id=${page.id}`);
          }
        }
      );
    }
  }, [
    createPageMutation,
    latestPageQuery.data,
    latestPageQuery.isSuccess,
    pathname,
    resolvedPageId,
    router
  ]);

  React.useEffect(() => {
    if (!pageQuery.data) {
      return;
    }

    setTitleDraft(pageQuery.data.name);
    setLastSavedAt(new Date(pageQuery.data.updatedAt));
  }, [pageQuery.data]);

  const getUnlayerInstance = React.useCallback(() => {
    return emailEditorRef.current?.editor ?? null;
  }, []);

  const serializeEditor = React.useCallback((): Promise<{
    design: unknown;
    html: string;
  } | null> => {
    const unlayer = getUnlayerInstance();

    if (!unlayer) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      unlayer.exportHtml((data: { design: unknown; html: string }) => {
        const { design, html } = data;
        resolve({ design, html });
      });
    });
  }, [getUnlayerInstance]);

  React.useEffect(() => {
    if (!resolvedPageId) {
      return;
    }

    const interval = window.setInterval(() => {
      if (saveDraftMutation.isPending || !hydrationRef.current) {
        return;
      }

      void serializeEditor().then((payload) => {
        if (!payload) {
          return;
        }

        const next = JSON.stringify(payload);

        if (next === lastSavedRef.current) {
          return;
        }

        lastSavedRef.current = next;
        setSaveStatus("saving");
        saveDraftMutation.mutate(
          {
            design: payload.design,
            html: payload.html,
            message: "Autosaved builder draft"
          },
          {
            onSuccess: () => {
              setSaveStatus("saved");
              setLastSavedAt(new Date());
            },
            onError: () => {
              setSaveStatus("error");
            }
          }
        );
      });
    }, 10_000);

    return () => window.clearInterval(interval);
  }, [resolvedPageId, saveDraftMutation, serializeEditor]);

  const handleManualSave = React.useCallback(() => {
    if (!resolvedPageId) {
      return;
    }

    void serializeEditor().then((payload) => {
      if (!payload) {
        return;
      }

      lastSavedRef.current = JSON.stringify(payload);
      setSaveStatus("saving");
      saveDraftMutation.mutate(
        {
          design: payload.design,
          html: payload.html,
          message: "Manual builder save"
        },
        {
          onSuccess: () => {
            setSaveStatus("saved");
            setLastSavedAt(new Date());
            toast.success("Builder draft saved");
          },
          onError: () => {
            setSaveStatus("error");
          }
        }
      );
    });
  }, [resolvedPageId, saveDraftMutation, serializeEditor]);

  const handleEditorLoad: EmailEditorProps["onLoad"] = React.useCallback(
    (unlayer: Parameters<NonNullable<EmailEditorProps["onLoad"]>>[0]) => {
      const savedDesign = pageQuery.data?.design;

      if (savedDesign && typeof savedDesign === "object") {
        unlayer.loadDesign(savedDesign as Parameters<typeof unlayer.loadDesign>[0]);
      }

      unlayer.addEventListener("design:updated", () => {
        if (!hydrationRef.current) {
          return;
        }

        setSaveStatus((current) => (current === "saving" ? current : "dirty"));
      });
    },
    [pageQuery.data?.design]
  );

  const handleEditorReady: EmailEditorProps["onReady"] = React.useCallback(() => {
    hydrationRef.current = true;

    void serializeEditor().then((payload) => {
      if (payload) {
        lastSavedRef.current = JSON.stringify(payload);
      }
    });
  }, [serializeEditor]);

  const handleTogglePreview = React.useCallback(() => {
    const unlayer = getUnlayerInstance();

    if (!unlayer) {
      return;
    }

    if (preview) {
      unlayer.hidePreview();
      setPreview(false);
    } else {
      unlayer.showPreview("desktop");
      setPreview(true);
    }
  }, [getUnlayerInstance, preview]);

  const handleExportHtml = React.useCallback(() => {
    void serializeEditor().then((payload) => {
      if (!payload) {
        return;
      }

      const blob = new Blob([payload.html], { type: "text/html;charset=utf-8" });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `${slugify(titleDraft || "builder-page")}.html`;
      anchor.click();
      URL.revokeObjectURL(href);
      toast.success("HTML export downloaded");
    });
  }, [serializeEditor, titleDraft]);

  const handleSaveDesignJson = React.useCallback(() => {
    const unlayer = getUnlayerInstance();

    if (!unlayer) {
      return;
    }

    unlayer.saveDesign((design: Record<string, unknown>) => {
      const blob = new Blob([JSON.stringify(design, null, 2)], {
        type: "application/json;charset=utf-8"
      });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `${slugify(titleDraft || "builder-page")}-design.json`;
      anchor.click();
      URL.revokeObjectURL(href);
      toast.success("Design JSON exported");
    });
  }, [getUnlayerInstance, titleDraft]);

  const handleCreateNewPage = React.useCallback(() => {
    createPageMutation.mutate(
      { name: "Untitled builder page" },
      {
        onSuccess: (page) => {
          setResolvedPageId(page.id);
          router.replace(`${pathname}?id=${page.id}`);
        }
      }
    );
  }, [createPageMutation, pathname, router]);

  const handleDuplicatePage = React.useCallback(() => {
    if (!resolvedPageId) {
      return;
    }

    duplicatePageMutation.mutate(resolvedPageId, {
      onSuccess: (page) => {
        setResolvedPageId(page.id);
        router.replace(`${pathname}?id=${page.id}`);
      }
    });
  }, [duplicatePageMutation, pathname, resolvedPageId, router]);

  const handleRenamePage = React.useCallback(() => {
    if (
      !resolvedPageId ||
      !titleDraft.trim() ||
      titleDraft.trim() === pageQuery.data?.name
    ) {
      return;
    }

    updatePageMutation.mutate({ name: titleDraft.trim() });
  }, [pageQuery.data?.name, resolvedPageId, titleDraft, updatePageMutation]);

  if (
    latestPageQuery.isLoading ||
    (!resolvedPageId && createPageMutation.isPending) ||
    (resolvedPageId && pageQuery.isLoading)
  ) {
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center rounded-xl border bg-background">
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    );
  }

  if (resolvedPageId && pageQuery.isError) {
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center rounded-xl border bg-background p-8">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold">Builder page unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The current builder document could not be loaded. Try creating a fresh page.
          </p>
          <Button className="mt-4" onClick={handleCreateNewPage}>
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            Create new page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
      <header className="sticky z-20 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-4 py-2.5 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCreateNewPage}>
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            New
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicatePage}
            disabled={!resolvedPageId}
          >
            <CopyPlus className="h-4 w-4" aria-hidden="true" />
            Duplicate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSave}
            disabled={!resolvedPageId}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Save
          </Button>
          <Button variant="outline" size="sm" onClick={handleTogglePreview}>
            {preview ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
            {preview ? "Hide Preview" : "Preview"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportHtml}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export HTML
          </Button>
          <Button variant="outline" size="sm" onClick={handleSaveDesignJson}>
            <Code2 className="h-4 w-4" aria-hidden="true" />
            Export JSON
          </Button>
          <Button
            size="sm"
            onClick={() => toast.info("Publish flow will land in the next backend pass")}
          >
            <Rocket className="h-4 w-4" aria-hidden="true" />
            Publish
          </Button>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="border-b px-4 py-2 bg-background/95 backdrop-blur flex flex-row items-center justify-between gap-4">
          <Input
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={handleRenamePage}
            placeholder="Landing name"
            className="flex-1 min-w-0"
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <SaveStatusBadge status={saveStatus} />
            <span>
              {lastSavedAt
                ? `Last saved ${lastSavedAt.toLocaleTimeString()}`
                : "Autosave every 10 seconds"}
            </span>
          </div>
        </div>
        <div className="flex-1 builder-email-editor-shell h-full min-h-0 overflow-hidden">
          <EmailEditor
            ref={emailEditorRef}
            minHeight={0}
            onLoad={handleEditorLoad}
            onReady={handleEditorReady}
            projectId={UNLAYER_PROJECT_ID}
            options={{
              version: "latest",
              appearance: {
                theme: "modern_light"
              },
              features: {
                textEditor: {
                  tables: true
                }
              },
              tools: {
                image: { enabled: true },
                button: { enabled: true },
                divider: { enabled: true },
                html: { enabled: true },
                text: { enabled: true },
                heading: { enabled: true },
                video: { enabled: true },
                social: { enabled: true },
                timer: { enabled: true },
                menu: { enabled: true }
              }
            }}
            style={{ height: "100%" }}
          />
        </div>
      </div>

      {versionsQuery.data && versionsQuery.data.length > 0 ? (
        <footer className="flex items-center gap-3 border-t bg-background/95 px-4 py-2 text-xs text-muted-foreground backdrop-blur">
          <span>
            {versionsQuery.data.length} version{versionsQuery.data.length > 1 ? "s" : ""}
          </span>
          <span className="text-muted-foreground/50">|</span>
          <span>
            Latest: v{versionsQuery.data[0].versionNum}
            {versionsQuery.data[0].author?.email ? " by " : ""}
          </span>
        </footer>
      ) : null}
    </div>
  );
}

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  const labels: Record<SaveStatus, string> = {
    dirty: "Unsaved changes",
    error: "Save error",
    idle: "Ready",
    saved: "Draft saved",
    saving: "Saving draft"
  };

  return (
    <Badge
      variant={status === "error" ? "outline" : "secondary"}
      className="rounded-full"
    >
      {status === "saved" ? (
        <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
      ) : null}
      {labels[status]}
    </Badge>
  );
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "builder-page"
  );
}

export { BuilderWorkspace };
