import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";

import { useAuthStore } from "../../stores/auth-store";

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type QueueEntry = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

// ────────────────────────────────────────────────────────────────
// Shared state for token refresh queue
// ────────────────────────────────────────────────────────────────

let isRefreshing = false;
let failedQueue: QueueEntry[] = [];
const REQUEST_TIMEOUT_MS = 10_000;

function processQueue(error: unknown, token: string | null): void {
  for (const { resolve, reject } of failedQueue) {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  }
  failedQueue = [];
}

// ────────────────────────────────────────────────────────────────
// Axios instances
// ────────────────────────────────────────────────────────────────

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

/**
 * Primary API client — attaches Bearer token from Zustand store
 * and sends cookies with every request (`withCredentials: true`).
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // ✅ Send HttpOnly cookies on every request
  timeout: REQUEST_TIMEOUT_MS
});

/**
 * Lightweight client used exclusively for the refresh call.
 * Prevents infinite loops when the refresh itself fails with 401.
 */
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // ✅ Send refreshToken cookie
  timeout: REQUEST_TIMEOUT_MS
});

// ────────────────────────────────────────────────────────────────
// REQUEST interceptor — inject access token
// ────────────────────────────────────────────────────────────────

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

// ────────────────────────────────────────────────────────────────
// RESPONSE interceptor — 401 → silent refresh → retry
// ────────────────────────────────────────────────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const original = error.config as RetryableRequestConfig | undefined;

    if (!original || original._retry) {
      return Promise.reject(error);
    }

    // ── If another request already triggered a refresh, queue this one ──
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      });
    }

    // ── First 401 → attempt a refresh ──
    isRefreshing = true;
    original._retry = true;

    try {
      // refreshToken is sent automatically via HttpOnly cookie
      const { data } = await refreshClient.post<{ accessToken: string }>("/auth/refresh");

      const { accessToken } = data;
      useAuthStore.getState().setAccessToken(accessToken);

      // Retry all queued requests with the new token
      processQueue(null, accessToken);

      original.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(original);
    } catch (refreshError) {
      // Refresh failed → full logout
      processQueue(refreshError, null);
      useAuthStore.getState().clearSession();

      // Redirect to login (only in browser context)
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export { apiClient, refreshClient };
