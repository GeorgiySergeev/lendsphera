"use client";

import StudioEditor from "@grapesjs/studio-sdk/react";
import {
  accordionComponent,
  canvasEmptyState,
  flexComponent,
  fsLightboxComponent,
  layoutSidebarButtons,
  lightGalleryComponent,
  listPagesComponent,
  rteTinyMce,
  swiperComponent,
  tableComponent
} from "@grapesjs/studio-sdk-plugins";
import "@grapesjs/studio-sdk/style";

import * as React from "react";

import { Button, Skeleton } from "@workspace/ui";

import {
  acquireLandingLock,
  fetchLandingEditorDocument,
  refreshLandingLock,
  releaseLandingLock,
  saveLandingDraftVersion,
  type LandingEditorDocument,
  type LandingEditorDraftPayload
} from "../../lib/api/landings";
import { apiClient } from "../../lib/api/client";
import { toast } from "../../lib/toast";

type LandingStudioShellProps = {
  landingId: string;
};

type StudioTemplate = {
  data: unknown;
  id: string;
  media?: string;
  name: string;
  source?: "local" | "platform";
};

type StudioAsset = {
  id?: string;
  mimeType?: string;
  name?: string;
  size?: number;
  src: string;
  type?: string;
};

const defaultLandingMarkup =
  '<main><section style="max-width:960px;margin:0 auto;padding:80px 24px;text-align:center"><p style="font-size:12px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:#2563eb">Landing Builder</p><h1 style="margin-top:16px;font-size:56px;line-height:1;font-weight:700;color:#020617">Edit your landing page</h1><p style="max-width:640px;margin:24px auto 0;font-size:18px;line-height:1.6;color:#475569">Build landing pages with the Studio editor and save drafts back into the existing landsphera workflow.</p><a href="#" style="display:inline-flex;margin-top:32px;padding:12px 24px;border-radius:9999px;background:#2563eb;color:#fff;text-decoration:none;font-weight:600">Primary action</a></section></main>';

const studioTheme = {
  default: {
    colors: {
      global: {
        background1: "rgba(45, 45, 50, 1)",
        background2: "rgba(35, 35, 40, 1)",
        background3: "rgba(25, 25, 30, 1)",
        backgroundHover: "rgba(55, 55, 60, 1)",
        text: "rgba(220, 220, 230, 1)",
        border: "rgba(70, 70, 80, 1)",
        focus: "rgba(120, 160, 220, 0.8)",
        placeholder: "rgba(140, 140, 150, 1)"
      },
      primary: {
        background1: "rgba(90, 140, 220, 1)",
        background3: "rgba(50, 90, 160, 1)",
        backgroundHover: "rgba(70, 120, 200, 1)",
        text: "rgba(255, 255, 255, 1)"
      },
      component: {
        background1: "rgba(60, 70, 90, 1)",
        background2: "rgba(50, 60, 80, 1)",
        background3: "rgba(40, 50, 70, 1)",
        text: "rgba(220, 220, 230, 1)"
      },
      selector: {
        background1: "rgba(80, 100, 150, 1)",
        background2: "rgba(100, 120, 170, 1)",
        text: "rgba(255, 255, 255, 1)"
      },
      symbol: {
        background1: "rgba(100, 140, 200, 1)",
        background2: "rgba(80, 120, 180, 1)",
        background3: "rgba(60, 100, 160, 1)",
        text: "rgba(255, 255, 255, 1)"
      }
    }
  }
} as const;

const templatesPanelLayout = {
  type: "panelTemplates",
  header: { label: "Choose a template" },
  content: { itemsPerRow: 1 },
  onSelect: async ({
    editor,
    loadTemplate,
    template
  }: {
    editor: any;
    loadTemplate: (template: unknown) => void;
    template: StudioTemplate;
  }) => {
    const resolvedTemplate = await resolveTemplateSelection(template);
    loadTemplate(resolvedTemplate);
    editor.runCommand("studio:layoutRemove", { id: "landing-templates-dialog" });
  }
} as const;

