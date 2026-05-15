import type { LucideIcon } from "lucide-react";
import {
  Columns2,
  Columns3,
  FileQuestion,
  GalleryVertical,
  ImageIcon,
  LayoutTemplate,
  Link2,
  ListChecks,
  MessageSquareQuote,
  Pilcrow,
  Quote,
  RectangleHorizontal,
  Rows3,
  Sparkles
} from "lucide-react";
import type { LandingEditorLayout } from "@workspace/types";

type EditorLike = {
  Canvas?: {
    getBody?: () => HTMLBodyElement | null;
    getDocument?: () => Document | null;
    scrollTo?: (component: unknown, options?: unknown) => void;
  };
  Commands?: {
    add?: (id: string, command: unknown) => void;
    getAll?: () => Record<string, unknown>;
    isActive?: (id: string) => boolean;
  };
  getSelected?: () => unknown;
  getWrapper?: () => unknown;
  on?: (event: string, callback: (...args: unknown[]) => void) => void;
  runCommand?: (id: string) => void;
  select?: (component: unknown | null) => void;
  stopCommand?: (id: string) => void;
  getHtml?: () => string;
};

type BlockDescriptor = {
  content: string;
  icon: LucideIcon;
  id: string;
  label: string;
};

type CanvasToolDescriptor = {
  active?: boolean;
  command: string;
  destructive?: boolean;
  id: string;
  label: string;
};

const generatedCanvasUtilityCss = `
  .mx-auto{margin-left:auto;margin-right:auto}
  .inline-flex{display:inline-flex}
  .flex{display:flex}
  .flex-col{flex-direction:column}
  .grid{display:grid}
  .items-center{align-items:center}
  .justify-center{justify-content:center}
  .max-w-4xl{max-width:56rem}
  .max-w-5xl{max-width:64rem}
  .max-w-6xl{max-width:72rem}
  .max-w-2xl{max-width:42rem}
  .w-full{width:100%}
  .gap-4{gap:1rem}
  .gap-6{gap:1.5rem}
  .px-5{padding-left:1.25rem;padding-right:1.25rem}
  .px-6{padding-left:1.5rem;padding-right:1.5rem}
  .py-3{padding-top:.75rem;padding-bottom:.75rem}
  .py-12{padding-top:3rem;padding-bottom:3rem}
  .py-16{padding-top:4rem;padding-bottom:4rem}
  .py-20{padding-top:5rem;padding-bottom:5rem}
  .p-6{padding:1.5rem}
  .p-10{padding:2.5rem}
  .mt-2{margin-top:.5rem}
  .mt-3{margin-top:.75rem}
  .mt-4{margin-top:1rem}
  .mt-6{margin-top:1.5rem}
  .mt-8{margin-top:2rem}
  .mb-3{margin-bottom:.75rem}
  .min-h-screen{min-height:100vh}
  .rounded-2xl{border-radius:1rem}
  .rounded-3xl{border-radius:1.5rem}
  .rounded-full{border-radius:9999px}
  .overflow-hidden{overflow:hidden}
  .border{border-width:1px;border-style:solid}
  .border-slate-200{border-color:rgb(226 232 240)}
  .bg-white{background-color:#fff}
  .bg-blue-600{background-color:rgb(37 99 235)}
  .bg-slate-50{background-color:rgb(248 250 252)}
  .bg-slate-950{background-color:rgb(2 6 23)}
  .text-center{text-align:center}
  .text-sm{font-size:.875rem;line-height:1.25rem}
  .text-lg{font-size:1.125rem;line-height:1.75rem}
  .text-xl{font-size:1.25rem;line-height:1.75rem}
  .text-2xl{font-size:1.5rem;line-height:2rem}
  .text-3xl{font-size:1.875rem;line-height:2.25rem}
  .text-4xl{font-size:2.25rem;line-height:2.5rem}
  .text-5xl{font-size:3rem;line-height:1}
  .font-semibold{font-weight:600}
  .font-bold{font-weight:700}
  .uppercase{text-transform:uppercase}
  .tracking-tight{letter-spacing:-.025em}
  .tracking-\\[0\\.3em\\]{letter-spacing:.3em}
  .leading-relaxed{line-height:1.625}
  .text-white{color:#fff}
  .text-blue-600{color:rgb(37 99 235)}
  .text-slate-300{color:rgb(203 213 225)}
  .text-slate-600{color:rgb(71 85 105)}
  .text-slate-950{color:rgb(2 6 23)}
  .shadow-sm{box-shadow:0 1px 2px 0 rgb(15 23 42 / 0.08)}
  .md\\:grid-cols-3{grid-template-columns:repeat(1,minmax(0,1fr))}
  @media (min-width: 768px){.md\\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}}
`;

