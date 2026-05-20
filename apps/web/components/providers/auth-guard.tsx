"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { restoreSession } from "../../lib/api/auth";
import { useAuthStore } from "../../stores/auth-store";

// ────────────────────────────────────────────────────────────────
// AuthGuard
//
// Client-side guard for authenticated areas (e.g. /dashboard/*).
//
// Why client-side and not Next.js middleware?
//   The session is held by:
//     • an HttpOnly refresh-token cookie scoped to the API origin
//       (different port → not visible on the web origin), and
//     • a Zustand store persisted to localStorage (user only).
//   Neither is readable from edge middleware running on the web
//   origin, so a server-side cookie guard would be a no-op.
//
// What it does:
//   • Waits for the Zustand persist middleware to hydrate.
//   • If no user is found after hydration, redirects to /login
//     with the original path captured in `?next=…` so the user
//     returns where they came from after signing in.
//   • Renders a minimal loading state during the check to avoid
//     a flash of protected content.
// ────────────────────────────────────────────────────────────────

type AuthGuardProps = {
  children: React.ReactNode;
};

function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);

  const [hasHydrated, setHasHydrated] = useState<boolean>(() =>
    useAuthStore.persist.hasHydrated()
  );
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const hasAttemptedRestoreRef = useRef(false);
  const restoreInFlightRef = useRef(false);

  useEffect(() => {
    if (hasHydrated) return;
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });
    return unsubscribe;
  }, [hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (user && accessToken) {
      hasAttemptedRestoreRef.current = false;
      restoreInFlightRef.current = false;
      if (isCheckingSession) {
        setIsCheckingSession(false);
      }
      return;
    }
    if (!user) {
      const query = typeof window !== "undefined" ? window.location.search : "";
      const next =
        pathname && pathname !== "/login" ? `${pathname}${query}` : "/dashboard";
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (restoreInFlightRef.current || hasAttemptedRestoreRef.current) return;

    let cancelled = false;

    restoreInFlightRef.current = true;
    setIsCheckingSession(true);
    hasAttemptedRestoreRef.current = true;

    void restoreSession().then((session) => {
      if (cancelled) {
        return;
      }

      restoreInFlightRef.current = false;
      setIsCheckingSession(false);

      if (session?.user) {
        return;
      }

      const query = typeof window !== "undefined" ? window.location.search : "";
      const next =
        pathname && pathname !== "/login" ? `${pathname}${query}` : "/dashboard";
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    });

    return () => {
      cancelled = true;
    };
  }, [accessToken, hasHydrated, user, pathname, router]);

  if (!hasHydrated || isCheckingSession || !user || !accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2
          className="h-6 w-6 animate-spin text-muted-foreground"
          aria-label="Checking session"
        />
      </div>
    );
  }

  return <>{children}</>;
}

export { AuthGuard };
