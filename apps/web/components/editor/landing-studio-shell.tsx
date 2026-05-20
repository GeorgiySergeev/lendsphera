"use client";

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
import type { PlaceholderValue } from "@workspace/types";

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui";

import {
  acquireLandingLock,
  createLandingPreviewToken,
  fetchLanding,
  fetchLandingEditorDocument,
  refreshLandingLock,
  releaseLandingLock,
  saveLandingDraftVersion,
  updateLanding,
  type LandingDetail,
  type LandingEditorDocument,
  type LandingEditorDraftPayload,
  type LandingImportedVariable
} from "../../lib/api/landings";
import { apiClient } from "../../lib/api/client";
import { componentsApi } from "../../lib/api/components";
import { fetchMedia, type MediaAsset } from "../../lib/api/media";
import {
  applyImportedVariableDraft,
  deriveImportedVariablesFallback,
  normalizePlaceholderValues,
  resetImportedVariableDraft
} from "../../lib/editor/imported-variables";
import { toast } from "../../lib/toast";
import { useDashboardTopbarStore } from "../../stores/dashboard-topbar-store";
import { LandingImportedVariablesPanel } from "./landing-imported-variables-panel";
import { LandingProjectAssetsDialog } from "./landing-project-assets-dialog";
import { PreviewPane } from "./preview-pane";
import { ExportDialog } from "./export-dialog";

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

type LandingLockStatus = "acquiring" | "locked" | "lost" | "error" | null;

type LandingEditorBootstrapPayload = {
  doc: LandingEditorDocument;
  projectAssetsResponse: {
    items: MediaAsset[];
  };
};

type LandingLockRuntime = {
  acquirePromise: Promise<void> | null;
  heartbeatInterval: ReturnType<typeof setInterval> | null;
  releaseTimeout: ReturnType<typeof setTimeout> | null;
  status: LandingLockStatus;
};

const EDITOR_REQUEST_CACHE_TTL_MS = 30_000;

const landingMetaRequests = new Map<string, Promise<LandingDetail>>();
const landingMetaResults = new Map<string, { expiresAt: number; value: LandingDetail }>();
const landingEditorBootstrapRequests = new Map<
  string,
  Promise<LandingEditorBootstrapPayload>
>();
const landingEditorBootstrapResults = new Map<
  string,
  { expiresAt: number; value: LandingEditorBootstrapPayload }
>();
const landingLockRuntimes = new Map<string, LandingLockRuntime>();

function readCachedResult<T>(
  cache: Map<string, { expiresAt: number; value: T }>,
  key: string
): T | null {
  const cached = cache.get(key);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return cached.value;
}

function writeCachedResult<T>(
  cache: Map<string, { expiresAt: number; value: T }>,
  key: string,
  value: T
) {
  cache.set(key, {
    expiresAt: Date.now() + EDITOR_REQUEST_CACHE_TTL_MS,
    value
  });
}

function reuseInflightRequest<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  factory: () => Promise<T>
): Promise<T> {
  const existing = cache.get(key);
  if (existing) {
    return existing;
  }

  const request = factory().finally(() => {
    cache.delete(key);
  });

  cache.set(key, request);
  return request;
}

function loadLandingMetaCached(landingId: string) {
  const cached = readCachedResult(landingMetaResults, landingId);
  if (cached) {
    return Promise.resolve(cached);
  }

  return reuseInflightRequest(landingMetaRequests, landingId, async () => {
    const value = await fetchLanding(landingId);
    writeCachedResult(landingMetaResults, landingId, value);
    return value;
  });
}

function loadLandingEditorBootstrap(landingId: string) {
  const cached = readCachedResult(landingEditorBootstrapResults, landingId);
  if (cached) {
    return Promise.resolve(cached);
  }

  return reuseInflightRequest(landingEditorBootstrapRequests, landingId, async () => {
    const [doc, projectAssetsResponse] = await Promise.all([
      fetchLandingEditorDocument(landingId),
      fetchMedia({
        landingId,
        limit: 100,
        page: 1,
        sortBy: "createdAt",
        sortOrder: "desc"
      }).catch(() => ({ items: [] as MediaAsset[] }))
    ]);

    const value = { doc, projectAssetsResponse };
    writeCachedResult(landingEditorBootstrapResults, landingId, value);
    return value;
  });
}

