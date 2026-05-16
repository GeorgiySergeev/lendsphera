import { create } from "zustand";

import type { MediaFolder } from "../lib/api/media";

type MediaState = {
  currentFolderId: string | null;
  folderPath: MediaFolder[];
  selectedAssetIds: Set<string>;
  viewMode: "grid" | "list";
  uploadProgress: number | null;
  isDraggingOver: boolean;

  // Actions
  navigateTo: (folder: MediaFolder | null) => void;
  navigateUp: () => void;
  toggleAsset: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setViewMode: (mode: "grid" | "list") => void;
  setUploadProgress: (progress: number | null) => void;
  setDraggingOver: (value: boolean) => void;
};

export const useMediaStore = create<MediaState>()((set) => ({
  currentFolderId: null,
  folderPath: [],
  selectedAssetIds: new Set<string>(),
  viewMode: "grid",
  uploadProgress: null,
  isDraggingOver: false,

  navigateTo: (folder) =>
    set((state) => {
      if (folder === null) {
        return { currentFolderId: null, folderPath: [] };
      }

      const existingIndex = state.folderPath.findIndex((f) => f.id === folder.id);

      if (existingIndex >= 0) {
        // Clicked a folder already in the breadcrumb — truncate path
        return {
          currentFolderId: folder.id,
          folderPath: state.folderPath.slice(0, existingIndex + 1)
        };
      }

      // Navigate deeper — append to path
      return {
        currentFolderId: folder.id,
        folderPath: [...state.folderPath, folder]
      };
    }),

  navigateUp: () =>
    set((state) => {
      const nextPath = state.folderPath.slice(0, -1);
      const last = nextPath[nextPath.length - 1] ?? null;

      return {
        currentFolderId: last?.id ?? null,
        folderPath: nextPath
      };
    }),

  toggleAsset: (id) =>
    set((state) => {
      const next = new Set(state.selectedAssetIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedAssetIds: next };
    }),

  selectAll: (ids) => set({ selectedAssetIds: new Set(ids) }),

  clearSelection: () => set({ selectedAssetIds: new Set<string>() }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setUploadProgress: (progress) => set({ uploadProgress: progress }),

  setDraggingOver: (value) => set({ isDraggingOver: value })
}));
