import { apiClient, refreshClient } from "./client";
import { useAuthStore, type AuthLoginResponse } from "../../stores/auth-store";

// ────────────────────────────────────────────────────────────────
// Auth API helpers
//
// Centralizes calls to /auth/* endpoints and keeps the Zustand
// session in sync. The refresh token is managed transparently by
// the API via an HttpOnly cookie — never touched here.
// ────────────────────────────────────────────────────────────────

type LoginInput = {
  email: string;
  password: string;
};

type RegisterInput = {
  email: string;
  password: string;
  name: string;
};

async function login({ email, password }: LoginInput): Promise<AuthLoginResponse> {
  const { data } = await apiClient.post<AuthLoginResponse>("/auth/login", {
    email,
    password
  });

  useAuthStore.getState().setSession(data);
  return data;
}

async function register(input: RegisterInput): Promise<AuthLoginResponse> {
  const { data } = await apiClient.post<AuthLoginResponse>("/auth/register", input);

  useAuthStore.getState().setSession(data);
  return data;
}

async function logout(): Promise<void> {
  try {
    await apiClient.post("/auth/logout");
  } finally {
    useAuthStore.getState().clearSession();
  }
}

async function restoreSession(): Promise<AuthLoginResponse | null> {
  try {
    const refresh = await refreshClient.post<{ accessToken: string }>("/auth/refresh");
    const accessToken = refresh.data.accessToken;

    useAuthStore.getState().setAccessToken(accessToken);

    const me = await refreshClient.get<AuthLoginResponse["user"]>("/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const session = { accessToken, user: me.data };
    useAuthStore.getState().setSession(session);

    return session;
  } catch {
    useAuthStore.getState().clearSession();
    return null;
  }
}

export { login, register, logout, restoreSession };
export type { LoginInput, RegisterInput };