const basicLandingBlocks: BlockDescriptor[] = [
  {
    id: "link-block",
    label: "Link Block",
    icon: Link2,
    content:
      '<div class="mx-auto max-w-2xl px-6 py-12 text-center"><a class="inline-flex rounded-full bg-blue-600 px-6 py-3 font-semibold text-white" href="#">Primary action</a></div>'
  },
  {
    id: "quote",
    label: "Quote",
    icon: Quote,
    content:
      '<blockquote class="mx-auto max-w-2xl px-6 py-12 text-center"><p class="text-lg text-slate-600">“A concise customer quote that reinforces the offer.”</p><footer class="mt-3 text-sm font-semibold text-slate-950">Happy customer</footer></blockquote>'
  },
  {
    id: "text-section",
    label: "Text section",
    icon: Pilcrow,
    content:
      '<section class="mx-auto max-w-4xl px-6 py-16"><h2 class="text-3xl font-bold tracking-tight text-slate-950">Section heading</h2><p class="mt-4 text-lg text-slate-600">Use this block for supporting copy, FAQs, or a compact product narrative.</p></section>'
  },
  {
    id: "one-column",
    label: "1 Column",
    icon: RectangleHorizontal,
    content:
      '<section class="mx-auto max-w-5xl px-6 py-12"><div class="rounded-2xl border border-slate-200 p-6"><h3 class="font-semibold text-slate-950">Single column</h3><p class="mt-2 text-sm text-slate-600">A flexible container for hero content, testimonials, or long-form sections.</p></div></section>'
  },
  {
    id: "two-columns",
    label: "2 Columns",
    icon: Columns2,
    content:
      '<section class="mx-auto grid max-w-5xl gap-4 px-6 py-12 md:grid-cols-3"><article class="rounded-2xl border border-slate-200 p-6"><h3 class="font-semibold text-slate-950">Column one</h3><p class="mt-2 text-sm text-slate-600">Add feature or pricing content here.</p></article><article class="rounded-2xl border border-slate-200 p-6"><h3 class="font-semibold text-slate-950">Column two</h3><p class="mt-2 text-sm text-slate-600">Use the second column for contrast or proof.</p></article></section>'
  },
  {
    id: "three-columns",
    label: "3 Columns",
    icon: Columns3,
    content:
      '<section class="mx-auto grid max-w-5xl gap-4 px-6 py-12 md:grid-cols-3"><article class="rounded-2xl border border-slate-200 p-6"><h3 class="font-semibold text-slate-950">First</h3><p class="mt-2 text-sm text-slate-600">Short supporting text.</p></article><article class="rounded-2xl border border-slate-200 p-6"><h3 class="font-semibold text-slate-950">Second</h3><p class="mt-2 text-sm text-slate-600">Short supporting text.</p></article><article class="rounded-2xl border border-slate-200 p-6"><h3 class="font-semibold text-slate-950">Third</h3><p class="mt-2 text-sm text-slate-600">Short supporting text.</p></article></section>'
  },
  {
    id: "three-seven",
    label: "2 Columns 3/7",
    icon: Rows3,
    content:
      '<section class="mx-auto grid max-w-5xl gap-4 px-6 py-12" style="grid-template-columns:minmax(0,3fr) minmax(0,7fr)"><article class="rounded-2xl border border-slate-200 p-6"><h3 class="font-semibold text-slate-950">Sidebar</h3><p class="mt-2 text-sm text-slate-600">Use for key proof or navigation.</p></article><article class="rounded-2xl border border-slate-200 p-6"><h3 class="font-semibold text-slate-950">Main content</h3><p class="mt-2 text-sm text-slate-600">Longer body content, comparison tables, or narrative sections fit here.</p></article></section>'
  },
  {
    id: "hero-split",
    label: "Hero split",
    icon: LayoutTemplate,
    content:
      '<section class="mx-auto grid max-w-6xl gap-6 px-6 py-16" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));align-items:center"><div><p class="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Launch fast</p><h2 class="mt-4 text-4xl font-bold tracking-tight text-slate-950">A flexible hero section for your landing page</h2><p class="mt-4 text-lg leading-relaxed text-slate-600">Use it for product intros, campaign entries, or high-conversion offer pages.</p><a class="mt-8 inline-flex rounded-full bg-blue-600 px-6 py-3 font-semibold text-white" href="#">Get started</a></div><div class="rounded-3xl bg-slate-50 p-10 shadow-sm"><p class="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Preview</p><p class="mt-4 text-2xl font-bold text-slate-950">Built for editors</p><p class="mt-3 text-sm leading-relaxed text-slate-600">Pair this with testimonials, proof sections, and CTA strips below.</p></div></section>'
  },
  {
    id: "image-card",
    label: "Image card",
    icon: ImageIcon,
    content:
      '<section class="mx-auto max-w-5xl px-6 py-12"><article class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div style="min-height:220px;background:linear-gradient(135deg,#dbeafe,#eff6ff)"></div><div class="p-6"><p class="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Visual block</p><h3 class="mt-3 text-2xl font-bold text-slate-950">Add a feature image, mockup, or cover shot</h3><p class="mt-3 text-sm leading-relaxed text-slate-600">Great for screenshot-led product sections and media-heavy stories.</p></div></article></section>'
  },
  {
    id: "feature-list",
    label: "Feature list",
    icon: ListChecks,
    content:
      '<section class="mx-auto max-w-4xl px-6 py-12"><h3 class="text-3xl font-bold tracking-tight text-slate-950">Why teams choose this flow</h3><div class="mt-6 grid gap-4" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))"><article class="rounded-2xl border border-slate-200 p-6"><p class="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">01</p><h4 class="mt-3 text-xl font-bold text-slate-950">Clear hierarchy</h4><p class="mt-2 text-sm text-slate-600">Blocks stay readable even as the layout grows.</p></article><article class="rounded-2xl border border-slate-200 p-6"><p class="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">02</p><h4 class="mt-3 text-xl font-bold text-slate-950">Fast editing</h4><p class="mt-2 text-sm text-slate-600">Use direct controls and reusable sections to move quickly.</p></article><article class="rounded-2xl border border-slate-200 p-6"><p class="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">03</p><h4 class="mt-3 text-xl font-bold text-slate-950">Responsive by default</h4><p class="mt-2 text-sm text-slate-600">Useful for promos, product pages, and compact landing flows.</p></article></div></section>'
  },
  {
    id: "stats-row",
    label: "Stats row",
    icon: Sparkles,
    content:
      '<section class="mx-auto max-w-5xl px-6 py-12"><div class="grid gap-4" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))"><article class="rounded-2xl border border-slate-200 p-6 text-center"><p class="text-4xl font-bold text-slate-950">24%</p><p class="mt-2 text-sm text-slate-600">Higher conversion</p></article><article class="rounded-2xl border border-slate-200 p-6 text-center"><p class="text-4xl font-bold text-slate-950">3x</p><p class="mt-2 text-sm text-slate-600">Faster publishing</p></article><article class="rounded-2xl border border-slate-200 p-6 text-center"><p class="text-4xl font-bold text-slate-950">98</p><p class="mt-2 text-sm text-slate-600">Saved draft versions</p></article></div></section>'
  },
  {
    id: "testimonial-card",
    label: "Testimonial",
    icon: MessageSquareQuote,
    content:
      '<section class="mx-auto max-w-4xl px-6 py-12"><article class="rounded-3xl bg-slate-950 p-10 text-white"><p class="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">Customer story</p><p class="mt-4 text-2xl font-bold">"The new editing flow made iteration dramatically faster for the team."</p><p class="mt-4 text-sm text-slate-300">Jane Doe, Product Marketing Lead</p></article></section>'
  },
  {
    id: "faq-item",
    label: "FAQ",
    icon: FileQuestion,
    content:
      '<section class="mx-auto max-w-4xl px-6 py-12"><article class="rounded-2xl border border-slate-200 p-6"><h3 class="text-xl font-bold text-slate-950">Frequently asked question</h3><p class="mt-3 text-sm leading-relaxed text-slate-600">Use this block for concise answers about pricing, setup, delivery, or any objection-handling copy.</p></article></section>'
  },
  {
    id: "gallery-row",
    label: "Gallery row",
    icon: GalleryVertical,
    content:
      '<section class="mx-auto max-w-6xl px-6 py-12"><div class="grid gap-4" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))"><div class="rounded-2xl bg-slate-50" style="min-height:180px"></div><div class="rounded-2xl bg-slate-50" style="min-height:180px"></div><div class="rounded-2xl bg-slate-50" style="min-height:180px"></div></div></section>'
  }
];

