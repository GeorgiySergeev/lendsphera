import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role?: string | null;
};

/**
 * Login / refresh response shape returned by the API.
 * `refreshToken` is no longer included — it lives in an HttpOnly cookie.
 */
type AuthLoginResponse = {
  accessToken: string;
  user: AuthUser;
};

type AuthState = {
  /**
   * Access token stored in MEMORY ONLY (lost on page refresh).
   * This is intentional:
   *  1. It's short-lived (15 minutes)
   *  2. Refresh token in HttpOnly cookie silently obtains a new one
   *  3. Never exposed to XSS (not persisted in localStorage)
   */
  accessToken: string | null;

  /**
   * Public user profile — safe to persist in localStorage.
   * `refreshToken` is **NOT** stored here; it lives in an HttpOnly cookie
   * managed entirely by the browser.
   */
  user: AuthUser | null;

  // Actions
  setAccessToken: (token: string) => void;
  setSession: (response: AuthLoginResponse) => void;
  clearSession: () => void;
  isLoggedIn: () => boolean;
};

// ────────────────────────────────────────────────────────────────
// SSR-safe storage
// ────────────────────────────────────────────────────────────────

const noopStorage: StateStorage = {
  getItem: () => null,
  removeItem: () => undefined,
  setItem: () => undefined,
};

// ────────────────────────────────────────────────────────────────
// Store
// ────────────────────────────────────────────────────────────────

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,

      setAccessToken: (accessToken: string) => set({ accessToken }),

      setSession: ({ user, accessToken }: AuthLoginResponse) =>
        set({ user, accessToken }),

      clearSession: () => set({ accessToken: null, user: null }),

      isLoggedIn: () => get().user !== null,
    }),
    {
      name: "landing-builder-auth",
      // ⚠️  SECURITY: Only `user` is persisted to localStorage.
      //     `accessToken` stays in memory (lost on F5 — recovered via refresh cookie).
      //     `refreshToken` is never in JS land — HttpOnly cookie only.
      partialize: ({ user }) => ({ user }),
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : window.localStorage,
      ),
    },
  ),
);

export { useAuthStore };
export type { AuthLoginResponse, AuthUser };