function getLandingLockRuntime(landingId: string): LandingLockRuntime {
  const existing = landingLockRuntimes.get(landingId);
  if (existing) {
    return existing;
  }

  const runtime: LandingLockRuntime = {
    acquirePromise: null,
    heartbeatInterval: null,
    releaseTimeout: null,
    status: null
  };

  landingLockRuntimes.set(landingId, runtime);
  return runtime;
}

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
  const importedLandingStylesRef = React.useRef<string | null>(null);
  const projectAssetInventoryRef = React.useRef<StudioAsset[]>([]);
  const studioRootRef = React.useRef<HTMLDivElement | null>(null);
  const studioInitRef = React.useRef(false);
  const lockStatusRef = React.useRef<LandingLockStatus>(null);
  const [isReady, setIsReady] = React.useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [landing, setLanding] = React.useState<LandingDetail | null>(null);
  const [landingVariables, setLandingVariables] = React.useState<
    LandingImportedVariable[]
  >([]);
  const [landingProjectAssets, setLandingProjectAssets] = React.useState<MediaAsset[]>(
    []
  );
  const [placeholderValues, setPlaceholderValues] = React.useState<PlaceholderValue>({});
  const [landingMetaError, setLandingMetaError] = React.useState<string | null>(null);
  const [isNameSaving, setIsNameSaving] = React.useState(false);
  const [isProjectAssetsDialogOpen, setIsProjectAssetsDialogOpen] = React.useState(false);
  const [isExportOpen, setIsExportOpen] = React.useState(false);
  const [isVariablesPanelOpen, setIsVariablesPanelOpen] = React.useState(true);
  const placeholderValuesRef = React.useRef<PlaceholderValue>({});
  const landingVariablesRef = React.useRef<LandingImportedVariable[]>([]);
  const setLandingContext = useDashboardTopbarStore((state) => state.setLandingContext);
  const clearLandingContext = useDashboardTopbarStore(
    (state) => state.clearLandingContext
  );

  React.useEffect(() => {
    placeholderValuesRef.current = placeholderValues;
  }, [placeholderValues]);

  React.useEffect(() => {
    landingVariablesRef.current = landingVariables;
  }, [landingVariables]);

  React.useEffect(() => {
    if (landingVariables.length > 0) {
      setIsVariablesPanelOpen(true);
    }
  }, [landingVariables.length]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadLandingMeta() {
      try {
        setLandingMetaError(null);
        const result = await loadLandingMetaCached(landingId);
        if (cancelled) {
          return;
        }
        setLanding(result);
      } catch {
        if (!cancelled) {
          setLandingMetaError("Landing details unavailable");
        }
      }
    }

    void loadLandingMeta();

    return () => {
      cancelled = true;
    };
  }, [landingId]);

  const renameLanding = React.useCallback(
    async (nextNameValue: string) => {
      const nextName = nextNameValue.trim();
      if (!landing || !nextName || nextName === landing.name) {
        return;
      }

      try {
        setIsNameSaving(true);
        const updated = await updateLanding(landingId, { name: nextName });
        setLanding((current) =>
          current ? { ...current, ...updated, name: updated.name ?? nextName } : updated
        );
        toast.success("Landing renamed", updated.name ?? nextName);
      } catch {
        toast.error("Could not rename landing");
      } finally {
        setIsNameSaving(false);
      }
    },
    [landing, landingId]
  );

  const refreshLandingProjectAssets = React.useCallback(async () => {
    try {
      const response = await fetchMedia({
        landingId,
        limit: 100,
        page: 1,
        sortBy: "createdAt",
        sortOrder: "desc"
      });
      setLandingProjectAssets(response.items);
    } catch {
      setLandingProjectAssets([]);
    }
  }, [landingId]);

  React.useEffect(() => {
    if (!landing) {
      return;
    }

    setLandingContext({
      id: landing.id,
      name: landing.name,
      status: landing.status,
      publicId: landing.publicId,
      slug: landing.slug,
      geoCode: landing.geo?.code,
      geoFlagEmoji: landing.geo?.flagEmoji,
      geoName: landing.geo?.name,
      categoryName: landing.category?.name,
      variantName: landing.variant?.name,
      templateName: landing.template?.name,
      updatedAt: landing.updatedAt,
      metaError: landingMetaError,
      isRenaming: isNameSaving,
      onRename: renameLanding,
      onProjectAssetsOpen: () => setIsProjectAssetsDialogOpen(true),
      projectAssetsCount: landingProjectAssets.filter((asset) => !asset.isMuted).length,
      onVariablesOpenChange: setIsVariablesPanelOpen,
      variablesCount: landingVariables.length,
      variablesDescription: "Legacy PHP and runtime placeholders"
    });

    return () => {
      clearLandingContext(landing.id);
    };
  }, [
    clearLandingContext,
    isNameSaving,
    landing,
    landingProjectAssets,
    landingVariables.length,
    landingMetaError,
    renameLanding,
    setLandingContext
  ]);

  React.useEffect(() => {
    const runtime = getLandingLockRuntime(landingId);
    if (runtime.releaseTimeout) {
      clearTimeout(runtime.releaseTimeout);
      runtime.releaseTimeout = null;
    }

    const syncLockStatus = (status: LandingLockStatus) => {
      runtime.status = status;
      lockStatusRef.current = status;
    };

    async function acquireLock() {
      if (runtime.status === "locked" || runtime.status === "acquiring") {
        lockStatusRef.current = runtime.status;
        return;
      }

      if (runtime.acquirePromise) {
        await runtime.acquirePromise.catch(() => undefined);
        lockStatusRef.current = runtime.status;
        return;
      }

      runtime.acquirePromise = (async () => {
        syncLockStatus("acquiring");

        try {
          await acquireLandingLock(landingId, 2);
          syncLockStatus("locked");
          toast.success("Editor locked", "You have exclusive edit access");

          if (!runtime.heartbeatInterval) {
            runtime.heartbeatInterval = setInterval(async () => {
              try {
                await refreshLandingLock(landingId);
              } catch {
                syncLockStatus("lost");
                toast.error("Lock lost", "Another user may have taken control");
                if (runtime.heartbeatInterval) {
                  clearInterval(runtime.heartbeatInterval);
                  runtime.heartbeatInterval = null;
                }
              }
            }, 30000);
          }
        } catch {
          syncLockStatus("error");
          toast.error("Could not acquire lock", "Another user may be editing");
        } finally {
          runtime.acquirePromise = null;
        }
      })();

      try {
        await runtime.acquirePromise;
      } catch {
        return;
      }
    }

    void acquireLock();

    const handleBeforeUnload = () => {
      if (runtime.status === "locked") {
        void releaseLandingLock(landingId).catch(() => undefined);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      runtime.releaseTimeout = setTimeout(() => {
        if (runtime.heartbeatInterval) {
          clearInterval(runtime.heartbeatInterval);
          runtime.heartbeatInterval = null;
        }

        const shouldRelease = runtime.status === "locked";
        runtime.acquirePromise = null;
        runtime.releaseTimeout = null;
        runtime.status = null;
        landingLockRuntimes.delete(landingId);

        if (shouldRelease) {
          void releaseLandingLock(landingId);
        }
      }, 150);
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

      const payload = toDraftPayload(project, editor, placeholderValuesRef.current);
      void saveLandingDraftVersion(landingId, payload);
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [landingId]);

  React.useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const visibleLandingAssets = normalizeStudioAssets(
      landingProjectAssets.filter((asset) => !asset.isMuted)
    );
    syncProjectAssetsInEditor(editor, visibleLandingAssets);
    projectAssetInventoryRef.current = mergeStudioAssetLists(
      projectAssetInventoryRef.current,
      visibleLandingAssets
    );
  }, [landingProjectAssets]);

  const studioOptions = React.useMemo(
    () => ({
      licenseKey: "95ae55b49e634c958af62f116ee5d509c8d14c5e7b5c4b1688b56a0255b512ad",
      theme: "dark",
      customTheme: studioTheme,
      canvas: {
        scripts: [studioTailwindScriptUrl]
      },
      assets: {
        storageType: "self",
        providerId: "media-library",
        providers: [
          {
            id: "site-media",
            label: "Site media",
            types: "image",
            onLoad: async () => projectAssetInventoryRef.current
          },
          {
            id: "media-library",
            label: "Media library",
            types: "image",
            onLoad: async () => {
              const assets = await loadStudioAssets();
              if (!assets.length) {
                toast.error(
                  "Media library is empty for this session",
                  "No readable image assets were returned."
                );
              }
              return assets;
            }
          }
        ],
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
                    children: {
                      type: "tabs",
                      value: "regular",
                      tabs: [
                        {
                          id: "regular",
                          label: "Regular",
                          children: {
                            type: "panelBlocks",
                            symbols: false,
                            style: { height: "100%" },
                            blocks: ({ blocks }: { blocks: any[] }) =>
                              blocks.filter((block) => !isStudioLibraryBlock(block))
                          }
                        },
                        {
                          id: "components",
                          label: "Components",
                          children: {
                            type: "panelBlocks",
                            symbols: false,
                            style: { height: "100%" },
                            blocks: ({ blocks }: { blocks: any[] }) =>
                              blocks.filter((block) => isStudioLibraryBlock(block))
                          }
                        }
                      ]
                    }
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
                    },
                    {
                      id: "open-runtime-preview",
                      label: "Preview",
                      onClick: () => {
                        void openRuntimePreview();
                      }
                    },
                    {
                      id: "export-zip",
                      label: "Export",
                      onClick: () => {
                        setIsExportOpen(true);
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
        default: ensureStudioProjectShape({
          custom: { id: `landing-${landingId}` },
          pages: [{ name: "Home", component: defaultLandingMarkup }]
        })
      },
      templates: {
        onLoad: async () => loadStudioTemplates()
      },
      storage: {
        type: "self",
        autosaveChanges: 100,
        autosaveIntervalMs: 10000,
        onSave: async ({ project, editor }: { editor: any; project: unknown }) => {
          const payload = toDraftPayload(project, editor, placeholderValuesRef.current);
          await saveLandingDraftVersion(landingId, payload);
        },
        onLoad: async () => {
          try {
            setLoadError(null);
            const { doc, projectAssetsResponse } =
              await loadLandingEditorBootstrap(landingId);
            const project = toStudioProject(doc, landingId);
            const resolvedStyles = resolveImportedLandingStyles(doc, project);
            const visibleProjectAssets = normalizeStudioAssets(
              projectAssetsResponse.items.filter((asset) => !asset.isMuted)
            );
            const projectWithLandingAssets = ensureStylesOnStudioProject(
              mergeProjectAssetsIntoStudioProject(project, visibleProjectAssets),
              resolvedStyles
            );
            importedLandingStylesRef.current = resolveImportedLandingStyles(
              doc,
              projectWithLandingAssets
            );
            projectAssetInventoryRef.current = normalizeStudioAssets(
              extractAssets(projectWithLandingAssets)
            );
            const nextPlaceholderValues = normalizePlaceholderValues(
              doc.placeholderValues
            );
            const nextVariables = doc.importedVariables?.length
              ? doc.importedVariables
              : deriveImportedVariablesFallback(
                  [
                    doc.html,
                    extractFirstPageHtml(projectWithLandingAssets),
                    doc.components
                  ],
                  nextPlaceholderValues
                );
            setLandingProjectAssets(projectAssetsResponse.items);
            setLandingVariables(nextVariables);
            setPlaceholderValues(nextPlaceholderValues);
            const loadedProject = ensureStudioProjectShape(projectWithLandingAssets);
            queueMicrotask(() => {
              const editor = editorRef.current;
              if (editor) {
                applyImportedLandingEditorStyles(
                  editor,
                  importedLandingStylesRef.current
                );
              }
            });
            return {
              project: loadedProject
            };
          } catch {
            setLandingProjectAssets([]);
            setLandingVariables([]);
            setPlaceholderValues({});
            setLoadError("The Studio editor could not load the landing draft.");
            return {
              project: ensureStudioProjectShape({
                pages: [{ name: "Home", component: defaultLandingMarkup }]
              })
            };
          }
        }
      },
      plugins: ({ plugins: sdkPlugins }: { plugins: unknown[] }) => [
        ...sanitizeStudioPlugins(sdkPlugins),
        ...STUDIO_EDITOR_PLUGINS
      ]
    }),
    [landingId]
  );

  const handleVariableChange = React.useCallback(
    (variable: LandingImportedVariable, nextValue: string) => {
      const nextState = applyImportedVariableDraft(
        landingVariablesRef.current,
        placeholderValuesRef.current,
        variable,
        nextValue
      );
      setLandingVariables(nextState.variables);
      setPlaceholderValues(nextState.placeholderValues);
    },
    []
  );

  const handleVariableReset = React.useCallback((variable: LandingImportedVariable) => {
    const nextState = resetImportedVariableDraft(
      landingVariablesRef.current,
      placeholderValuesRef.current,
      variable
    );
    setLandingVariables(nextState.variables);
    setPlaceholderValues(nextState.placeholderValues);
  }, []);

  async function saveCurrentDraft() {
    const editor = editorRef.current;
    if (!editor) {
      throw new Error("Editor is not ready.");
    }
    const project =
      typeof editor.getProjectData === "function" ? editor.getProjectData() : null;
    if (!project) {
      throw new Error("Editor project is unavailable.");
    }
    const payload = toDraftPayload(project, editor, placeholderValuesRef.current);
    await saveLandingDraftVersion(landingId, payload);
  }

  async function openRuntimePreview() {
    try {
      setIsPreviewLoading(true);
      await saveCurrentDraft();
      const preview = await createLandingPreviewToken(landingId);
      const runtimeOrigin =
        process.env.NEXT_PUBLIC_RUNTIME_ORIGIN ?? "http://127.0.0.1:3001";
      const cacheBust = Date.now().toString(36);
      setPreviewUrl(
        `${runtimeOrigin}/${preview.geo}/${preview.slug}?preview=${encodeURIComponent(preview.token)}&v=${cacheBust}`
      );
      setIsPreviewOpen(true);
    } catch {
      toast.error("Preview is unavailable", "Could not prepare preview token.");
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function refreshRuntimePreview() {
    if (!isPreviewOpen) {
      return;
    }
    await openRuntimePreview();
  }

  React.useEffect(() => {
    let disposed = false;

    async function initStudio() {
      if (!studioRootRef.current || studioInitRef.current) {
        return;
      }

      studioInitRef.current = true;
      setIsReady(false);

      await repairStudioIndexedDbPlugins();

      const { createStudioEditor } = await import("@grapesjs/studio-sdk");
      await createStudioEditor({
        ...(studioOptions as any),
        root: studioRootRef.current,
        onEditor: (editor: any) => {
          editorRef.current = editor;
        },
        onReady: (editor: any) => {
          if (disposed) {
            return;
          }
          editorRef.current = editor;
          registerImportedLandingEditorStyleSync(
            editor,
            () => importedLandingStylesRef.current
          );
          syncProjectAssetsInEditor(
            editor,
            normalizeStudioAssets(landingProjectAssets.filter((asset) => !asset.isMuted))
          );
          ensureStudioTailwindCanvas(editor);
          setIsReady(true);
        },
        onDestroy: () => {
          editorRef.current = null;
          if (!disposed) {
            setIsReady(false);
          }
        }
      });
    }

    void initStudio();

    return () => {
      disposed = true;
      studioInitRef.current = false;
      const editor = editorRef.current;
      if (editor && typeof editor.destroy === "function") {
        editor.destroy();
      }
      editorRef.current = null;
      setLandingVariables([]);
      setPlaceholderValues({});
    };
  }, [studioOptions]);

  if (loadError && !isReady) {
    return (
      <div className="flex min-h-[calc(100dvh-5rem)] items-center justify-center rounded-xl border bg-background p-8 text-center shadow-sm">
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
    <div className="relative h-[calc(100dvh)]">
      <div className="h-full overflow-hidden  border bg-background shadow-sm">
        <div ref={studioRootRef} className="h-full w-full" data-studio-root="true" />
      </div>
      {isVariablesPanelOpen ? (
        <div
          className="pointer-events-none fixed right-6 top-24 z-[2147483647] hidden xl:block"
          data-variables-overlay="true"
        >
          <div className="pointer-events-auto flex h-[calc(100vh-8rem)] w-[380px] max-w-[calc(100vw-10rem)] flex-col overflow-hidden rounded-2xl border bg-background/98 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Variables</p>
                <p className="text-xs text-muted-foreground">
                  Legacy PHP and runtime placeholders
                </p>
              </div>
              <Button
                className="h-8 px-3 text-xs"
                onClick={() => setIsVariablesPanelOpen(false)}
                type="button"
                variant="ghost"
              >
                Hide
              </Button>
            </div>
            <div className="min-h-0 flex-1 p-3">
              <LandingImportedVariablesPanel
                onChange={handleVariableChange}
                onReset={handleVariableReset}
                variables={landingVariables}
              />
            </div>
          </div>
        </div>
      ) : null}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="h-[90vh] max-w-[95vw] p-0">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle>Runtime Preview</DialogTitle>
          </DialogHeader>
          {previewUrl ? (
            <PreviewPane
              iframeUrl={previewUrl}
              isLoading={isPreviewLoading}
              onRefresh={() => void refreshRuntimePreview()}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <LandingProjectAssetsDialog
        landingId={landingId}
        open={isProjectAssetsDialogOpen}
        onAssetsChanged={refreshLandingProjectAssets}
        onOpenChange={setIsProjectAssetsDialogOpen}
      />

      <ExportDialog
        getHtml={React.useCallback(() => {
          const editor = editorRef.current;
          if (typeof editor?.getHtml === "function") {
            const html = editor.getHtml();
            return typeof html === "string" ? html : "";
          }
          return "";
        }, [])}
        getCss={React.useCallback(() => {
          const editor = editorRef.current;
          if (typeof editor?.getCss === "function") {
            const css = editor.getCss();
            return typeof css === "string" ? css : "";
          }
          return "";
        }, [])}
        name={landing?.name}
        isOpen={isExportOpen}
        onOpenChange={setIsExportOpen}
      />
    </div>
  );
}

function toDraftPayload(
  project: unknown,
  editor: any,
  placeholderValues: PlaceholderValue
): LandingEditorDraftPayload {
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
    placeholderValues,
    source: "studio-sdk"
  };
}

function extractFirstPageStyles(project: unknown): string {
  if (!project || typeof project !== "object") {
    return "";
  }

  const styles = (project as { pages?: Array<{ styles?: unknown }> }).pages?.[0]?.styles;
  return typeof styles === "string" ? styles : "";
}

function resolveImportedLandingStyles(
  doc: LandingEditorDocument,
  project: unknown
): string | null {
  const fromDoc =
    typeof doc.styles === "string" && doc.styles.trim()
      ? doc.styles.trim()
      : [doc.css, doc.customCss].filter(Boolean).join("\n").trim();
  const fromProject = extractFirstPageStyles(project).trim();
  const resolved = fromDoc || fromProject;

  return resolved || null;
}

function extractStylesheetUrlsFromCss(css: string): string[] {
  const urls = new Set<string>();

  for (const match of css.matchAll(/@import\s+url\(["']?([^"')]+)["']?\)/gi)) {
    const href = match[1]?.trim();
    if (href) {
      urls.add(href);
    }
  }

  return [...urls];
}

function injectImportedLandingStylesIntoCanvas(editor: any, styles: string) {
  const stylesheetUrls = extractStylesheetUrlsFromCss(styles);
  const inlineStyles = styles.replace(/@import\s+url\([^)]+\)\s*;?/gi, "").trim();

  getStudioCanvasDocuments(editor).forEach((iframeDoc) => {
    if (!iframeDoc.head) {
      return;
    }

    if (inlineStyles) {
      let styleEl = iframeDoc.querySelector<HTMLStyleElement>(
        'style[data-landsphera-imported="true"]'
      );
      if (!styleEl) {
        styleEl = iframeDoc.createElement("style");
        styleEl.dataset.landspheraImported = "true";
        iframeDoc.head.appendChild(styleEl);
      }

      styleEl.textContent = inlineStyles;
    }

    stylesheetUrls.forEach((href) => {
      const alreadyLinked = Array.from(
        iframeDoc.querySelectorAll<HTMLLinkElement>(
          "link[data-landsphera-imported-stylesheet]"
        )
      ).some((link) => link.getAttribute("href") === href);
      if (alreadyLinked) {
        return;
      }

      const linkEl = iframeDoc.createElement("link");
      linkEl.rel = "stylesheet";
      linkEl.href = href;
      linkEl.dataset.landspheraImportedStylesheet = href;
      iframeDoc.head.appendChild(linkEl);
    });
  });
}

function ensureStylesOnStudioProject(project: unknown, styles: string | null): unknown {
  if (!styles?.trim() || !isStudioProject(project)) {
    return project;
  }

  const studioProject = project as { pages?: Array<Record<string, unknown>> };
  const firstPage = studioProject.pages?.[0];
  if (!firstPage) {
    return project;
  }

  return {
    ...studioProject,
    pages: [{ ...firstPage, styles }, ...(studioProject.pages?.slice(1) ?? [])]
  };
}

function applyImportedLandingEditorStyles(editor: any, fallbackStyles?: string | null) {
  const project =
    typeof editor?.getProjectData === "function" ? editor.getProjectData() : null;
  const styles = (extractFirstPageStyles(project) || fallbackStyles || "").trim();

  if (!styles) {
    return;
  }

  if (editor.__landspheraImportedStylesFingerprint === styles) {
    injectImportedLandingStylesIntoCanvas(editor, styles);
    return;
  }

  editor.__landspheraImportedStylesFingerprint = styles;

  if (typeof editor?.setStyle === "function") {
    editor.setStyle(styles);
  } else if (typeof editor?.Css?.addRules === "function") {
    editor.Css.addRules(styles);
  }

  injectImportedLandingStylesIntoCanvas(editor, styles);
}

function registerImportedLandingEditorStyleSync(
  editor: any,
  readFallbackStyles: () => string | null
) {
  const apply = () => {
    applyImportedLandingEditorStyles(editor, readFallbackStyles());
    syncImportedStylesheetsFromComponentMarkup(editor);
  };

  apply();

  const events = ["load", "project:load", "storage:load", "storage:end:load"];
  events.forEach((eventName) => {
    if (typeof editor?.on === "function") {
      editor.on(eventName, apply);
    }
  });

  if (typeof editor?.on === "function") {
    editor.on("canvas:frame:load", () => {
      apply();
      ensureStudioTailwindCanvas(editor);
    });
  }

  for (const delayMs of [0, 100, 400, 1200, 2500]) {
    window.setTimeout(apply, delayMs);
  }
}

function syncImportedStylesheetsFromComponentMarkup(editor: any) {
  const project =
    typeof editor?.getProjectData === "function" ? editor.getProjectData() : null;
  const markup = extractFirstPageHtml(project);
  if (!markup.trim()) {
    return;
  }

  const hrefs = new Set<string>();
  const linkPattern = /<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi;
  for (const tag of markup.match(linkPattern) ?? []) {
    const hrefMatch = tag.match(/\bhref=["']([^"']+)["']/i);
    const href = hrefMatch?.[1]?.trim();
    if (href) {
      hrefs.add(href);
    }
  }

  if (!hrefs.size) {
    return;
  }

  getStudioCanvasDocuments(editor).forEach((iframeDoc) => {
    if (!iframeDoc.head) {
      return;
    }

    hrefs.forEach((href) => {
      const alreadyLinked = Array.from(
        iframeDoc.querySelectorAll<HTMLLinkElement>(
          "link[data-landsphera-imported-stylesheet]"
        )
      ).some((link) => link.getAttribute("href") === href);
      if (alreadyLinked) {
        return;
      }

      const linkEl = iframeDoc.createElement("link");
      linkEl.rel = "stylesheet";
      linkEl.href = href;
      linkEl.dataset.landspheraImportedStylesheet = href;
      iframeDoc.head.appendChild(linkEl);
    });
  });
}

function toStudioProject(doc: LandingEditorDocument, landingId: string) {
  const editorAssetToken = (doc as LandingEditorDocument & { editorAssetToken?: string })
    .editorAssetToken;
  const maybeProject = doc.components;

  let project: unknown;

  if (isStudioProject(maybeProject)) {
    const studioProject = maybeProject as { pages?: Array<Record<string, unknown>> };
    const firstPage = studioProject.pages?.[0];
    const resolvedStyles = resolveImportedLandingStyles(doc, maybeProject);

    if (firstPage && resolvedStyles) {
      project = {
        ...studioProject,
        pages: [
          { ...firstPage, styles: resolvedStyles },
          ...(studioProject.pages?.slice(1) ?? [])
        ]
      };
    } else {
      project = maybeProject;
    }
  } else {
    const component = doc.components ?? doc.html ?? defaultLandingMarkup;
    const styles = [doc.css, doc.customCss].filter(Boolean).join("\n");

    project = {
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

  if (editorAssetToken) {
    return ensureStudioProjectShape(
      refreshEditorAssetUrlsInValue(landingId, project, editorAssetToken)
    );
  }

  return ensureStudioProjectShape(project);
}

function refreshEditorAssetUrlsInValue(
  landingId: string,
  input: unknown,
  token: string
): unknown {
  if (typeof input === "string") {
    return refreshEditorAssetUrlsInText(landingId, input, token);
  }

  if (Array.isArray(input)) {
    return input.map((item) => refreshEditorAssetUrlsInValue(landingId, item, token));
  }

  if (input && typeof input === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      result[key] = refreshEditorAssetUrlsInValue(landingId, value, token);
    }
    return result;
  }

  return input;
}

function isInvalidAssetUrl(value: string) {
  const trimmed = value.trim();
  return !trimmed || trimmed === "undefined" || trimmed === "null";
}

function isRewritableRelativeAssetPath(value: string) {
  if (isInvalidAssetUrl(value)) {
    return false;
  }

  return !/^(?:https?:|\/|data:|#|javascript:|mailto:|tel:)/i.test(value.trim());
}

function isStudioPluginObject(plugin: unknown): plugin is Record<string, unknown> {
  return Boolean(plugin && typeof plugin === "object" && !Array.isArray(plugin));
}

function resolvePluginId(plugin: { id?: unknown }) {
  if (typeof plugin.id === "string") {
    return plugin.id.trim();
  }

  if (plugin.id != null && typeof plugin.id !== "object") {
    return String(plugin.id).trim();
  }

  return "";
}

function isValidPluginName(value: string) {
  return value.length > 0 && !isInvalidAssetUrl(value);
}

async function repairStudioIndexedDbPlugins() {
  if (typeof indexedDB === "undefined") {
    return;
  }

  await new Promise<void>((resolve) => {
    const request = indexedDB.open("gjs-studio", 1);

    request.onerror = () => resolve();
    request.onsuccess = () => {
      const db = request.result;

      try {
        const transaction = db.transaction("settings", "readwrite");
        const store = transaction.objectStore("settings");
        const getRequest = store.get("plugins");

        getRequest.onerror = () => resolve();
        getRequest.onsuccess = () => {
          const storedPlugins = getRequest.result;

          if (!Array.isArray(storedPlugins)) {
            resolve();
            return;
          }

          const sanitizedPlugins = sanitizeStudioPlugins(storedPlugins);

          if (sanitizedPlugins.length !== storedPlugins.length) {
            store.put(sanitizedPlugins, "plugins");
          }

          resolve();
        };
      } catch {
        resolve();
      }
    };
  });
}

function sanitizeStudioPlugins(plugins: unknown[]) {
  return plugins.filter((plugin) => {
    if (plugin === false || plugin == null) {
      return false;
    }

    if (typeof plugin === "function") {
      return true;
    }

    if (typeof plugin === "string") {
      return isValidPluginName(plugin);
    }

    if (!isStudioPluginObject(plugin)) {
      return false;
    }

    const pluginObj = plugin as Record<string, unknown>;
    const id = resolvePluginId(pluginObj);
    const hasSrc = "src" in pluginObj;
    const src = typeof pluginObj.src === "string" ? pluginObj.src.trim() : "";
    const hasInit = typeof pluginObj.init === "function";

    if (hasInit) {
      return true;
    }

    if (hasSrc) {
      if (!isValidPluginName(id)) {
        return false;
      }
      return src.length > 0 && !isInvalidAssetUrl(src);
    }

    return false;
  });
}

function sanitizeBrokenAssetReferencesInText(text: string) {
  return text.replace(/\b(src|href|poster)=["'](?:undefined|null)["']/gi, '$1=""');
}

function sanitizeBrokenAssetReferences(input: unknown): unknown {
  if (typeof input === "string") {
    return sanitizeBrokenAssetReferencesInText(input);
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeBrokenAssetReferences(item));
  }

  if (input && typeof input === "object") {
    const record = input as Record<string, unknown>;

    if (typeof record.src === "string" && isInvalidAssetUrl(record.src)) {
      const rest = { ...record };
      delete rest.src;
      return sanitizeBrokenAssetReferences(rest);
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      if (key === "plugins" && Array.isArray(value)) {
        result[key] = sanitizeStudioPlugins(value);
        continue;
      }

      result[key] = sanitizeBrokenAssetReferences(value);
    }
    return result;
  }

  return input;
}

function buildEditorAssetProxyPath(landingId: string, assetPath: string, token: string) {
  const normalizedPath = assetPath
    .split(/[?#]/)[0]!
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `/api/landings/${encodeURIComponent(landingId)}/assets/${normalizedPath}?token=${encodeURIComponent(token)}`;
}

function refreshEditorAssetUrlsInText(landingId: string, text: string, token: string) {
  const tokenParam = `token=${encodeURIComponent(token)}`;
  const withRelativeProxyUrls = text.replace(
    /https?:\/\/[^"'()\s]+\/api\/landings\/[^"'()\s]+/gi,
    (match) => {
      try {
        const url = new URL(match);
        return `${url.pathname}${url.search}`;
      } catch {
        return match;
      }
    }
  );
  const encodedLandingId = encodeURIComponent(landingId);
  const proxyPattern = new RegExp(
    `(/api/landings/${encodedLandingId}/assets/[^"'\\s?)]+)(?:\\?token=[^"'\\s)?]+)?`,
    "g"
  );

  let result = withRelativeProxyUrls.replace(proxyPattern, `$1?${tokenParam}`);

  const attrPattern = /\b(src|href|poster)=["']([^"']+)["']/gi;
  result = result.replace(attrPattern, (full, attrName: string, rawValue: string) => {
    if (!isRewritableRelativeAssetPath(rawValue)) {
      if (isInvalidAssetUrl(rawValue)) {
        return `${attrName}=""`;
      }
      return full;
    }

    const resolved = buildEditorAssetProxyPath(landingId, rawValue, token);
    return `${attrName}="${resolved}"`;
  });

  result = result.replace(
    /url\((["']?)([^"')]+)\1\)/gi,
    (full, _quote, rawValue: string) => {
      if (!isRewritableRelativeAssetPath(rawValue)) {
        return full;
      }

      const resolved = buildEditorAssetProxyPath(landingId, rawValue, token);
      return `url("${resolved}")`;
    }
  );

  return result;
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
  const frameContent = firstPage?.frames?.[0]?.component?.content;

  if (typeof component === "string" && component.trim()) {
    return component;
  }

  if (typeof frameContent === "string" && frameContent.trim()) {
    return frameContent;
  }

  return defaultLandingMarkup;
}

function mergeProjectAssetsIntoStudioProject(project: unknown, assets: StudioAsset[]) {
  if (!project || typeof project !== "object") {
    return project;
  }

  const existingAssets = normalizeStudioAssets(extractAssets(project));
  const mergedAssets = [...existingAssets];
  const seenKeys = new Set(
    existingAssets.map((asset) => asset.id ?? asset.src).filter(Boolean)
  );

  for (const asset of assets) {
    const key = asset.id ?? asset.src;
    if (!key || seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    mergedAssets.push(asset);
  }

  return {
    ...(project as Record<string, unknown>),
    assets: mergedAssets
  };
}

function ensureStudioProjectShape(project: unknown) {
  const source =
    project && typeof project === "object" ? (project as Record<string, unknown>) : {};
  const pagesInput = Array.isArray(source.pages) ? source.pages : [];
  const pages = (
    pagesInput.length ? pagesInput : [{ name: "Home", component: defaultLandingMarkup }]
  ).map((page, index) => {
    const pageRecord =
      page && typeof page === "object" ? (page as Record<string, unknown>) : {};
    const hasLegacyComponent =
      typeof pageRecord.component === "string" && pageRecord.component.trim().length > 0;
    const framesInput = Array.isArray(pageRecord.frames) ? pageRecord.frames : [];
    const frames = framesInput.length
      ? framesInput.map((frame) => {
          const frameRecord =
            frame && typeof frame === "object" ? (frame as Record<string, unknown>) : {};
          const existingFrameComponent = frameRecord.component;
          const fallbackComponent = hasLegacyComponent
            ? pageRecord.component
            : defaultLandingMarkup;

          return {
            ...frameRecord,
            component:
              existingFrameComponent !== undefined
                ? existingFrameComponent
                : fallbackComponent
          };
        })
      : [
          {
            component: hasLegacyComponent ? pageRecord.component : defaultLandingMarkup
          }
        ];

    const pageName =
      typeof pageRecord.name === "string" && pageRecord.name.trim()
        ? pageRecord.name.trim()
        : `Page ${index + 1}`;
    const pageId =
      typeof pageRecord.id === "string" &&
      pageRecord.id.trim() &&
      pageRecord.id.trim() !== "undefined"
        ? pageRecord.id.trim()
        : pageName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || `page-${index + 1}`;

    return {
      ...pageRecord,
      id: pageId,
      name: pageName,
      ...(hasLegacyComponent ? { component: pageRecord.component } : {}),
      frames
    };
  });

  return sanitizeBrokenAssetReferences({
    ...source,
    assets: Array.isArray(source.assets) ? source.assets : [],
    pages
  });
}

export { LandingStudioShell };

type StudioComponentBlockItem = {
  categoryLabel: string;
  html: string;
  id: string;
  name: string;
};

const studioLibraryBlockPrefix = "library-component:";
const studioTailwindScriptUrl = "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4";
const studioComponentCssCache = new Map<string, string>();
const studioComponentDetailRequests = new Map<string, Promise<string>>();
function createStudioComponentsBlocksPlugin() {
  return (editor: any) => {
    void registerStudioComponentBlocks(editor);

    editor.on("canvas:frame:load", () => ensureStudioTailwindCanvas(editor));
    editor.on("canvas:load", () => ensureStudioTailwindCanvas(editor));
    editor.on("component:add", () => {
      window.setTimeout(() => ensureStudioTailwindCanvas(editor), 50);
    });

    editor.on("block:drag:stop", (_component: unknown, block: any) => {
      const blockId = getStudioBlockId(block);

      if (!blockId.startsWith(studioLibraryBlockPrefix)) {
        return;
      }

      const componentId = blockId.replace(studioLibraryBlockPrefix, "");
      void componentsApi.trackUsage(componentId).catch(() => {});
      void applyStudioComponentCss(editor, componentId);
      ensureStudioTailwindCanvas(editor);
    });
  };
}

function buildStudioPlugin(
  plugin: any,
  pluginName: string,
  options: Record<string, unknown>
) {
  if (!plugin || typeof plugin.init !== "function") {
    console.warn(`Studio plugin "${pluginName}" is unavailable; skipping.`);
    return null;
  }

  return plugin.init(options);
}

const STUDIO_EDITOR_PLUGINS = [
  buildStudioPlugin(tableComponent, "tableComponent", {}),
  buildStudioPlugin(listPagesComponent, "listPagesComponent", {}),
  buildStudioPlugin(accordionComponent, "accordionComponent", {}),
  buildStudioPlugin(flexComponent, "flexComponent", {}),
  buildStudioPlugin(layoutSidebarButtons, "layoutSidebarButtons", {}),
  buildStudioPlugin(fsLightboxComponent, "fsLightboxComponent", {}),
  buildStudioPlugin(lightGalleryComponent, "lightGalleryComponent", {}),
  buildStudioPlugin(swiperComponent, "swiperComponent", {}),
  buildStudioPlugin(rteTinyMce, "rteTinyMce", {}),
  buildStudioPlugin(canvasEmptyState, "canvasEmptyState", {}),
  createStudioComponentsBlocksPlugin()
].filter(Boolean);

async function registerStudioComponentBlocks(editor: any) {
  try {
    const items = await loadStudioComponentBlocks();
    const blockManager =
      editor?.Blocks ??
      editor?.BlockManager ??
      (typeof editor?.getModel === "function"
        ? (editor.getModel()?.Blocks ?? editor.getModel()?.BlockManager)
        : null);

    if (
      !blockManager ||
      typeof blockManager.add !== "function" ||
      typeof blockManager.get !== "function"
    ) {
      console.warn("Studio block manager is unavailable; skipping component blocks.");
      return;
    }

    items.forEach((item, index) => {
      if (blockManager.get(item.id)) {
        return;
      }

      blockManager.add(
        item.id,
        {
          label: formatStudioComponentBlockLabel(item.name),
          category: {
            id: `components-library:${toStudioCategoryId(item.categoryLabel)}`,
            label: item.categoryLabel || "Components"
          },
          media: buildStudioComponentBlockMedia(item),
          content: item.html,
          select: true
        },
        { at: index }
      );
    });
  } catch (error) {
    console.error("Failed to register Studio component blocks", error);
  }
}

async function loadStudioComponentBlocks(): Promise<StudioComponentBlockItem[]> {
  const response = await componentsApi.list({
    isPublic: true,
    limit: 100,
    page: 1,
    sortBy: "usageCount",
    sortDir: "desc"
  });

  return response.data.map((item) => ({
    id: `${studioLibraryBlockPrefix}${item.id}`,
    name: item.name,
    html: item.html,
    categoryLabel: item.category.name
  }));
}

function isStudioLibraryBlock(block: any) {
  return getStudioBlockId(block).startsWith(studioLibraryBlockPrefix);
}

function getStudioBlockId(block: any) {
  const blockId =
    typeof block?.getId === "function"
      ? block.getId()
      : (block?.id ?? block?.attributes?.id);

  return typeof blockId === "string" ? blockId : "";
}

function ensureStudioTailwindCanvas(editor: any) {
  const iframeDocs = getStudioCanvasDocuments(editor);

  if (!iframeDocs.length) {
    window.setTimeout(() => ensureStudioTailwindCanvas(editor), 200);
    return;
  }

  iframeDocs.forEach((iframeDoc) => {
    if (!iframeDoc.head) {
      return;
    }

    if (!iframeDoc.querySelector('script[data-landsphera-tailwind="true"]')) {
      const script = iframeDoc.createElement("script");
      script.dataset.landspheraTailwind = "true";
      script.src = studioTailwindScriptUrl;
      iframeDoc.head.appendChild(script);
    }

    if (!iframeDoc.querySelector('style[data-landsphera-tailwind-theme="true"]')) {
      const themeStyle = iframeDoc.createElement("style");
      themeStyle.dataset.landspheraTailwindTheme = "true";
      themeStyle.type = "text/tailwindcss";
      themeStyle.textContent = `
        @theme {
          --font-sans: ui-sans-serif, system-ui, sans-serif;
        }
      `;
      iframeDoc.head.appendChild(themeStyle);
    }
  });
}

function getStudioCanvasDocuments(editor: any) {
  const docs = new Set<Document>();
  const canvasDoc = editor?.Canvas?.getDocument?.();

  if (canvasDoc) {
    docs.add(canvasDoc);
  }

  const root = document.querySelector<HTMLDivElement>('[data-studio-root="true"]');
  if (root) {
    root.querySelectorAll<HTMLIFrameElement>("iframe").forEach((iframe) => {
      try {
        const iframeDoc = iframe.contentDocument;
        if (iframeDoc && iframeDoc !== canvasDoc) {
          docs.add(iframeDoc);
        }
      } catch {
        // Cross-origin iframes are ignored; Studio canvas iframes are same-origin.
      }
    });
  }

  return Array.from(docs);
}

function buildStudioComponentBlockMedia(item: StudioComponentBlockItem) {
  const accent = getStudioComponentAccent(item.categoryLabel);

  return `<svg viewBox="0 0 24 24" role="img" aria-hidden="true" style="display:block;height:38px;width:38px;margin:auto;color:${accent};fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;">
    <rect x="4" y="4" width="7" height="7" rx="1.8" opacity=".85"></rect>
    <rect x="13" y="4" width="7" height="7" rx="1.8" opacity=".45"></rect>
    <rect x="4" y="13" width="7" height="7" rx="1.8" opacity=".45"></rect>
    <path d="M14 15.5h5"></path>
    <path d="M14 18.5h3"></path>
  </svg>`;
}

async function applyStudioComponentCss(editor: any, componentId: string) {
  const cachedCss = studioComponentCssCache.get(componentId);
  if (cachedCss) {
    editor.Css.addRules(cachedCss);
    return;
  }

  const pendingRequest = studioComponentDetailRequests.get(componentId);
  if (pendingRequest) {
    const css = await pendingRequest;
    if (css) {
      editor.Css.addRules(css);
    }
    return;
  }

  const request = componentsApi
    .get(componentId)
    .then((detail) => detail.css?.trim() ?? "")
    .finally(() => {
      studioComponentDetailRequests.delete(componentId);
    });

  studioComponentDetailRequests.set(componentId, request);

  const css = await request;
  if (!css) {
    return;
  }

  studioComponentCssCache.set(componentId, css);
  editor.Css.addRules(css);
}

function formatStudioComponentBlockLabel(value: string) {
  const normalized = value.split(/\s+/).filter(Boolean).join(" ");

  return normalized.length > 20 ? `${normalized.slice(0, 17).trimEnd()}...` : normalized;
}

function getStudioComponentAccent(categoryLabel: string) {
  const palette = ["#8ab4f8", "#a7f3d0", "#fda4af", "#fde68a", "#c4b5fd"];
  const hash = Array.from(categoryLabel || "Components").reduce(
    (total, char) => total + char.charCodeAt(0),
    0
  );

  return palette[hash % palette.length];
}

function toStudioCategoryId(value: string) {
  return (value || "components")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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
    ...localItems.map((item: any, index: number) => {
      const media = resolveTemplatePreviewUrl(item.thumbnailUrl ?? item.previewUrl);

      return {
        id: resolveStudioTemplateId(item, index),
        name: item.name ?? `Template ${index + 1}`,
        ...(media ? { media } : {}),
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
      };
    }),
    ...platformItems.map((item: any, index: number) => {
      const media = resolveTemplatePreviewUrl(item.media);

      return {
        id: resolveStudioTemplateId(item, index),
        name: item.name ?? `Template ${index + 1}`,
        ...(media ? { media } : {}),
        source: "platform" as const,
        data: null
      };
    })
  ];
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

function normalizeStudioAssets(items: any[]): StudioAsset[] {
  return items
    .map((item): StudioAsset | null => {
      const src = resolveAssetSrc(item);
      if (!src) {
        return null;
      }

      return {
        id: item.id,
        src,
        name: item.originalName,
        mimeType: item.mimeType,
        size: item.size,
        type: mapAssetType(item.type, item.mimeType)
      };
    })
    .filter((item): item is StudioAsset => item !== null);
}

let studioSharedAssetsPromise: Promise<StudioAsset[]> | null = null;
let studioSharedAssetsCache: StudioAsset[] | null = null;

async function loadStudioAssets(): Promise<StudioAsset[]> {
  if (studioSharedAssetsCache) {
    return studioSharedAssetsCache;
  }

  if (studioSharedAssetsPromise) {
    return studioSharedAssetsPromise;
  }

  const mediaParams = {
    limit: 100,
    page: 1,
    sortBy: "createdAt",
    sortOrder: "desc"
  } as const;
  const assetsParams = { limit: 100, page: 1 };

  studioSharedAssetsPromise = (async () => {
    try {
      const response = await apiClient.get("/media", { params: mediaParams });
      const items = Array.isArray(response.data?.items) ? response.data.items : [];
      const normalized = normalizeStudioAssets(items);
      if (normalized.length > 0) {
        studioSharedAssetsCache = normalized;
        return normalized;
      }

      const fallbackResponse = await apiClient.get("/assets", { params: assetsParams });
      const fallbackItems = Array.isArray(fallbackResponse.data?.items)
        ? fallbackResponse.data.items
        : [];
      const fallbackNormalized = normalizeStudioAssets(fallbackItems);
      studioSharedAssetsCache = fallbackNormalized;
      return fallbackNormalized;
    } catch (error) {
      try {
        const response = await apiClient.get("/assets", { params: assetsParams });
        const items = Array.isArray(response.data?.items) ? response.data.items : [];
        const fallbackNormalized = normalizeStudioAssets(items);
        studioSharedAssetsCache = fallbackNormalized;
        return fallbackNormalized;
      } catch {
        console.error("Failed to load Studio assets from /media and /assets", error);
        studioSharedAssetsCache = [];
        return [];
      }
    } finally {
      studioSharedAssetsPromise = null;
    }
  })();

  return studioSharedAssetsPromise;
}

function syncProjectAssetsInEditor(editor: any, assets: StudioAsset[]) {
  const existingProjectAssets = normalizeStudioAssets(
    typeof editor?.getProjectData === "function"
      ? extractAssets(editor.getProjectData())
      : []
  );
  const mergedAssets = mergeStudioAssetLists(existingProjectAssets, assets);
  const collection = editor?.AssetManager?.getAll?.();
  if (collection && typeof collection.reset === "function") {
    collection.reset(mergedAssets);
  } else if (editor?.AssetManager && typeof editor.AssetManager.add === "function") {
    editor.AssetManager.add(mergedAssets);
  }

  const project =
    typeof editor?.getProjectData === "function" ? editor.getProjectData() : null;
  if (project && typeof project === "object") {
    (project as { assets?: StudioAsset[] }).assets = mergedAssets;
  }
}

function mergeStudioAssetLists(
  primaryAssets: StudioAsset[],
  secondaryAssets: StudioAsset[]
) {
  const mergedAssets = [...primaryAssets];
  const seenKeys = new Set(
    primaryAssets.map((asset) => asset.id ?? asset.src).filter(Boolean)
  );

  for (const asset of secondaryAssets) {
    const key = asset.id ?? asset.src;
    if (!key || seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    mergedAssets.push(asset);
  }

  return mergedAssets;
}

function resolveTemplatePreviewUrl(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (isInvalidAssetUrl(trimmed)) {
    return "";
  }

  return trimmed;
}

function resolveStudioTemplateId(item: { id?: unknown; name?: unknown }, index: number) {
  if (typeof item.id === "string") {
    const trimmed = item.id.trim();
    if (trimmed && !isInvalidAssetUrl(trimmed)) {
      return trimmed;
    }
  }

  const name = typeof item.name === "string" ? item.name.trim() : "";
  if (name) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (slug) {
      return slug;
    }
  }

  return `template-${index + 1}`;
}

function resolveAssetSrc(item: any) {
  if (typeof item?.url === "string") {
    const url = item.url.trim();
    if (!isInvalidAssetUrl(url)) {
      return url;
    }
  }

  if (typeof item?.src === "string") {
    const src = item.src.trim();
    if (!isInvalidAssetUrl(src)) {
      return src;
    }
  }

  if (typeof item?.id === "string" && item.id) {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
    return `${base}/media/${item.id}/content`;
  }

  return "";
}

async function resolveTemplateSelection(template: StudioTemplate) {
  if (template.source !== "platform") {
    return template;
  }

  if (!template.id || isInvalidAssetUrl(template.id)) {
    throw new Error("Platform template id is missing");
  }

  const response = await fetch(
    `/api/grapes/templates/${encodeURIComponent(template.id)}`,
    {
      cache: "no-store",
      credentials: "include"
    }
  );

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