function registerLandingEditorCommands(
  editor: EditorLike,
  callbacks: {
    onOpenCodePanel: () => void;
  }
) {
  const commands = editor.Commands;

  commands?.add?.("landing:open-code-panel", {
    run() {
      callbacks.onOpenCodePanel();
    }
  });
  commands?.add?.("landing:component-parent", {
    run(ed: EditorLike) {
      ed.runCommand?.("core:component-exit");
    }
  });
  commands?.add?.("landing:component-delete", {
    run(ed: EditorLike) {
      ed.runCommand?.("core:component-delete");
    }
  });
  commands?.add?.("landing:component-clone", {
    run(ed: EditorLike) {
      const selected = ed.getSelected?.() as any;
      const parent = typeof selected?.parent === "function" ? selected.parent() : null;
      const siblings = parent?.components?.();
      const index =
        typeof siblings?.indexOf === "function" ? siblings.indexOf(selected) : -1;

      if (!selected || !parent || typeof selected.clone !== "function") {
        return;
      }

      const clone = selected.clone();
      const inserted =
        typeof siblings?.add === "function"
          ? siblings.add(clone, { at: index >= 0 ? index + 1 : undefined })
          : parent.append?.(clone);
      const nextSelected = Array.isArray(inserted) ? inserted[0] : (inserted ?? clone);
      ed.select?.(nextSelected);
      ed.Canvas?.scrollTo?.(nextSelected, { behavior: "smooth", force: true });
    }
  });
  commands?.add?.("landing:component-move-up", {
    run(ed: EditorLike) {
      moveSelectedComponent(ed, -1);
    }
  });
  commands?.add?.("landing:component-move-down", {
    run(ed: EditorLike) {
      moveSelectedComponent(ed, 1);
    }
  });
}

