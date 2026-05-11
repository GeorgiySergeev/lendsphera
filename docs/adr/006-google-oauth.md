# ADR 006 — Google OAuth + Email/Password Registration

**Date:** 2026-05-11  
**Status:** Accepted

---

## Context

The application previously supported only login for seeded users (no self-service registration). We needed to add:

1. Email/password self-registration (`POST /auth/register`).
2. Google OAuth sign-in and sign-up in a single flow.

The existing authentication architecture uses short-lived JWTs in memory (access token) and long-lived refresh tokens in HttpOnly cookies on the API origin.

---

## Decisions

### 1. Auto-linking Google to existing email/password accounts

**Decision:** When a Google OAuth login arrives for an email that already has a local (password) account, we automatically link the Google `OAuthAccount` to the existing `User` record without requiring password confirmation.

**Rationale:** Google verifies ownership of the email address during its OAuth flow. This is sufficient proof of ownership. Requiring a password confirmation would add UX friction with no meaningful security gain given that Google's verification is already trustworthy.

**Alternative considered:** Require the user to enter their existing password on the OAuth callback page before linking. Rejected — too much friction for a common case.

---

### 2. No email verification on email/password registration

**Decision:** New email/password registrations do not require email verification. The `emailVerified` field is left `null` but access to the application is granted immediately.

**Rationale:** No mailer infrastructure (SMTP / SendGrid / Resend) exists in the current stack. Adding it is a separate, significant feature. Blocking registration behind email verification without that infrastructure would stall the feature.

**Trade-off:** Users can register with emails they do not own. Acceptable risk for the current stage; email verification can be added later without schema changes (`emailVerified` column already exists).

---

### 3. Access token delivery via URL fragment after OAuth callback

**Decision:** After a successful Google OAuth callback, the API redirects to the web app with the access token in the URL fragment: `/auth/callback#accessToken=<token>`.

**Rationale:**
- URL fragments are never sent to the server by the browser (no Referer leakage, not in nginx/CDN logs).
- Simpler than an exchange-code flow (which would require an additional `/auth/exchange` endpoint and a short-lived code store).
- The access token is already short-lived (15 min) and the callback page clears the hash immediately via `history.replaceState`.

**Alternative considered:** A `/auth/exchange?code=<short-lived-code>` flow where the server issues a one-time code that the client exchanges for tokens server-side. More secure (token never in URL) but requires additional state management (Redis key). Deferred to a future hardening pass.

---

### 4. Conditional GoogleStrategy registration

**Decision:** `GoogleStrategy` is only registered in `AuthModule` when all four Google env vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `GOOGLE_OAUTH_SUCCESS_REDIRECT`) are set.

**Rationale:** Keeps local development working without Google credentials. The strategy constructor would throw on missing `clientID`/`clientSecret`, so the factory returns `null` when vars are absent. The endpoints (`GET /auth/google`, `GET /auth/google/callback`) are always registered but will return a 401 when the strategy is not active.

---

### 5. New user role for self-registered users

**Decision:** Self-registered users (both email/password and OAuth) receive the `EDITOR` role by default.

**Rationale:** `EDITOR` is the least-privileged role that still allows meaningful use of the application. No `PENDING` / `VIEWER` role exists, and introducing one would require changes to authorization guards across the codebase.

---

## Consequences

- `OAuthAccount` table stores per-provider credentials, enabling future addition of GitHub, Microsoft, etc. with no schema changes to `User`.
- `passwordHash` remains nullable — OAuth-only users have `null` here.
- `emailVerified` is set to `now()` for OAuth users (Google has already verified), remains `null` for email/password users.
- Future work: email verification for email/password users, password-set flow for OAuth-only users, account merge UI.