function LandingStudioShell({ landingId }: LandingStudioShellProps) {
  const editorRef = React.useRef<any>(null);
  const lockStatusRef = React.useRef<"acquiring" | "locked" | "lost" | "error" | null>(
    null
  );
  const [isReady, setIsReady] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout | null = null;

    async function acquireLock() {
      try {
        lockStatusRef.current = "acquiring";
        await acquireLandingLock(landingId, 2);
        lockStatusRef.current = "locked";
        toast.success("Editor locked", "You have exclusive edit access");

        heartbeatInterval = setInterval(async () => {
          try {
            await refreshLandingLock(landingId);
          } catch {
            lockStatusRef.current = "lost";
            toast.error("Lock lost", "Another user may have taken control");
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval);
            }
          }
        }, 30000);
      } catch {
        lockStatusRef.current = "error";
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

  React.useEffect(() => {
    const handlePageHide = () => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }

      const project =
        typeof editor.getProjectData === "function" ? editor.getProjectData() : null;
      if (!project) {
        return;
      }

      const payload = toDraftPayload(project, editor);
      void saveLandingDraftVersion(landingId, payload);
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [landingId]);

  const studioOptions = React.useMemo(
    () => ({
      licenseKey: "95ae55b49e634c958af62f116ee5d509c8d14c5e7b5c4b1688b56a0255b512ad",
      theme: "dark",
      customTheme: studioTheme,
      assets: {
        storageType: "self",
        onLoad: async () => loadStudioAssets(),
        onUpload: async () => {
          toast.error(
            "Upload is not configured yet",
            "Use the dashboard media library assets for now."
          );
          return [];
        },
        onDelete: async () => {
          toast.error(
            "Delete is not configured yet",
            "Manage asset deletion from the media library."
          );
        }
      },
      i18n: {
        locales: {
          en: {
            assetManager: {
              emptyTitle: "No media items yet",
              emptyText: "The editor reads the shared dashboard media library."
            },
            templates: {
              notFound: "No templates found in the local or platform library"
            }
          }
        }
      },
      layout: {
        default: {
          type: "row",
          style: { height: "100%" },
          children: [
            {
              type: "sidebarLeft",
              children: {
                type: "tabs",
                value: "blocks",
                tabs: [
                  {
                    id: "blocks",
                    label: "Blocks",
                    children: { type: "panelBlocks", style: { height: "100%" } }
                  },
                  {
                    id: "layers",
                    label: "Layers",
                    children: { type: "panelLayers", style: { height: "100%" } }
                  },
                  {
                    id: "assets",
                    label: "Assets",
                    children: {
                      type: "panelAssets",
                      style: { height: "100%" },
                      header: { label: "Dashboard media" },
                      content: {
                        itemsPerRow: 2,
                        header: { upload: false }
                      }
                    }
                  },
                  {
                    id: "templates",
                    label: "Templates",
                    children: {
                      ...templatesPanelLayout,
                      style: { height: "100%" },
                      header: { label: "Templates" }
                    }
                  }
                ]
              }
            },
            {
              type: "canvasSidebarTop",
              grow: true,
              sidebarTop: {
                leftContainer: {
                  buttons: ({ items }: { items: any[] }) => [
                    ...items,
                    {
                      id: "open-templates-library",
                      label: "Templates",
                      onClick: ({ editor }: { editor: any }) => {
                        editor.runCommand("studio:layoutToggle", {
                          id: "landing-templates-dialog",
                          header: false,
                          placer: {
                            type: "dialog",
                            title: "Choose a template",
                            size: "l"
                          },
                          layout: templatesPanelLayout
                        });
                      }
                    }
                  ]
                }
              }
            },
            {
              type: "sidebarRight",
              children: {
                type: "tabs",
                value: "styles",
                tabs: [
                  {
                    id: "styles",
                    label: "Styles",
                    children: {
                      type: "column",
                      style: { height: "100%" },
                      children: [
                        { type: "panelSelectors", style: { padding: 5 } },
                        { type: "panelStyles" }
                      ]
                    }
                  },
                  {
                    id: "props",
                    label: "Properties",
                    children: {
                      type: "panelProperties",
                      style: { padding: 5, height: "100%" }
                    }
                  },
                  {
                    id: "selection",
                    label: "Selection",
                    children: { type: "panelSelection", style: { height: "100%" } }
                  }
                ]
              }
            }
          ]
        }
      },
      project: {
        type: "web",
        default: {
          pages: [{ name: "Home", component: defaultLandingMarkup }]
        }
      },
      templates: {
        onLoad: async () => loadStudioTemplates()
      },
      storage: {
        type: "self",
        autosaveChanges: 100,
        autosaveIntervalMs: 10000,
        onSave: async ({ project, editor }: { editor: any; project: unknown }) => {
          const payload = toDraftPayload(project, editor);
          await saveLandingDraftVersion(landingId, payload);
        },
        onLoad: async () => {
          try {
            setLoadError(null);
            const doc = await fetchLandingEditorDocument(landingId);
            return {
              project: toStudioProject(doc)
            };
          } catch {
            setLoadError("The Studio editor could not load the landing draft.");
            return {
              project: {
                pages: [{ name: "Home", component: defaultLandingMarkup }]
              }
            };
          }
        }
      },
      plugins: [
        tableComponent.init({}),
        listPagesComponent.init({}),
        accordionComponent.init({}),
        flexComponent.init({}),
        layoutSidebarButtons.init({}),
        fsLightboxComponent.init({}),
        lightGalleryComponent.init({}),
        swiperComponent.init({}),
        rteTinyMce.init({}),
        canvasEmptyState.init({})
      ]
    }),
    [landingId]
  );

  if (loadError && !isReady) {
    return (
      <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center rounded-xl border bg-background p-8 text-center shadow-sm">
        <div className="max-w-md space-y-4">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-2rem)] overflow-hidden rounded-xl border bg-background shadow-sm">
      {!isReady ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/90">
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      ) : null}
      <StudioEditor
        className="h-full w-full"
        options={studioOptions as any}
        onReady={(editor) => {
          editorRef.current = editor;
          setIsReady(true);
        }}
      />
    </div>
  );
}

