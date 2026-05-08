import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role?: string | null;
};

type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
};

const noopStorage: StateStorage = {
  getItem: () => null,
  removeItem: () => undefined,
  setItem: () => undefined
};

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: ({ accessToken, refreshToken, user }) =>
        set({ accessToken, refreshToken, user }),
      clearSession: () => set({ accessToken: null, refreshToken: null, user: null })
    }),
    {
      name: "landing-builder-auth",
      partialize: ({ accessToken, refreshToken, user }) => ({
        accessToken,
        refreshToken,
        user
      }),
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : window.localStorage
      )
    }
  )
);

export { useAuthStore };
export type { AuthSession, AuthUser };
