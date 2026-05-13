"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import type { Editor } from "grapesjs";
import type { PlaceholderSchema, PlaceholderValue } from "@workspace/types";
import {
  parseWidgetProps,
  serializeWidgetProps,
  widgetSchemas
} from "@workspace/widgets";
import {
  CheckCircle2,
  ChevronDown,
  Code2,
  Eye,
  LayoutGrid,
  Layers3,
  Monitor,
  Paintbrush,
  PanelLeft,
  PanelRight,
  Rocket,
  Save,
  Settings2,
  Smartphone,
  Tablet,
  Upload,
  X
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ScrollArea,
  Separator,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn
} from "@workspace/ui";

import {
  acquireLandingLock,
  fetchLandingEditorDocument,
  fetchLandingVersions,
  refreshLandingLock,
  releaseLandingLock,
  saveLandingDraftVersion,
  type LandingEditorDraftPayload
} from "../../lib/api/landings";
import { toast } from "../../lib/toast";
import {
  buildInitialPlaceholderValues,
  extractPlaceholderKeys,
  normalizePlaceholderSchema,
  renderPlaceholderTemplate
} from "../../lib/editor/placeholders";
import { ensureLandingRoot, processCustomCss } from "../../lib/editor/custom-css";
import { GrapesCanvas } from "./landing-grapes-canvas";
import { KeyboardShortcutsPanel } from "./keyboard-shortcuts-panel";
import { LandingCodePanel } from "./landing-code-panel";
import { PlaceholderContentPanel } from "./placeholder-content-panel";
import { WidgetConfigPanel } from "./widget-config-panel";
import { PublishModal } from "./publish-modal";
import { ComponentsPanel } from "./components-panel";

type Device = "mobile" | "tablet" | "desktop";

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "unavailable" | "error";

type LandingEditorShellProps = {
  landingId: string;
};

type GrapesComponent = {
  addAttributes: (attributes: Record<string, string>) => void;
  getAttributes: () => Record<string, unknown>;
};

const deviceStorageKey = "landing-editor-device";
const devicePreviewWidths: Record<Device, number> = {
  desktop: 1440,
  mobile: 375,
  tablet: 768
};

const devices: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: Device;
}[] = [
  { icon: Smartphone, label: "Mobile", value: "mobile" },
  { icon: Tablet, label: "Tablet", value: "tablet" },
  { icon: Monitor, label: "Desktop", value: "desktop" }
];

const leftTabs = [
  { id: "components", label: "Components", icon: LayoutGrid },
  { id: "blocks", label: "Blocks", icon: PanelLeft },
  { id: "layers", label: "Layers", icon: Layers3 },
  { id: "assets", label: "Assets", icon: Upload }
] as const;

const rightTabs = [
  { id: "content", label: "Content", icon: PanelRight },
  { id: "style", label: "Style", icon: Paintbrush },
  { id: "advanced", label: "Advanced", icon: Settings2 },
  { id: "code", label: "Code", icon: Code2 }
] as const;

/** Narrow GrapesJS `Editor` for APIs used here (upstream typings omit some members). */
type GrapesEditor = Editor & {
  AssetManager: {
    getAll: () => { toJSON: () => unknown };
  };
  runCommand: (command: string) => unknown;
  select: (component: unknown | null) => unknown;
  getSelected: () => unknown;
};