function toDraftPayload(project: unknown, editor: any): LandingEditorDraftPayload {
  return {
    assets: extractAssets(project),
    components: project,
    css: typeof editor?.getCss === "function" ? editor.getCss() : "",
    customCss: "",
    device: "desktop",
    html:
      typeof editor?.getHtml === "function"
        ? editor.getHtml()
        : extractFirstPageHtml(project),
    layout: {},
    message: "Saved from Studio SDK",
    placeholderValues: {},
    source: "studio-sdk"
  };
}

function toStudioProject(doc: LandingEditorDocument) {
  const maybeProject = doc.components;

  if (isStudioProject(maybeProject)) {
    return maybeProject;
  }

  const component = doc.components ?? doc.html ?? defaultLandingMarkup;
  const styles = [doc.css, doc.customCss].filter(Boolean).join("\n");

  return {
    assets: Array.isArray(doc.assets) ? doc.assets : [],
    pages: [
      {
        name: "Home",
        component,
        styles
      }
    ]
  };
}

function isStudioProject(value: unknown): value is { pages: unknown[] } {
  return Boolean(
    value &&
    typeof value === "object" &&
    Array.isArray((value as { pages?: unknown[] }).pages)
  );
}

function extractAssets(project: unknown) {
  if (project && typeof project === "object" && Array.isArray((project as any).assets)) {
    return (project as any).assets;
  }

  return [];
}

function extractFirstPageHtml(project: unknown) {
  if (!project || typeof project !== "object") {
    return defaultLandingMarkup;
  }

  const firstPage = Array.isArray((project as any).pages)
    ? (project as any).pages[0]
    : null;
  const component = firstPage?.component;

  if (typeof component === "string" && component.trim()) {
    return component;
  }

  return defaultLandingMarkup;
}

export { LandingStudioShell };

async function loadStudioTemplates(): Promise<StudioTemplate[]> {
  const [localResult, platformResult] = await Promise.allSettled([
    apiClient.get("/templates", {
      params: {
        isActive: true,
        isPublic: true,
        limit: 100,
        page: 1
      }
    }),
    fetch("/api/grapes/templates?source=all&type=web", {
      cache: "no-store",
      credentials: "include"
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error("Platform templates request failed");
      }

      return response.json();
    })
  ]);

  const localItems =
    localResult.status === "fulfilled" && Array.isArray(localResult.value.data?.items)
      ? localResult.value.data.items
      : [];
  const platformItems =
    platformResult.status === "fulfilled" && Array.isArray(platformResult.value?.items)
      ? platformResult.value.items
      : [];

  return [
    ...localItems.map((item: any) => ({
      id: item.id,
      name: item.name,
      media: item.thumbnailUrl ?? item.previewUrl ?? undefined,
      source: "local" as const,
      data:
        item.grapesJson && typeof item.grapesJson === "object"
          ? item.grapesJson
          : {
              pages: [
                {
                  name: item.name ?? "Template",
                  component: item.baseHtml || defaultLandingMarkup
                }
              ]
            }
    })),
    ...platformItems.map((item: any) => ({
      id: item.id,
      name: item.name,
      media: item.media ?? undefined,
      source: "platform" as const,
      data: null
    }))
  ];
}

async function loadStudioAssets(): Promise<StudioAsset[]> {
  const response = await apiClient.get("/assets", {
    params: {
      limit: 200,
      page: 1
    }
  });

  const items = Array.isArray(response.data?.items) ? response.data.items : [];

  return items
    .filter((item: any) => typeof item.url === "string" && item.url.length > 0)
    .map((item: any) => ({
      id: item.id,
      src: item.url,
      name: item.originalName,
      mimeType: item.mimeType,
      size: item.size,
      type: mapAssetType(item.type, item.mimeType)
    }));
}

function mapAssetType(type: string | undefined, mimeType: string | undefined) {
  if (type === "VIDEO" || mimeType?.startsWith("video/")) {
    return "video";
  }

  if (type === "DOCUMENT") {
    return "document";
  }

  return "image";
}

async function resolveTemplateSelection(template: StudioTemplate) {
  if (template.source !== "platform") {
    return template;
  }

  const response = await fetch(`/api/grapes/templates/${template.id}`, {
    cache: "no-store",
    credentials: "include"
  });

  if (!response.ok) {
    toast.error(
      "Could not load template",
      "The Studio Platform template is unavailable."
    );
    throw new Error("Platform template load failed");
  }

  const result = await response.json();

  return {
    ...template,
    data: result.projectData
  };
}