function getCanvasTools(editor: EditorLike): CanvasToolDescriptor[] {
  const available = editor.Commands?.getAll?.() ?? {};
  const supported = (command: string) => Boolean(available[command]);

  return [
    {
      active: readCommandActive(editor, "core:component-outline"),
      command: "core:component-outline",
      id: "visibility",
      label: "Toggle outlines"
    },
    {
      active: readCommandActive(editor, "core:preview"),
      command: "core:preview",
      id: "preview",
      label: "Preview"
    },
    {
      active: readCommandActive(editor, "core:fullscreen"),
      command: "core:fullscreen",
      id: "fullscreen",
      label: "Fullscreen"
    },
    {
      command: "landing:open-code-panel",
      id: "code",
      label: "Code"
    },
    {
      command: "core:undo",
      id: "undo",
      label: "Undo"
    },
    {
      command: "core:redo",
      id: "redo",
      label: "Redo"
    },
    {
      command: "core:canvas-clear",
      destructive: true,
      id: "clear",
      label: "Clear canvas"
    }
  ].filter(
    (tool) => tool.command === "landing:open-code-panel" || supported(tool.command)
  );
}

function executeCanvasTool(editor: EditorLike, command: string) {
  const isActive = readCommandActive(editor, command);
  if (isActive) {
    editor.stopCommand?.(command);
    return;
  }

  editor.runCommand?.(command);
}

function readCommandActive(editor: EditorLike, command: string) {
  return Boolean(editor.Commands?.isActive?.(command));
}

function insertHtmlAtSelection(editor: EditorLike, html: string) {
  const selected = editor.getSelected?.() as any;
  const target = findDroppableTarget(selected) ?? editor.getWrapper?.();

  if (target) {
    const added = appendComponent(target, html);
    const inserted = getFirstInsertedComponent(added);
    if (inserted) {
      editor.select?.(inserted);
      editor.Canvas?.scrollTo?.(inserted, { behavior: "smooth", force: true });
    }
    return inserted ?? null;
  }

  return null;
}

function appendComponent(target: any, html: string) {
  if (typeof target?.append === "function") {
    return target.append(html);
  }

  if (typeof target?.components === "function") {
    const collection = target.components();
    if (typeof collection?.add === "function") {
      return collection.add(html);
    }
    return target.components(html);
  }

  return null;
}

function getFirstInsertedComponent(value: any) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  if (typeof value?.at === "function") {
    return value.at(0) ?? null;
  }

  return value ?? null;
}