function LandingEditorShell({ landingId }: LandingEditorShellProps) {
  const editorRef = React.useRef<GrapesEditor | null>(null);
  const lastSavedRef = React.useRef<string>("");
  const placeholderRenderRef = React.useRef(false);
  const customCssRenderRef = React.useRef(false);
  const [device, setDevice] = React.useState<Device>(() => getStoredDevice());
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("idle");
  const [activeLeftTab, setActiveLeftTab] =
    React.useState<(typeof leftTabs)[number]["id"]>("blocks");
  const [activeRightTab, setActiveRightTab] =
    React.useState<(typeof rightTabs)[number]["id"]>("content");
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);
  const [codeSnapshot, setCodeSnapshot] = React.useState({ css: "", html: "" });
  const [customCss, setCustomCss] = React.useState("");
  const [customCssError, setCustomCssError] = React.useState<string | null>(null);
  const [placeholderValues, setPlaceholderValues] = React.useState<PlaceholderValue>({});
  const [isPublishModalOpen, setIsPublishModalOpen] = React.useState(false);
  const [selectedWidget, setSelectedWidget] = React.useState<{
    component: GrapesComponent;
    props: Record<string, unknown>;
    slug: string;
  } | null>(null);
  const [lockStatus, setLockStatus] = React.useState<
    "acquiring" | "locked" | "lost" | "error" | null
  >(null);
  const [showShortcutsPanel, setShowShortcutsPanel] = React.useState(false);

  const documentQuery = useQuery({
    queryKey: ["landings", landingId, "editor"],
    queryFn: () => fetchLandingEditorDocument(landingId),
    retry: false
  });
  const versionsQuery = useQuery({
    queryKey: ["landings", landingId, "versions"],
    queryFn: () => fetchLandingVersions(landingId),
    retry: false
  });
  const draftMutation = useMutation({
    mutationFn: (payload: LandingEditorDraftPayload) =>
      saveLandingDraftVersion(landingId, payload),
    onError: () => setSaveStatus("unavailable"),
    onMutate: () => setSaveStatus("saving"),
    onSuccess: () => {
      setSaveStatus("saved");
      setLastSavedAt(new Date());
    }
  });
  const draftMutate = draftMutation.mutate;
  const isDraftPending = draftMutation.isPending;
  const sourceTemplateHtml = React.useMemo(
    () => documentQuery.data?.templateHtml ?? documentQuery.data?.html ?? "",
    [documentQuery.data?.html, documentQuery.data?.templateHtml]
  );
  const placeholderSchema = React.useMemo(
    () =>
      normalizePlaceholderSchema(
        documentQuery.data?.template?.schema as PlaceholderSchema | null | undefined,
        extractPlaceholderKeys(sourceTemplateHtml)
      ),
    [documentQuery.data?.template?.schema, sourceTemplateHtml]
  );
  const debouncedPlaceholderValues = useDebouncedValue(placeholderValues, 350);
  const debouncedCustomCss = useDebouncedValue(customCss, 350);

  const serializeEditor = React.useCallback((): LandingEditorDraftPayload | null => {
    const editor = editorRef.current;

    if (!editor) {
      return null;
    }

    return {
      assets: editor.AssetManager.getAll().toJSON(),
      components: editor.getComponents().toJSON(),
      css: editor.getCss() ?? "",
      customCss,
      device,
      html: editor.getHtml(),
      message: "Autosaved draft from editor",
      placeholderValues,
      source: "grapesjs",
      styles: editor.getStyle()
    };
  }, [customCss, device, placeholderValues]);

  const syncCodeSnapshot = React.useCallback(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    setCodeSnapshot({ css: editor.getCss() ?? "", html: editor.getHtml() });
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem(deviceStorageKey, device);
  }, [device]);

  const lockStatusRef = React.useRef(lockStatus);
  lockStatusRef.current = lockStatus;

  React.useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout | null = null;

    async function acquireLock() {
      try {
        setLockStatus("acquiring");
        await acquireLandingLock(landingId, 2);
        setLockStatus("locked");
        toast.success("Editor locked", "You have exclusive edit access");

        heartbeatInterval = setInterval(async () => {
          try {
            await refreshLandingLock(landingId);
          } catch {
            setLockStatus("lost");
            toast.error("Lock lost", "Another user may have taken control");
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval);
            }
          }
        }, 30000);
      } catch {
        setLockStatus("error");
        toast.error("Could not acquire lock", "Another user may be editing");
      }
    }

    void acquireLock();

    const handleBeforeUnload = () => {
      if (lockStatusRef.current === "locked") {
        void releaseLandingLock(landingId);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (lockStatusRef.current === "locked") {
        void releaseLandingLock(landingId);
      }
    };
  }, [landingId]);

  const documentDataLoadedRef = React.useRef(false);
  const documentDataRef = React.useRef(documentQuery.data);
  documentDataRef.current = documentQuery.data;

  React.useEffect(() => {
    if (!documentQuery.data || documentDataLoadedRef.current) {
      return;
    }

    documentDataLoadedRef.current = true;
    setCustomCss(documentQuery.data.customCss ?? "");
    setPlaceholderValues(
      buildInitialPlaceholderValues(
        placeholderSchema,
        documentQuery.data.placeholderValues
      )
    );
  }, [documentQuery.data, placeholderSchema]);

  React.useEffect(() => {
    const editor = editorRef.current;

    if (!editor || !sourceTemplateHtml) {
      return;
    }

    placeholderRenderRef.current = true;
    editor.setComponents(
      ensureLandingRoot(
        renderPlaceholderTemplate(sourceTemplateHtml, debouncedPlaceholderValues)
      )
    );
    syncCodeSnapshot();
    window.setTimeout(() => {
      placeholderRenderRef.current = false;
    }, 0);
  }, [debouncedPlaceholderValues, sourceTemplateHtml, syncCodeSnapshot]);

  React.useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const activeEditor = editor;

    let cancelled = false;

    async function applyCustomCss() {
      const result = await processCustomCss(debouncedCustomCss);

      if (cancelled) {
        return;
      }

      setCustomCssError(result.error);

      if (result.error) {
        return;
      }

      customCssRenderRef.current = true;
      activeEditor.setStyle(result.css);
      syncCodeSnapshot();
      window.setTimeout(() => {
        customCssRenderRef.current = false;
      }, 0);
    }

    void applyCustomCss();

    return () => {
      cancelled = true;
    };
  }, [debouncedCustomCss, syncCodeSnapshot]);

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      const payload = serializeEditor();

      if (!payload || isDraftPending) {
        return;
      }

      const next = JSON.stringify(payload);

      if (next === lastSavedRef.current) {
        return;
      }

      lastSavedRef.current = next;
      draftMutate(payload);
    }, 10000);

    return () => window.clearInterval(interval);
  }, [draftMutate, isDraftPending, serializeEditor]);

  const handleManualSave = React.useCallback(() => {
    const payload = serializeEditor();

    if (payload) {
      lastSavedRef.current = JSON.stringify(payload);
      draftMutate(payload);
    }
  }, [serializeEditor, draftMutate]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      if (modifier && event.key === "s") {
        event.preventDefault();
        handleManualSave();
        toast.success("Draft saved");
        return;
      }

      if (modifier && event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        editorRef.current?.runCommand("core:undo");
        return;
      }

      if (
        (modifier && event.shiftKey && event.key === "z") ||
        (modifier && event.key === "y")
      ) {
        event.preventDefault();
        editorRef.current?.runCommand("core:redo");
        return;
      }

      if (modifier && event.key === "d") {
        event.preventDefault();
        const selected = editorRef.current?.getSelected();
        if (selected) {
          editorRef.current?.runCommand("core:copy");
          editorRef.current?.runCommand("core:paste");
          toast.success("Component duplicated");
        }
        return;
      }

      if (event.key === "?" && event.shiftKey) {
        event.preventDefault();
        setShowShortcutsPanel(true);
        return;
      }

      if (event.key === "Escape") {
        setShowShortcutsPanel(false);
        editorRef.current?.select(null);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleManualSave]);

  const handleEditorReady = React.useCallback(
    (editor: Editor) => {
      editorRef.current = editor as GrapesEditor;
      syncCodeSnapshot();
      editor.on("update", () => {
        if (placeholderRenderRef.current || customCssRenderRef.current) {
          return;
        }

        setSaveStatus((current) => (current === "saving" ? current : "dirty"));
        syncCodeSnapshot();
      });
      editor.on("component:selected", (component: unknown) => {
        setSelectedWidget(readSelectedWidget(toGrapesComponent(component)));
      });
      editor.on("component:deselected", () => {
        setSelectedWidget(null);
      });
    },
    [syncCodeSnapshot]
  );

  const handleDeviceChange = (nextDevice: Device) => {
    setDevice(nextDevice);
    editorRef.current?.setDevice(nextDevice);
  };

  const handlePlaceholderChange = (key: string, value: PlaceholderValue[string]) => {
    setPlaceholderValues((current) => ({ ...current, [key]: value }));
    setSaveStatus((current) => (current === "saving" ? current : "dirty"));
  };
  const handleCustomCssChange = (value: string) => {
    setCustomCss(value);
    setSaveStatus((current) => (current === "saving" ? current : "dirty"));
  };
  const handleWidgetConfigChange = (key: string, value: unknown) => {
    setSelectedWidget((current) => {
      if (!current) {
        return current;
      }

      const nextProps = { ...current.props, [key]: value };
      current.component.addAttributes({
        "data-widget-props": serializeWidgetProps(nextProps)
      });
      setSaveStatus((status) => (status === "saving" ? status : "dirty"));
      syncCodeSnapshot();

      return { ...current, props: nextProps };
    });
  };

  const title = documentQuery.data
    ? "Landing editor"
    : `Landing ${landingId.slice(0, 8)}`;

  if (documentQuery.isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center rounded-xl border bg-background shadow-sm">
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
      <EditorTopBar
        device={device}
        isPublishing={isPublishModalOpen}
        lastSavedAt={lastSavedAt}
        onDeviceChange={handleDeviceChange}
        onManualSave={handleManualSave}
        onPublish={() => setIsPublishModalOpen(true)}
        saveStatus={saveStatus}
        title={title}
        versions={versionsQuery.data?.length ?? 0}
      />
      <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1 bg-muted/30">
        <ResizablePanel
          defaultSize={18}
          minSize={12}
          maxSize={35}
          className="hidden lg:flex"
        >
          <EditorPanel
            tabs={leftTabs}
            activeTab={activeLeftTab}
            onTabChange={setActiveLeftTab}
            side="left"
          >
            <div
              className={cn(
                activeLeftTab !== "components" && "hidden",
                "h-full w-full overflow-hidden"
              )}
            >
              {editorRef.current && <ComponentsPanel editor={editorRef.current} />}
            </div>
            <div className={cn(activeLeftTab !== "blocks" && "hidden")} id="gjs-blocks" />
            <div className={cn(activeLeftTab !== "layers" && "hidden")} id="gjs-layers" />
            <div className={cn(activeLeftTab !== "assets" && "hidden")} id="gjs-assets" />
            {documentQuery.isLoading ? <Skeleton className="mt-4 h-24 w-full" /> : null}
          </EditorPanel>
        </ResizablePanel>
        <ResizableHandle withHandle className="hidden lg:flex" />
        <ResizablePanel defaultSize={60} minSize={30}>
          <main className="h-full min-w-0 overflow-x-auto bg-muted/40 p-4">
            <Card className="flex h-full justify-center overflow-hidden border-dashed bg-background/95">
              <CardContent className="h-full p-0">
                <motion.div
                  animate={{ width: devicePreviewWidths[device] }}
                  className="h-full max-w-full overflow-hidden"
                  initial={false}
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                >
                  <GrapesCanvas
                    device={device}
                    document={documentQuery.data}
                    onEditorReady={handleEditorReady}
                  />
                </motion.div>
              </CardContent>
            </Card>
          </main>
        </ResizablePanel>
        <ResizableHandle withHandle className="hidden lg:flex" />
        <ResizablePanel
          defaultSize={22}
          minSize={14}
          maxSize={40}
          className="hidden lg:flex"
        >
          <EditorPanel
            tabs={rightTabs}
            activeTab={activeRightTab}
            onTabChange={setActiveRightTab}
            side="right"
          >
            <div className={cn(activeRightTab !== "content" && "hidden")}>
              <PlaceholderContentPanel
                fields={placeholderSchema.fields}
                onChange={handlePlaceholderChange}
                values={placeholderValues}
              />
            </div>
            <div className={cn(activeRightTab !== "style" && "hidden")} id="gjs-styles" />
            <div className={cn(activeRightTab !== "advanced" && "hidden")}>
              <WidgetConfigPanel
                fields={
                  selectedWidget
                    ? (widgetSchemas[selectedWidget.slug as keyof typeof widgetSchemas]
                        ?.fields ?? [])
                    : []
                }
                onChange={handleWidgetConfigChange}
                props={selectedWidget?.props ?? {}}
                widgetName={selectedWidget?.slug ?? null}
              />
            </div>
            <div className={cn("space-y-3", activeRightTab !== "code" && "hidden")}>
              <LandingCodePanel
                cssError={customCssError}
                customCss={customCss}
                html={codeSnapshot.html}
                onCustomCssChange={handleCustomCssChange}
              />
            </div>
          </EditorPanel>
        </ResizablePanel>
      </ResizablePanelGroup>
      <PublishModal
        isOpen={isPublishModalOpen}
        landingId={landingId}
        onOpenChange={setIsPublishModalOpen}
      />
      <KeyboardShortcutsPanel
        isOpen={showShortcutsPanel}
        onOpenChange={setShowShortcutsPanel}
      />
    </div>
  );
}

