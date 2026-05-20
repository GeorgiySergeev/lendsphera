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

import { Button } from "@workspace/ui";
import { apiClient } from "../../lib/api/client";
import { toast } from "../../lib/toast";
import { ExportDialog } from "./export-dialog";

type StudioAsset = {
  id?: string;
  mimeType?: string;
  name?: string;
  size?: number;
  src: string;
  type?: string;
};

const studioTailwindScriptUrl = "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4";

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

const defaultEditorMarkup =
  '<main><section style="max-width:960px;margin:0 auto;padding:80px 24px;text-align:center"><h1 style="margin-top:16px;font-size:56px;line-height:1;font-weight:700;color:#020617">Blank editor</h1><p style="max-width:640px;margin:24px auto 0;font-size:18px;line-height:1.6;color:#475569">Start building your page from scratch.</p></section></main>';

function isInvalidAssetUrl(value: string) {
  const trimmed = value.trim();
  return !trimmed || trimmed === "undefined" || trimmed === "null";
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

function EditorShell() {
  const editorRef = React.useRef<any>(null);
  const studioRootRef = React.useRef<HTMLDivElement | null>(null);
  const studioInitRef = React.useRef(false);
  const [, setIsReady] = React.useState(false);
  const [isExportOpen, setIsExportOpen] = React.useState(false);

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
            onLoad: async () => []
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
        ]
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
                      type: "panelBlocks",
                      symbols: false,
                      style: { height: "100%" }
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
                      header: { label: "Assets" },
                      content: { itemsPerRow: 2, header: { upload: false } }
                    }
                  }
                ]
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
          pages: [{ name: "Home", component: defaultEditorMarkup }]
        }
      },
      plugins: [
        tableComponent,
        listPagesComponent,
        accordionComponent,
        flexComponent,
        layoutSidebarButtons,
        fsLightboxComponent,
        lightGalleryComponent,
        swiperComponent,
        rteTinyMce,
        canvasEmptyState
      ]
    }),
    []
  );

  React.useEffect(() => {
    let disposed = false;

    async function initEditor() {
      if (!studioRootRef.current || studioInitRef.current) {
        return;
      }

      studioInitRef.current = true;
      setIsReady(false);

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

    void initEditor();

    return () => {
      disposed = true;
      studioInitRef.current = false;
      const editor = editorRef.current;
      if (editor && typeof editor.destroy === "function") {
        editor.destroy();
      }
      editorRef.current = null;
    };
  }, [studioOptions]);

  const getHtml = React.useCallback(() => {
    const editor = editorRef.current;
    if (typeof editor?.getHtml === "function") {
      const html = editor.getHtml();
      return typeof html === "string" ? html : "";
    }
    return "";
  }, []);

  const getCss = React.useCallback(() => {
    const editor = editorRef.current;
    if (typeof editor?.getCss === "function") {
      const css = editor.getCss();
      return typeof css === "string" ? css : "";
    }
    return "";
  }, []);

  return (
    <div className="flex h-[calc(100dvh)] flex-col">
      <div className="flex items-center justify-between border-b bg-background px-4 py-2">
        <span className="text-sm font-semibold text-foreground">Editor</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsExportOpen(true)}>
            <svg
              className="mr-1.5 h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            Export
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden border bg-background shadow-sm">
        <div ref={studioRootRef} className="h-full w-full" />
      </div>
      <ExportDialog
        getHtml={getHtml}
        getCss={getCss}
        name="landing"
        isOpen={isExportOpen}
        onOpenChange={setIsExportOpen}
      />
    </div>
  );
}

export { EditorShell };
