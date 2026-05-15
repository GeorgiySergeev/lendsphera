"use client";

import type { Editor } from "grapesjs";
import * as React from "react";

import type { LandingEditorDocument } from "../../lib/api/landings";
import { componentsApi } from "../../lib/api/components";
import {
  applyLayoutToCanvas,
  generatedCanvasUtilityCss,
  insertHtmlAtSelection
} from "../../lib/editor/landing-editor-adapter";
import { toast } from "../../lib/toast";

type Device = "mobile" | "tablet" | "desktop";

type GrapesCanvasProps = {
  device: Device;
  initialDoc?: LandingEditorDocument;
  onEditorReady: (editor: Editor) => void;
};

function GrapesCanvas({ device, initialDoc, onEditorReady }: GrapesCanvasProps) {
  const containerId = React.useId().replaceAll(":", "");
  const initializedRef = React.useRef(false);
  const documentRef = React.useRef(initialDoc);
  documentRef.current = initialDoc;
  const onEditorReadyRef = React.useRef(onEditorReady);
  onEditorReadyRef.current = onEditorReady;
  const deviceRef = React.useRef(device);
  deviceRef.current = device;

  React.useEffect(() => {
    let editor: Editor | null = null;
    let cancelled = false;

    const loadGeneratedCanvasCss = (iframeDoc: Document) => {
      if (iframeDoc.getElementById("ls-generated-canvas-css")) {
        return;
      }

      const styleElement = iframeDoc.createElement("style");
      styleElement.id = "ls-generated-canvas-css";
      styleElement.textContent = generatedCanvasUtilityCss;
      iframeDoc.head.appendChild(styleElement);
    };

    const setupCanvasDocument = (iframeDoc: Document) => {
      if (!iframeDoc.head || !iframeDoc.body) {
        return false;
      }

      loadGeneratedCanvasCss(iframeDoc);
      applyLayoutToCanvas(editor as any, documentRef.current?.layout);

      if (iframeDoc.body.dataset.lsCanvasReady === "true") {
        return true;
      }

      iframeDoc.body.dataset.lsCanvasReady = "true";

      iframeDoc.addEventListener(
        "dragover",
        (e: DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer) {
            e.dataTransfer.dropEffect = "copy";
          }
          iframeDoc.body.style.outline = "2px dashed hsl(var(--primary))";
        },
        true
      );

      iframeDoc.addEventListener(
        "dragleave",
        () => {
          iframeDoc.body.style.outline = "";
        },
        true
      );

      iframeDoc.addEventListener(
        "drop",
        (e: DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          iframeDoc.body.style.outline = "";
          try {
            const dataStr =
              e.dataTransfer?.getData("application/x-affly-component") ||
              e.dataTransfer?.getData("application/x-landing-block") ||
              e.dataTransfer?.getData("text/plain");
            if (dataStr) {
              const data = JSON.parse(dataStr);
              if (
                (data.type === "affly-component" || data.type === "landing-block") &&
                editor
              ) {
                insertHtmlAtSelection(editor as any, data.html);
                if (data.css) {
                  (editor as any).Css.addRules(data.css);
                }

                if (data.type === "affly-component") {
                  componentsApi.trackUsage(data.componentId).catch(() => {});
                  toast.success(`"${data.name}" added to canvas`);
                }

                if (data.type === "affly-component" && !data.css) {
                  componentsApi
                    .get(data.componentId)
                    .then((detail) => {
                      if (detail.css && editor) {
                        (editor as any).Css.addRules(detail.css);
                      }
                    })
                    .catch(() => {});
                }
              }
            }
          } catch {
            // Ignore parse errors.
          }
        },
        true
      );

      return true;
    };

    async function initEditor() {
      const [{ default: grapesjs }, { default: presetWebpage }] = await Promise.all([
        import("grapesjs"),
        import("grapesjs-preset-webpage")
      ]);

      if (cancelled || initializedRef.current) {
        return;
      }

      initializedRef.current = true;

      const doc = documentRef.current;

      editor = grapesjs.init({
        assetManager: {
          appendTo: "#gjs-assets"
        },
        blockManager: {
          custom: true
        },
        canvas: {},
        container: `#${containerId}`,
        deviceManager: {
          devices: [
            { id: "desktop", name: "Desktop", width: "" },
            { id: "tablet", name: "Tablet", width: "768px" },
            { id: "mobile", name: "Mobile", width: "375px" }
          ]
        },
        fromElement: false,
        height: "100%",
        layerManager: {
          appendTo: "#gjs-layers"
        },
        panels: {
          defaults: []
        },
        plugins: [presetWebpage],
        selectorManager: {
          appendTo: "#gjs-styles"
        },
        storageManager: false,
        styleManager: {
          appendTo: "#gjs-styles",
          custom: false
        },
        traitManager: {
          appendTo: "#gjs-traits",
          custom: true
        },
        width: "100%"
      });

      if (doc?.components) {
        editor.setComponents(doc.components);
      } else if (doc?.html) {
        editor.setComponents(doc.html);
      } else {
        editor.setComponents(defaultLandingMarkup);
      }

      if (doc?.styles) {
        editor.setStyle(doc.styles);
      } else if (doc?.css) {
        editor.setStyle(doc.css);
      }

      if (doc?.assets?.length) {
        editor.AssetManager.add(doc.assets);
      }

      const attachCanvasDocument = () => {
        const iframeDoc = (editor as any).Canvas?.getDocument?.();
        if (!iframeDoc) {
          return;
        }

        if (!setupCanvasDocument(iframeDoc)) {
          window.setTimeout(attachCanvasDocument, 100);
        }
      };

      editor.on("canvas:frame:load", attachCanvasDocument);
      attachCanvasDocument();

      editor.setDevice(deviceRef.current);
      onEditorReadyRef.current(editor);

      editor.on("block:drag:stop", (_droppedComponent, block: any) => {
        if (block) {
          const blockId = block.getId();
          if (blockId.startsWith("affly-")) {
            const compId = blockId.replace("affly-", "");
            componentsApi.trackUsage(compId).catch(() => {});

            componentsApi
              .get(compId)
              .then((detail) => {
                if (detail.css && editor) {
                  (editor as any).Css.addRules(detail.css);
                }
              })
              .catch(() => {});
          }
        }
      });
    }

    void initEditor();

    return () => {
      cancelled = true;
      editor?.destroy();
      initializedRef.current = false;
    };
  }, [containerId]);

  return (
    <div
      id={containerId}
      className="landing-grapes-editor h-full min-h-[680px] w-full [&_.gjs-cv-canvas]:h-full [&_.gjs-cv-canvas]:w-full [&_.gjs-editor]:bg-transparent"
    />
  );
}

const defaultLandingMarkup =
  '<main class="min-h-screen bg-white"><section class="mx-auto max-w-5xl px-6 py-20 text-center"><p class="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Landing Builder</p><h1 class="mt-4 text-5xl font-bold tracking-tight text-slate-950">Edit your landing page</h1><p class="mx-auto mt-6 max-w-2xl text-lg text-slate-600">Drag blocks from the left panel, select elements on the canvas, and adjust content or styles on the right.</p><a class="mt-8 inline-flex rounded-full bg-blue-600 px-6 py-3 font-semibold text-white" href="#">Primary action</a></section></main>';

export { GrapesCanvas };
