import { create } from "zustand";
import type { ComponentDetail, ComponentVariant } from "@workspace/types";

export interface ComponentVariantState {
  id: string; // 'default' for main
  name: string;
  html: string;
  css: string;
  isDefault: boolean;
  isDirty: boolean;
}

interface ComponentEditorStore {
  // Component data
  componentId: string | null;
  name: string;
  description: string;
  categoryId: string;
  tags: string[];
  previewBg: string;
  previewDark: boolean;
  previewHeight: number;

  // Variants
  variants: ComponentVariantState[];
  activeVariantId: string;

  // Editor state
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;

  // UI state
  splitDirection: "horizontal" | "vertical";
  editorTab: "html" | "css";
  previewDevice: "mobile" | "tablet" | "desktop";
  showPreview: boolean;
  showSettings: boolean;

  // Actions
  init: (component: ComponentDetail) => void;
  setHtml: (html: string) => void;
  setCss: (css: string) => void;
  setActiveVariant: (variantId: string) => void;
  addVariant: (variant: ComponentVariant) => void;
  updateVariantLocal: (variantId: string, html?: string, css?: string) => void;
  removeVariantLocal: (variantId: string) => void;
  markDirty: () => void;
  markSaved: () => void;
  toggleSplitDirection: () => void;
  setPreviewDevice: (device: "mobile" | "tablet" | "desktop") => void;
  setEditorTab: (tab: "html" | "css") => void;
  setShowSettings: (show: boolean) => void;
  updateMetadata: (data: Partial<Pick<ComponentEditorStore, "name" | "description" | "categoryId" | "tags" | "previewBg" | "previewDark" | "previewHeight">>) => void;
  renameVariantLocal: (variantId: string, name: string) => void;
}

export const useComponentEditorStore = create<ComponentEditorStore>((set) => ({
  componentId: null,
  name: "",
  description: "",
  categoryId: "",
  tags: [],
  previewBg: "",
  previewDark: false,
  previewHeight: 0,

  variants: [],
  activeVariantId: "default",

  isDirty: false,
  isSaving: false,
  lastSavedAt: null,

  splitDirection: "horizontal",
  editorTab: "html",
  previewDevice: "desktop",
  showPreview: true,
  showSettings: false,

  init: (component) => {
    const defaultVariant: ComponentVariantState = {
      id: "default",
      name: "Default",
      html: component.html,
      css: component.css || "",
      isDefault: true,
      isDirty: false,
    };

    const variants: ComponentVariantState[] = [
      defaultVariant,
      ...(component.variants || []).map((v) => ({
        id: v.id,
        name: v.name,
        html: v.html,
        css: v.css || "",
        isDefault: v.isDefault,
        isDirty: false,
      })),
    ];

    set({
      componentId: component.id,
      name: component.name,
      description: component.description || "",
      categoryId: component.category.id,
      tags: component.tags || [],
      previewBg: component.previewBg || "",
      previewDark: component.previewDark,
      previewHeight: component.previewHeight || 0,
      variants,
      activeVariantId: "default",
      isDirty: false,
      lastSavedAt: null,
    });
  },

  setHtml: (html) =>
    set((state) => ({
      variants: state.variants.map((v) =>
        v.id === state.activeVariantId ? { ...v, html, isDirty: true } : v
      ),
      isDirty: true,
    })),

  setCss: (css) =>
    set((state) => ({
      variants: state.variants.map((v) =>
        v.id === state.activeVariantId ? { ...v, css, isDirty: true } : v
      ),
      isDirty: true,
    })),

  setActiveVariant: (variantId) => set({ activeVariantId: variantId }),

  addVariant: (variant) =>
    set((state) => ({
      variants: [
        ...state.variants,
        {
          id: variant.id,
          name: variant.name,
          html: variant.html,
          css: variant.css || "",
          isDefault: variant.isDefault,
          isDirty: false,
        },
      ],
      activeVariantId: variant.id,
    })),

  updateVariantLocal: (variantId, html, css) =>
    set((state) => ({
      variants: state.variants.map((v) => {
        if (v.id !== variantId) return v;
        return {
          ...v,
          ...(html !== undefined ? { html } : {}),
          ...(css !== undefined ? { css } : {}),
          isDirty: true,
        };
      }),
      isDirty: true,
    })),

  removeVariantLocal: (variantId) =>
    set((state) => {
      const nextVariants = state.variants.filter((v) => v.id !== variantId);
      const nextActiveId =
        state.activeVariantId === variantId ? "default" : state.activeVariantId;
      return { variants: nextVariants, activeVariantId: nextActiveId };
    }),
    
  renameVariantLocal: (variantId, name) => 
    set((state) => ({
      variants: state.variants.map((v) =>
        v.id === variantId ? { ...v, name, isDirty: true } : v
      ),
      isDirty: true,
    })),

  markDirty: () => set({ isDirty: true }),

  markSaved: () =>
    set((state) => ({
      isDirty: false,
      isSaving: false,
      lastSavedAt: new Date(),
      variants: state.variants.map((v) => ({ ...v, isDirty: false })),
    })),

  toggleSplitDirection: () =>
    set((state) => ({
      splitDirection: state.splitDirection === "horizontal" ? "vertical" : "horizontal",
    })),

  setPreviewDevice: (device) => set({ previewDevice: device }),

  setEditorTab: (tab) => set({ editorTab: tab }),
  
  setShowSettings: (show) => set({ showSettings: show }),
  
  updateMetadata: (data) => set((state) => ({ ...state, ...data, isDirty: true })),
}));
