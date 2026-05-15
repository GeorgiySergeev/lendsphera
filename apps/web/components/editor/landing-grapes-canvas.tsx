"use client";

import type { Editor } from "grapesjs";
import * as React from "react";

import type { LandingEditorDocument } from "../../lib/api/landings";
import { componentsApi } from "../../lib/api/components";
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

    async function initEditor() {
      const [
        { default: grapesjs },
        { default: presetWebpage },
        { default: blocksBasic }
      ] = await Promise.all([
        import("grapesjs"),
        import("grapesjs-preset-webpage"),
        import("grapesjs-blocks-basic")
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
          appendTo: "#gjs-blocks"
        },
        canvas: {
          styles: ["https://cdn.tailwindcss.com"]
        },
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
        plugins: [presetWebpage, blocksBasic, tailwindBlocksPlugin],
        selectorManager: {
          appendTo: "#gjs-styles"
        },
        storageManager: false,
        styleManager: {
          appendTo: "#gjs-styles"
        },
        traitManager: {
          appendTo: "#gjs-traits"
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

      editor.setDevice(deviceRef.current);
      onEditorReadyRef.current(editor);

      const iframeDoc = (editor as any).Canvas?.getDocument?.();
      if (iframeDoc) {
        iframeDoc.addEventListener("dragover", (e: DragEvent) => {
          e.preventDefault();
          if (e.dataTransfer) {
            e.dataTransfer.dropEffect = "copy";
          }
          iframeDoc.body.style.outline = "2px dashed hsl(var(--primary))";
        });

        iframeDoc.addEventListener("dragleave", () => {
          iframeDoc.body.style.outline = "";
        });

        iframeDoc.addEventListener("drop", (e: DragEvent) => {
          iframeDoc.body.style.outline = "";
          try {
            const dataStr = e.dataTransfer?.getData("text/plain");
            if (dataStr) {
              const data = JSON.parse(dataStr);
              if (data.type === "affly-component" && editor) {
                (editor as any).addComponents(data.html);
                if (data.css) {
                  (editor as any).Css.addRules(data.css);
                }

                componentsApi.trackUsage(data.componentId).catch(() => {});
                toast.success(`"${data.name}" added to canvas`);

                if (!data.css) {
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
        });
      }

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

      try {
        const response = await componentsApi.list({ limit: 100, isPublic: true });
        response.data.forEach((comp) => {
          (editor as any)?.Blocks.add(`affly-${comp.id}`, {
            category: comp.category.name,
            content: comp.html,
            label: comp.name
          });
        });
      } catch {
        // Ignore API failures for blocks.
      }
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
      className="h-full min-h-[680px] w-full [&_.gjs-cv-canvas]:h-full [&_.gjs-cv-canvas]:w-full [&_.gjs-editor]:bg-transparent"
    />
  );
}

function tailwindBlocksPlugin(editor: Editor) {
  editor.BlockManager.add("tailwind-hero", {
    category: "Tailwind",
    content:
      '<section class="mx-auto max-w-5xl px-6 py-20 text-center"><p class="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">New campaign</p><h1 class="mt-4 text-5xl font-bold tracking-tight text-slate-950">Build high-converting landing pages</h1><p class="mx-auto mt-6 max-w-2xl text-lg text-slate-600">Compose reusable content blocks and publish localized experiences faster.</p><a class="mt-8 inline-flex rounded-full bg-blue-600 px-6 py-3 font-semibold text-white" href="#">Start now</a></section>',
    label: "Hero"
  });
  editor.BlockManager.add("tailwind-feature-grid", {
    category: "Tailwind",
    content:
      '<section class="mx-auto grid max-w-5xl gap-4 px-6 py-12 md:grid-cols-3"><article class="rounded-2xl border border-slate-200 p-6"><h2 class="font-semibold text-slate-950">Fast setup</h2><p class="mt-2 text-sm text-slate-600">Drop in ready-made sections and customize copy.</p></article><article class="rounded-2xl border border-slate-200 p-6"><h2 class="font-semibold text-slate-950">Responsive</h2><p class="mt-2 text-sm text-slate-600">Preview mobile, tablet, and desktop layouts.</p></article><article class="rounded-2xl border border-slate-200 p-6"><h2 class="font-semibold text-slate-950">Drafts</h2><p class="mt-2 text-sm text-slate-600">Autosave draft versions as the content evolves.</p></article></section>',
    label: "Feature grid"
  });
  editor.BlockManager.add("tailwind-cta", {
    category: "Tailwind",
    content:
      '<section class="mx-auto max-w-4xl px-6 py-16"><div class="rounded-3xl bg-slate-950 p-10 text-center text-white"><h2 class="text-3xl font-bold">Ready to publish?</h2><p class="mx-auto mt-3 max-w-xl text-slate-300">Use the editor to refine content, styles, and assets before launch.</p><a class="mt-6 inline-flex rounded-full bg-white px-5 py-3 font-semibold text-slate-950" href="#">Continue</a></div></section>',
    label: "CTA"
  });
}

const defaultLandingMarkup =
  '<main class="min-h-screen bg-white"><section class="mx-auto max-w-5xl px-6 py-20 text-center"><p class="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Landing Builder</p><h1 class="mt-4 text-5xl font-bold tracking-tight text-slate-950">Edit your landing page</h1><p class="mx-auto mt-6 max-w-2xl text-lg text-slate-600">Drag blocks from the left panel, select elements on the canvas, and adjust content or styles on the right.</p><a class="mt-8 inline-flex rounded-full bg-blue-600 px-6 py-3 font-semibold text-white" href="#">Primary action</a></section></main>';

export { GrapesCanvas };