function EditorTopBar({
  device,
  isPublishing,
  lastSavedAt,
  onDeviceChange,
  onManualSave,
  onPublish,
  saveStatus,
  title,
  versions
}: {
  device: Device;
  isPublishing: boolean;
  lastSavedAt: Date | null;
  onDeviceChange: (device: Device) => void;
  onManualSave: () => void;
  onPublish: () => void;
  saveStatus: SaveStatus;
  title: string;
  versions: number;
}) {
  return (
    <header className="flex flex-col gap-3 border-b bg-background px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-lg font-semibold text-foreground">{title}</h1>
          <Badge variant="secondary">Editor</Badge>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <SaveStatusBadge status={saveStatus} />
          <span>
            {lastSavedAt
              ? `Last saved ${lastSavedAt.toLocaleTimeString()}`
              : "Autosave every 10 seconds"}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onManualSave}>
          <Save className="h-4 w-4" aria-hidden="true" />
          Save draft
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Versions ({versions})
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem disabled>
              {versions ? `${versions} versions available` : "No versions loaded"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div
          className="flex rounded-md border bg-background p-1"
          aria-label="Device preview"
        >
          {devices.map((item) => {
            const Icon = item.icon;

            return (
              <Button
                key={item.value}
                aria-pressed={device === item.value}
                className={cn("h-8 px-2", device === item.value && "bg-accent")}
                onClick={() => onDeviceChange(item.value)}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">{item.label}</span>
              </Button>
            );
          })}
        </div>
        <Button size="sm" onClick={onPublish} disabled={isPublishing}>
          <Rocket className="h-4 w-4" aria-hidden="true" />
          {isPublishing ? "Publishing" : "Publish"}
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/landings">
            <X className="h-4 w-4" aria-hidden="true" />
            Exit
          </Link>
        </Button>
      </div>
    </header>
  );
}

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  const labels: Record<SaveStatus, string> = {
    dirty: "Unsaved changes",
    error: "Save error",
    idle: "Ready",
    saved: "Draft saved",
    saving: "Saving draft",
    unavailable: "Draft save unavailable"
  };

  return (
    <Badge
      variant={status === "error" || status === "unavailable" ? "outline" : "secondary"}
    >
      {labels[status]}
    </Badge>
  );
}