function findDroppableTarget(component: any): any {
  let current = component;

  while (current) {
    const droppable =
      typeof current.get === "function" ? current.get("droppable") : current?.droppable;
    const tagName = resolveTagName(current);

    if (droppable !== false && isStructuralDropTarget(tagName)) {
      return current;
    }

    current = typeof current.parent === "function" ? current.parent() : null;
  }

  return null;
}

function resolveTagName(component: any) {
  const rawTagName =
    typeof component?.get === "function" ? component.get("tagName") : component?.tagName;

  return typeof rawTagName === "string" ? rawTagName.toLowerCase() : "";
}

function isStructuralDropTarget(tagName: string) {
  return !tagName || structuralDropTargets.has(tagName);
}

const structuralDropTargets = new Set([
  "article",
  "aside",
  "body",
  "div",
  "footer",
  "form",
  "header",
  "main",
  "nav",
  "section"
]);

function moveSelectedComponent(editor: EditorLike, direction: -1 | 1) {
  const selected = editor.getSelected?.() as any;
  const parent = typeof selected?.parent === "function" ? selected.parent() : null;
  const siblings = parent?.components?.();

  if (!selected || !parent || !siblings || typeof siblings.indexOf !== "function") {
    return;
  }

  const index = siblings.indexOf(selected);
  if (index < 0) {
    return;
  }

  const maxIndex = typeof siblings.length === "number" ? siblings.length - 1 : index;
  const nextIndex = Math.max(0, Math.min(maxIndex, index + direction));

  if (nextIndex === index || typeof selected.move !== "function") {
    return;
  }

  selected.move(parent, { at: nextIndex });
  editor.select?.(selected);
  editor.Canvas?.scrollTo?.(selected, { behavior: "smooth", force: true });
}

function ensureComponentToolbar(component: any) {
  if (
    !component ||
    typeof component.get !== "function" ||
    typeof component.set !== "function"
  ) {
    return;
  }

  const toolbar = component.get("toolbar");
  if (
    Array.isArray(toolbar) &&
    toolbar.some((item) => item?.command === "landing:component-delete")
  ) {
    return;
  }

  component.set("toolbar", [
    { command: "landing:component-parent", label: "Parent" },
    { command: "landing:component-move-up", label: "Up" },
    { command: "landing:component-move-down", label: "Down" },
    { command: "landing:component-clone", label: "Clone" },
    { command: "landing:component-delete", label: "Delete" }
  ]);
}

function applyLayoutToCanvas(
  editor: EditorLike,
  layout: LandingEditorLayout | undefined
) {
  const iframeDoc = editor.Canvas?.getDocument?.();
  const wrapper = editor.getWrapper?.() as any;

  if (!iframeDoc?.documentElement || !iframeDoc.body) {
    return;
  }

  applyAttributeSet(iframeDoc.documentElement, layout?.htmlAttributes, {
    className: undefined
  });
  applyAttributeSet(iframeDoc.body, layout?.bodyAttributes, {
    className: layout?.bodyClass
  });

  if (wrapper?.addAttributes) {
    const attrs = wrapper.getAttributes?.() ?? {};
    const className = layout?.wrapperClass?.trim();
    if (className) {
      wrapper.addAttributes({ ...attrs, class: className });
    } else if (attrs.class) {
      const next = { ...attrs };
      delete next.class;
      wrapper.setAttributes?.(next);
    }
  }
}

function applyAttributeSet(
  element: HTMLElement,
  nextAttributes: Record<string, string> | undefined,
  options: { className?: string }
) {
  const managed = element.getAttribute("data-ls-layout-managed");
  if (managed) {
    managed
      .split(",")
      .filter(Boolean)
      .forEach((name) => {
        if (name !== "class") {
          element.removeAttribute(name);
        }
      });
  }

  const attributeNames = Object.keys(nextAttributes ?? {});
  attributeNames.forEach((name) => {
    const value = nextAttributes?.[name];
    if (value) {
      element.setAttribute(name, value);
    }
  });

  element.setAttribute("data-ls-layout-managed", attributeNames.join(","));

  if (options.className !== undefined) {
    element.className = options.className;
  }
}

export {
  applyLayoutToCanvas,
  basicLandingBlocks,
  ensureComponentToolbar,
  executeCanvasTool,
  generatedCanvasUtilityCss,
  getCanvasTools,
  insertHtmlAtSelection,
  registerLandingEditorCommands
};
export type { BlockDescriptor, CanvasToolDescriptor, EditorLike };
