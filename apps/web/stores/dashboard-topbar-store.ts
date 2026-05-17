import { create } from "zustand";

type DashboardLandingTopbarContext = {
  geoName?: string | null;
  id: string;
  isRenaming?: boolean;
  metaError?: string | null;
  name: string;
  onRename?: (name: string) => Promise<void>;
  publicId?: string | null;
  status: string;
  templateName?: string | null;
  updatedAt?: string | null;
};

type DashboardTopbarState = {
  landingContext: DashboardLandingTopbarContext | null;
  clearLandingContext: (landingId?: string) => void;
  setLandingContext: (context: DashboardLandingTopbarContext) => void;
};

const useDashboardTopbarStore = create<DashboardTopbarState>()((set) => ({
  landingContext: null,
  clearLandingContext: (landingId) =>
    set((state) => {
      if (landingId && state.landingContext?.id !== landingId) {
        return state;
      }

      return { landingContext: null };
    }),
  setLandingContext: (landingContext) => set({ landingContext })
}));

export { useDashboardTopbarStore };
export type { DashboardLandingTopbarContext };