/** Threshold (px) below which tab labels collapse to icon-only mode. */
const TAB_COLLAPSE_THRESHOLD = 280;

/**
 * Tracks the width of a container element via ResizeObserver.
 * Returns [ref, width] so the caller can attach the ref and read the width.
 */
function useContainerWidth<E extends HTMLElement = HTMLElement>(): [
  React.RefObject<E | null>,
  number
] {
  const ref = React.useRef<E | null>(null);
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const inlineSize =
          entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
        setWidth(inlineSize);
      }
    });

    observer.observe(element, { box: "border-box" });

    return () => {
      observer.disconnect();
    };
  }, []);

  return [ref, width];
}

function EditorPanel<
  T extends readonly {
    icon: React.ComponentType<{ className?: string }>;
    id: string;
    label: string;
  }[]
>({
  activeTab,
  children,
  onTabChange,
  side,
  tabs
}: {
  activeTab: T[number]["id"];
  children: React.ReactNode;
  onTabChange: (tab: T[number]["id"]) => void;
  side: "left" | "right";
  tabs: T;
}) {
  const [asideRef, asideWidth] = useContainerWidth<HTMLElement>();
  const isCollapsed = asideWidth > 0 && asideWidth < TAB_COLLAPSE_THRESHOLD;

  return (
    <aside
      ref={asideRef}
      className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-background"
    >
      <TooltipProvider delayDuration={150}>
        <div
          className="flex shrink-0 items-center gap-1 border-b p-2"
          role="tablist"
          aria-label={`${side} editor panel`}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;

            const button = (
              <Button
                key={tab.id}
                aria-selected={selected}
                aria-label={tab.label}
                className={cn(
                  "h-9 flex-1 min-w-0 px-2 text-xs transition-all duration-200",
                  selected && "bg-accent text-accent-foreground",
                  isCollapsed && "px-1.5"
                )}
                onClick={() => onTabChange(tab.id)}
                role="tab"
                type="button"
                variant="ghost"
              >
                <Icon
                  className={cn(
                    "shrink-0 transition-all duration-200",
                    isCollapsed ? "h-5 w-5" : "h-4 w-4"
                  )}
                  aria-hidden="true"
                />
                {!isCollapsed && <span className="truncate">{tab.label}</span>}
              </Button>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={tab.id}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {tab.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return button;
          })}
        </div>
      </TooltipProvider>
      <ScrollArea className="min-h-0 flex-1 p-3">
        <div className="space-y-3">
          {children}
          <Separator />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            GrapesJS controls are mounted into this panel.
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);

    return () => window.clearTimeout(timeout);
  }, [delay, value]);

  return debouncedValue;
}

function isDevice(value: string | null): value is Device {
  return value === "mobile" || value === "tablet" || value === "desktop";
}

function getStoredDevice(): Device {
  if (typeof window === "undefined") {
    return "desktop";
  }

  const stored = window.localStorage.getItem(deviceStorageKey);

  return isDevice(stored) ? stored : "desktop";
}

function readSelectedWidget(component: GrapesComponent | null) {
  if (!component) {
    return null;
  }

  const attributes = component.getAttributes();
  const slug = attributes["data-widget"];

  if (typeof slug !== "string" || !(slug in widgetSchemas)) {
    return null;
  }

  return {
    component,
    props: parseWidgetProps(
      typeof attributes["data-widget-props"] === "string"
        ? attributes["data-widget-props"]
        : null
    ),
    slug
  };
}

function toGrapesComponent(value: unknown): GrapesComponent | null {
  if (
    typeof value === "object" &&
    value !== null &&
    "addAttributes" in value &&
    "getAttributes" in value &&
    typeof value.addAttributes === "function" &&
    typeof value.getAttributes === "function"
  ) {
    return value as GrapesComponent;
  }

  return null;
}

export { LandingEditorShell };
