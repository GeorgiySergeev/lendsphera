"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { apiClient } from "../../../lib/api/client";
import { useAuthStore, type AuthLoginResponse } from "../../../stores/auth-store";

// ────────────────────────────────────────────────────────────────
// OAuth Callback Page
//
// Receives the access token from the URL hash fragment set by the
// API after a successful Google OAuth redirect:
//   /auth/callback#accessToken=<token>
//
// The hash is never sent to the server, so it stays in JS-land only.
// ────────────────────────────────────────────────────────────────

export default function OAuthCallbackPage() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    void (async () => {
      try {
        const hash = window.location.hash.slice(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get("accessToken");

        if (!accessToken) {
          router.replace("/login?error=oauth_failed");
          return;
        }

        history.replaceState(null, "", window.location.pathname + window.location.search);

        useAuthStore.getState().setAccessToken(accessToken);

        const { data } = await apiClient.get<AuthLoginResponse["user"]>("/auth/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        useAuthStore.getState().setSession({ accessToken, user: data });

        router.replace("/dashboard");
      } catch {
        router.replace("/login?error=oauth_failed");
      }
    })();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
        <p className="text-sm">Signing you in…</p>
      </div>
    </main>
  );
}
