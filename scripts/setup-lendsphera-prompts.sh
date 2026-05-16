#!/usr/bin/env bash
# scripts/setup-lendsphera-prompts.sh
# Scaffolds docs/prompts/** for the Lendsphera implementation plan.
# Idempotent: re-running overwrites files with the canonical content.

set -euo pipefail

ROOT="docs/prompts"
mkdir -p "$ROOT"/{phase-0-foundations,phase-1-inventory,phase-2-legacy-bridge,phase-3-widgets-runtime,phase-4-editor-publishing,phase-5-legacy-importer,phase-6-i18n-ai}

# ---------- ROOT ----------

cat > "$ROOT/README.md" <<'PROMPT_EOF'
# Lendsphera — Implementation Plan

Brownfield extension of the existing `lendsphera` monorepo (Next.js + NestJS +
Prisma + Vite widgets + MinIO/Postgres/Redis). Goal: replace the
`landing-legacy-2` PHP fleet with a CRM-driven landing platform, **without
breaking running traffic**, by stepping through three landing origins:

  WRAPPED_LEGACY → IMPORTED_LEGACY → NATIVE

## How to use this folder

Each step is a self-contained Markdown prompt designed to be fed to Cursor /
Claude Code / Copilot Workspace **one at a time**. Prompts follow the format
defined in `_conventions.md`. Do **not** skip Phase 0 — every later phase
depends on its types and schema.

## Phases

| Phase | Theme                         | Steps | Exit criterion |
|------:|-------------------------------|:-----:|----------------|
| 0     | Foundations                   |   5   | Prisma migrated, OpenAPI + TS client, Auth working, AuditLog records every mutation |
| 1     | CRM Inventory (read-only)     |   5   | All legacy folders ingested as `Landing` rows, visible in `apps/web` |
| 2     | Legacy Bridge                 |   6   | Editing a price in CRM updates the running PHP landing within 30 s |
| 3     | Widgets & Native Runtime      |   6   | One landing rendered fully from DB by `apps/runtime`, visually parity with legacy |
| 4     | CRM Editor & Publishing       |   6   | Marketers can build/version/publish/bulk-edit from `apps/web` |
| 5     | Legacy Importer (auto)        |   5   | One-click promotion of a WRAPPED landing to NATIVE via parser + LLM |
| 6     | i18n & AI                     |   5   | A new i18n key fans out to N locales via review queue |

Phases 0–2 are **production-ready prompts**. Phases 3–6 are written at the
same format but should be re-reviewed at the end of Phase 2 against real code.

## Domain glossary

- **Product** — sellable item (Xenoprost, EnnecoPro). One image, one claims set.
- **Geo** — ISO 3166-1 alpha-2 code + language/currency/legal profile.
- **Price** — `(product, geo, validFrom, validTo, price, oldPrice, currency)`.
  Append-only; the **active** price wins at resolve time.
- **Template** — layout kind (`wheel`, `article`, `form-with-photo`). Maps to
  React widgets in `packages/widgets`.
- **Landing** — `(geo, product, template, overrides, pixelKey, origin, status)`.
- **LandingVersion** — immutable snapshot of resolved context published at T.
- **Origin** — `NATIVE` | `IMPORTED_LEGACY` | `WRAPPED_LEGACY`.
- **Bridge** — `auto_prepend_file` PHP shim that pulls runtime-vars from API
  and rewrites `{{LS_*}}` placeholders in the legacy HTML.

## Defaults locked in

- Monorepo: pnpm + Turbo (already set).
- API style: REST + OpenAPI; generated TS client lives in `packages/api-client`.
- Auth: Auth.js in `apps/web`, JWT verified in `apps/api`.
- Multi-tenancy: single-tenant **now**, but `workspaceId` is on every row.
- LLM: provider-agnostic interface; Anthropic primary, OpenAI fallback.
- Tests: Vitest (packages), Jest (Nest), Playwright (e2e + visual).
- Deploy: self-hosted Docker, Next standalone, revalidation via webhook.
PROMPT_EOF

cat > "$ROOT/_conventions.md" <<'PROMPT_EOF'
# Shared conventions for every prompt

Every step in `docs/prompts/**` is meant to be fed into an IDE agent (Cursor,
VSCode + Continue, Claude Code). All prompts share this contract.

## Prompt template

    # Phase X · Step Y — <Title>

    ## Context
    Why this step exists, what already exists in the repo.

    ## Goal
    Single sentence stating the outcome.

    ## Inputs
    Files / endpoints / decisions the agent must read before coding.

    ## Files to create or modify
    Bulleted, with intended responsibility per file.

    ## Acceptance criteria
    Concrete, testable bullets. Each one must be verifiable.

    ## Out of scope
    What the agent must NOT touch in this step.

    ## Verification
    Exact shell commands that must pass.

## Hard rules (apply to every step)

1. **No silent schema drift.** Any DB change → a Prisma migration + a seed
   update + a regenerated `packages/api-client`.
2. **Every mutating endpoint emits an `AuditLog` entry** (see Phase 0.5).
3. **Every list endpoint is paginated** (`?take=` + cursor).
4. **No `any`.** Use generated types from `packages/types` / `api-client`.
5. **Server is source of truth.** Never put price math in `apps/web`.
6. **`workspaceId` is required on every domain table and every query.**
7. **Legacy folders are read-only.** The agent must never edit
   `landing-legacy-2/**` files. Bridge changes go through the migration script
   in step 2.3 only.
8. **Tests are part of done.** A step without passing tests is not merged.
9. **Conventional commits**: `feat(api): ...`, `feat(web): ...`, `chore(prisma): ...`.
10. **Each step = one PR.** PR title = step heading.

## Test layering

| Layer        | Tool                    | Where                                  |
|--------------|-------------------------|----------------------------------------|
| Unit         | Vitest / Jest           | colocated `*.spec.ts`                  |
| Integration  | Jest + Testcontainers   | `apps/api/test/integration/`           |
| E2E          | Playwright              | `tests/e2e/` (already exists)          |
| Visual       | Playwright screenshots  | `packages/widgets/tests/visual/`       |
PROMPT_EOF

# ---------- PHASE 0 ----------

cat > "$ROOT/phase-0-foundations/0.1-prisma-domain-model.md" <<'PROMPT_EOF'
# Phase 0 · Step 1 — Prisma domain model

## Context
`apps/api` already has a Nest scaffold with Prisma. We need the canonical
domain model so every later step has a stable schema.

## Goal
Land the full Prisma schema for Workspace, User, Product, Geo, Price, Template,
Landing, LandingVersion, I18nString, Asset, AuditLog — plus seed data derived
from the legacy `common/products/` directory and a curated GEO list.

## Inputs
- `apps/api/prisma/schema.prisma` (current)
- `landing-legacy-2/common/products/` (image filenames → product slugs)
- `landing-legacy-2/lander/` (top-level country folders → seed GEOs)

## Files to create or modify
- `apps/api/prisma/schema.prisma` — add models: `Workspace`, `User`,
  `Membership` (role enum), `Product`, `Geo`, `Price`, `Template`, `Landing`,
  `LandingVersion`, `LandingStatus` enum, `LandingOrigin` enum, `I18nString`,
  `Asset`, `AuditLog`.
- `apps/api/prisma/migrations/<ts>_init_domain/` — generated migration.
- `apps/api/prisma/seed.ts` — seed one Workspace, admin User, the 80+ Geos
  from a hard-coded list, and Products derived from the legacy image folder.
- `apps/api/package.json` — `"prisma": { "seed": "tsx prisma/seed.ts" }`.
- `apps/api/src/prisma/prisma.service.ts` — ensure soft shutdown hooks.

## Acceptance criteria
- `pnpm --filter @lendsphera/api prisma migrate dev` succeeds on a fresh DB.
- `pnpm --filter @lendsphera/api prisma db seed` produces:
  - 1 Workspace `default`
  - 1 User `owner@lendsphera.local` with role `OWNER`
  - ≥ 30 Geo rows (all unique 2-letter codes, with `lang`, `currency`, `dir`)
  - ≥ 1 Product per filename in `landing-legacy-2/common/products/`
- All domain tables include `workspaceId` (FK) + `createdAt` + `updatedAt`.
- `Price` has composite index `(productId, geoCode, validFrom)` and unique
  constraint preventing overlap on `(productId, geoCode, validFrom)`.
- `Landing` has `@@unique([workspaceId, geoCode, slug])`.
- `LandingVersion.snapshot` is `Json` and required.
- Enum values match exactly: `LandingStatus = DRAFT|REVIEW|PUBLISHED|ARCHIVED`,
  `LandingOrigin = NATIVE|IMPORTED_LEGACY|WRAPPED_LEGACY`,
  `Role = OWNER|ADMIN|EDITOR|TRANSLATOR|VIEWER`.

## Out of scope
- API endpoints (Phase 1).
- Auth wiring (Step 0.4).

## Verification
    pnpm --filter @lendsphera/api prisma migrate reset --force
    pnpm --filter @lendsphera/api prisma db seed
    pnpm --filter @lendsphera/api prisma validate
    pnpm --filter @lendsphera/api test -- prisma
PROMPT_EOF

cat > "$ROOT/phase-0-foundations/0.2-shared-types-package.md" <<'PROMPT_EOF'
# Phase 0 · Step 2 — Shared types package

## Context
`packages/types` exists but is mostly empty. We need a single source of TS
types consumed by `apps/web`, `apps/api`, `apps/runtime`, and
`packages/widgets`.

## Goal
Expose hand-written domain types (not derived from Prisma) that represent
**API contract** types, not DB types. Prisma stays internal to `apps/api`.

## Files to create or modify
- `packages/types/src/index.ts` — re-exports.
- `packages/types/src/landing.ts` — `LandingContext`, `LandingOverrides`,
  `ResolvedPrice`, `LandingStatus`, `LandingOrigin`.
- `packages/types/src/widget.ts` — `WidgetSpec`, `WidgetKind`, `WidgetProps`.
- `packages/types/src/price.ts` — `PriceInput`, `PriceResolveResult`.
- `packages/types/src/i18n.ts` — `I18nDict`, `LangCode`.
- `packages/types/src/runtime-vars.ts` — payload returned by the legacy bridge
  endpoint (`/v1/landings/:id/runtime-vars`).
- `packages/types/tsup.config.ts` — dual ESM/CJS build, `dts: true`.
- `packages/types/package.json` — `"exports"` map with `types` first.

## Acceptance criteria
- `LandingContext` is the **merge result** of: global → geo → product → active
  price → i18n dict → landing.overrides. It is the single payload the resolver
  emits and `apps/runtime` consumes.
- `WidgetSpec` is `{ id: string; kind: WidgetKind; props: Record<string, unknown> }`
  with kind-discriminated narrowing helpers exported.
- `RuntimeVars` (the PHP bridge payload) is a flat string→string map plus
  `landingId`, `version`, `cachedUntil` (ISO).
- `tsc --noEmit` passes for every workspace that imports `@lendsphera/types`.
- `pnpm --filter @lendsphera/types build` produces both `dist/index.js` and
  `dist/index.d.ts`.

## Out of scope
- Implementations / resolvers (Phase 3.3).
- React components (Phase 3.1).

## Verification
    pnpm --filter @lendsphera/types build
    pnpm -r typecheck
PROMPT_EOF

cat > "$ROOT/phase-0-foundations/0.3-openapi-and-client.md" <<'PROMPT_EOF'
# Phase 0 · Step 3 — OpenAPI generation & typed client

## Context
We chose REST + OpenAPI so the PHP bridge can integrate cleanly. We need
the spec generated **from Nest decorators**, plus a typed TS client used by
`apps/web` and `apps/runtime`.

## Goal
Auto-publish an OpenAPI 3.1 doc from `apps/api`, and a `@lendsphera/api-client`
package that wraps it with typed methods.

## Files to create or modify
- `apps/api/src/main.ts` — wire `@nestjs/swagger`, expose `/v1/openapi.json`
  and Swagger UI at `/v1/docs` (gated by `NODE_ENV !== 'production'` or auth).
- `apps/api/src/openapi.ts` — `buildOpenApiDocument(app)` helper.
- `apps/api/scripts/export-openapi.ts` — CLI that boots Nest in
  application-context mode and writes `openapi/openapi.json` to repo root.
- `packages/api-client/` — new package (`@lendsphera/api-client`):
  - `package.json`
  - `openapi-ts.config.ts` (use `@hey-api/openapi-ts` against
    `../../openapi/openapi.json`)
  - `src/index.ts` re-exports
  - `tsup.config.ts`
- Root `package.json` — `"openapi:export": "pnpm --filter @lendsphera/api exec
  tsx scripts/export-openapi.ts && pnpm --filter @lendsphera/api-client generate"`.
- `turbo.json` — wire `openapi:export` as a topological pre-build for `web`
  and `runtime`.

## Acceptance criteria
- `pnpm openapi:export` writes `openapi/openapi.json` and regenerates
  `packages/api-client/src/generated/`.
- `apps/web` imports `import { client } from '@lendsphera/api-client'`
  with full type narrowing.
- CI step `pnpm openapi:check` fails if the generated client is stale.
- Swagger UI loads at `http://localhost:3001/v1/docs` in dev.

## Out of scope
- Real endpoints — there will be only a `/v1/health` route at this point.
- Auth headers on the client (Step 0.4).

## Verification
    pnpm openapi:export
    pnpm -r typecheck
    pnpm --filter @lendsphera/api test -- openapi
PROMPT_EOF

cat > "$ROOT/phase-0-foundations/0.4-auth-and-rbac.md" <<'PROMPT_EOF'
# Phase 0 · Step 4 — Auth & RBAC

## Context
Marketers, translators, admins all share the CRM. We need authentication in
`apps/web` (Auth.js) and JWT verification in `apps/api`, with role checks.

## Goal
End-to-end auth: a user can sign in to `apps/web`, the session yields a JWT
acceptable to `apps/api`, and Nest guards enforce roles per route.

## Files to create or modify
- `apps/web/src/app/api/auth/[...nextauth]/route.ts` — Auth.js config with
  Credentials provider (email + password against API) and JWT strategy.
- `apps/web/src/lib/auth.ts` — server helper `getCurrentUser()`.
- `apps/web/src/middleware.ts` — protect `/app/**` routes.
- `apps/api/src/auth/` — module:
  - `auth.module.ts`, `auth.service.ts`, `auth.controller.ts`
    (`POST /v1/auth/login`, `POST /v1/auth/refresh`, `GET /v1/me`)
  - `jwt.strategy.ts` (Passport JWT) — verifies HS256 with `JWT_SECRET`.
  - `roles.decorator.ts` — `@Roles('ADMIN','EDITOR')`.
  - `roles.guard.ts` — reads `Membership.role` from DB by `userId+workspaceId`.
- `apps/api/src/auth/auth.spec.ts` — happy + 401 + 403 cases.
- `packages/api-client/src/lib/auth-fetch.ts` — fetch wrapper that injects
  bearer + handles 401 → refresh.

## Acceptance criteria
- `POST /v1/auth/login` with seeded `owner@lendsphera.local` returns
  `{ accessToken, refreshToken, user }`.
- `GET /v1/me` returns 401 without token, 200 with valid token.
- A controller decorated `@Roles('OWNER')` returns 403 for `EDITOR` user.
- Auth.js session in `apps/web` carries `accessToken`; `client` uses it.
- All tokens carry `workspaceId` claim; `RolesGuard` rejects mismatched WS.

## Out of scope
- SSO / OAuth providers.
- Password reset emails.

## Verification
    pnpm --filter @lendsphera/api test auth
    pnpm --filter @lendsphera/web test -- middleware
    pnpm test:e2e -- auth.spec.ts
PROMPT_EOF

cat > "$ROOT/phase-0-foundations/0.5-audit-log.md" <<'PROMPT_EOF'
# Phase 0 · Step 5 — Audit log

## Context
Compliance requires every mutation to be attributable. We need a transparent
mechanism so future code doesn't have to remember to log.

## Goal
A Nest interceptor + Prisma extension that records every successful write
(`POST`/`PATCH`/`DELETE`) to `AuditLog` with `{ actor, action, entity, entityId,
diff }`.

## Files to create or modify
- `apps/api/src/audit/audit.module.ts`
- `apps/api/src/audit/audit.interceptor.ts` — wraps controllers, captures
  request method, route, params, response body; computes diff for PATCHes by
  comparing pre/post snapshot loaded via Prisma extension.
- `apps/api/src/audit/audit.service.ts` — `record(entry)` with batching.
- `apps/api/src/audit/audit.controller.ts` — `GET /v1/audit?entity=&entityId=`
  (paginated, ADMIN+).
- `apps/api/src/prisma/audit-extension.ts` — Prisma `$extends` that, for the
  configured models, fetches the "before" row inside the same transaction.
- `apps/api/src/app.module.ts` — register interceptor globally.

## Acceptance criteria
- Updating any tracked entity creates an `AuditLog` row with non-empty `diff`.
- Failed requests (>=400) do **not** create audit rows.
- `GET /v1/audit?entity=Price&entityId=xxx` returns chronological history.
- Interceptor adds <5 ms p50 overhead in load test (`autocannon` 100 req/s).
- Diff is a JSON-Patch (RFC 6902) array, not a free-form blob.

## Out of scope
- UI for audit log (later in Phase 4).
- Tamper-evidence / hash chains.

## Verification
    pnpm --filter @lendsphera/api test audit
    pnpm --filter @lendsphera/api test:integration audit
PROMPT_EOF

# ---------- PHASE 1 ----------

cat > "$ROOT/phase-1-inventory/1.1-products-api.md" <<'PROMPT_EOF'
# Phase 1 · Step 1 — Products API

## Context
First real resource. We need CRUD that establishes the patterns (DTO,
validation, pagination, auditing) that all later resources will copy.

## Goal
A complete `Product` resource: CRUD endpoints, DTOs, validation, pagination,
audit-aware, plus contract tests.

## Files to create or modify
- `apps/api/src/products/products.module.ts`
- `apps/api/src/products/products.controller.ts` — routes:
  - `GET    /v1/products` (cursor pagination, filter `category`, `q`)
  - `GET    /v1/products/:id`
  - `POST   /v1/products`              (ADMIN+)
  - `PATCH  /v1/products/:id`          (ADMIN+)
  - `DELETE /v1/products/:id`          (ADMIN+, soft delete via `archivedAt`)
- `apps/api/src/products/products.service.ts`
- `apps/api/src/products/dto/*.ts` — `CreateProductDto`, `UpdateProductDto`,
  `ListProductsQueryDto` (use `class-validator`, decorated for Swagger).
- `apps/api/test/products.e2e-spec.ts`
- Regenerate OpenAPI + client (`pnpm openapi:export`).

## Acceptance criteria
- All routes return validation errors as RFC 7807 `application/problem+json`.
- Pagination contract: `{ items, nextCursor }`; `take` default 50, max 200.
- Soft delete: `DELETE` sets `archivedAt`, `GET` list excludes archived
  unless `?includeArchived=true`.
- Creating a Product writes an `AuditLog` row (action `product.create`).
- E2E: full CRUD cycle including pagination + role denial.
- Generated client exposes `client.products.list({ category })` etc.

## Out of scope
- UI (Step 1.5).
- Asset linking (later in Phase 5.4).

## Verification
    pnpm --filter @lendsphera/api test products
    pnpm --filter @lendsphera/api test:e2e products
    pnpm openapi:export && pnpm -r typecheck
PROMPT_EOF

cat > "$ROOT/phase-1-inventory/1.2-geos-and-prices-api.md" <<'PROMPT_EOF'
# Phase 1 · Step 2 — Geos + Prices API

## Context
Prices are append-only with validity intervals. This is where the **"change X
everywhere"** primitive lives.

## Goal
Read-only Geo endpoints, plus a Pricing module that supports creating new
price periods, resolving the **active** price for `(product, geo, at)`,
and listing price history.

## Files to create or modify
- `apps/api/src/geos/geos.controller.ts` — `GET /v1/geos`, `GET /v1/geos/:code`.
- `apps/api/src/pricing/pricing.module.ts`
- `apps/api/src/pricing/pricing.controller.ts`:
  - `GET  /v1/prices?productId=&geoCode=&at=`  → resolved active price
  - `GET  /v1/products/:id/prices?geoCode=`     → history
  - `POST /v1/products/:id/prices`              → new price period
  - `POST /v1/pricing/bulk`                     → bulk apply (e.g. +10% per geo)
- `apps/api/src/pricing/pricing.service.ts` — pure resolver:
  - `resolveActive(productId, geoCode, at)` picks max `validFrom` where
    `validFrom <= at` AND (`validTo` is null OR `validTo > at`).
  - `createPeriod(...)` closes the previous open period by setting its
    `validTo` to the new `validFrom`.
- `apps/api/src/pricing/pricing.service.spec.ts` — table-driven tests for the
  overlap/close logic, including idempotency.

## Acceptance criteria
- `POST /v1/products/:id/prices` is **idempotent** on
  `(productId, geoCode, validFrom, price, oldPrice, currency)`.
- Creating a new period auto-closes the prior open one in a single transaction.
- `GET /v1/prices?at=` accepts an ISO date; defaults to `now`.
- Bulk endpoint accepts `{ productIds[], geoCodes[], operation: 'set'|'percent',
  value, validFrom }` and is atomic (all-or-none).
- Every write produces an audit entry (`price.create`, `price.bulk`).
- 100% branch coverage on `pricing.service.ts`.

## Out of scope
- UI matrix (Step 4.5).
- Propagation to legacy (Phase 2.5).

## Verification
    pnpm --filter @lendsphera/api test pricing
    pnpm --filter @lendsphera/api test:e2e pricing
PROMPT_EOF

cat > "$ROOT/phase-1-inventory/1.3-landings-api.md" <<'PROMPT_EOF'
# Phase 1 · Step 3 — Landings API

## Context
Landing is the central entity that ties product + geo + template + overrides.
We also stub the resolver that will be fleshed out in Phase 3.3.

## Goal
CRUD for `Landing` and `LandingVersion`, plus a `GET /v1/landings/:id/context`
endpoint that returns a fully-merged `LandingContext`.

## Files to create or modify
- `apps/api/src/landings/landings.module.ts`
- `apps/api/src/landings/landings.controller.ts`:
  - `GET    /v1/landings` (filters: `geoCode`, `productId`, `status`, `origin`, `q`)
  - `GET    /v1/landings/:id`
  - `POST   /v1/landings`
  - `PATCH  /v1/landings/:id` (status transitions guarded; see allowed graph)
  - `GET    /v1/landings/:id/context`
  - `GET    /v1/landings/:id/versions`
- `apps/api/src/landings/landings.service.ts` — status transitions:
  DRAFT→REVIEW→PUBLISHED→ARCHIVED, with DRAFT↔REVIEW free, only ADMIN+ can
  PUBLISH or ARCHIVE.
- `apps/api/src/landings/landing-context.resolver.ts` — **stub** that returns
  product, geo, active price, overrides merged. Phase 3.3 expands it.
- `apps/api/src/landings/dto/*.ts`
- `apps/api/test/landings.e2e-spec.ts`

## Acceptance criteria
- Cannot PUBLISH without a `templateId` set.
- Cannot create two Landings with the same `(workspaceId, geoCode, slug)`.
- `GET /v1/landings/:id/context` returns a `LandingContext` typed identically
  to `packages/types/src/landing.ts`.
- Each PATCH that changes `status` writes an audit entry with the old/new.
- E2E test: create → patch → publish → version row created.

## Out of scope
- Real rendering (Phase 3.4).
- Editor UI (Phase 4.1).

## Verification
    pnpm --filter @lendsphera/api test landings
    pnpm --filter @lendsphera/api test:e2e landings
PROMPT_EOF

cat > "$ROOT/phase-1-inventory/1.4-legacy-inventory-importer.md" <<'PROMPT_EOF'
# Phase 1 · Step 4 — Legacy inventory importer

## Context
We have ~80 country folders × N landings already running on PHP. We must
ingest them as `Landing` rows with `origin = WRAPPED_LEGACY` **without
touching the files**.

## Goal
A standalone Node script that walks `landing-legacy-2/lander/**` and creates
matching DB rows (Product if missing, Landing with `legacyRef`, default Price
if not present).

## Files to create or modify
- `apps/api/scripts/import-legacy-inventory.ts` — CLI:
  - `--root` path to legacy repo (default `../landing-legacy-2`)
  - `--dry-run` prints intended writes
  - `--workspace <slug>` (defaults to `default`)
- `apps/api/src/legacy/legacy-scan.service.ts` — deterministic, no LLM:
  - Walks `lander/<GEO>/<vertical>/<slug>/`.
  - Extracts product hints from folder name + image filenames in `files/`.
  - Heuristic price extraction: regex over `index.php` for currency/decimal
    patterns; records the first match as a **candidate**.
- `apps/api/src/legacy/legacy-scan.service.spec.ts` — golden tests against
  3-5 anonymized fixture folders checked into `apps/api/test/fixtures/legacy/`.
- `apps/api/src/legacy/legacy.controller.ts` — `POST /v1/legacy/scan`
  (ADMIN+, dry-run-only via API; persistent write only via CLI).

## Acceptance criteria
- Re-running the importer is idempotent (matched by `legacyRef` path).
- A landing with no detectable product is created with
  `productId = null` and flagged `needsReview = true`.
- The script prints a summary: `{ landings: N, products: M, prices: K,
  needsReview: R }` and exits non-zero if `R > threshold` unless `--allow-skips`.
- Each created Landing has `origin = WRAPPED_LEGACY` and `legacyRef` set to
  the relative folder path.
- Audit log records `legacy.import` with the source path.

## Out of scope
- Parsing HTML structure into widgets (Phase 5).
- Editing the PHP files (Phase 2.3).

## Verification
    pnpm --filter @lendsphera/api exec tsx scripts/import-legacy-inventory.ts \
        --root ../landing-legacy-2 --dry-run
    pnpm --filter @lendsphera/api test legacy-scan
PROMPT_EOF

cat > "$ROOT/phase-1-inventory/1.5-readonly-crm-ui.md" <<'PROMPT_EOF'
# Phase 1 · Step 5 — Read-only CRM UI

## Context
Team needs to *see* the inventory immediately, even before they can edit it.

## Goal
Three pages in `apps/web` — Products list, Prices viewer, Landings list —
fully read-only, backed by `@lendsphera/api-client`, paginated and filterable.

## Files to create or modify
- `apps/web/src/app/(app)/layout.tsx` — sidebar nav.
- `apps/web/src/app/(app)/products/page.tsx` — table with category filter.
- `apps/web/src/app/(app)/products/[id]/page.tsx` — detail incl. price history.
- `apps/web/src/app/(app)/landings/page.tsx` — filters: geo, product, status,
  origin; column `origin` rendered as badge.
- `apps/web/src/app/(app)/landings/[id]/page.tsx` — detail + raw context JSON.
- `apps/web/src/components/data-table.tsx` — generic table component using
  TanStack Table (no editing yet).
- `apps/web/src/lib/api.ts` — server-side client factory.

## Acceptance criteria
- All data is fetched from the API (no mocks).
- Tables paginate using the cursor returned by the API.
- Filters are URL-state (shareable).
- WRAPPED/IMPORTED/NATIVE origins render distinct badges.
- Lighthouse a11y score ≥ 90 on each list page.

## Out of scope
- Edit forms (Phase 4).
- Live updates.

## Verification
    pnpm --filter @lendsphera/web build
    pnpm test:e2e -- inventory.spec.ts
PROMPT_EOF

# ---------- PHASE 2 ----------

cat > "$ROOT/phase-2-legacy-bridge/2.1-runtime-vars-endpoint.md" <<'PROMPT_EOF'
# Phase 2 · Step 1 — runtime-vars endpoint

## Context
The PHP bridge will hit one endpoint per request (cached). It must be fast,
cacheable, signed, and version-stamped so we can invalidate it.

## Goal
`GET /v1/landings/:id/runtime-vars` returns a flat string→string map plus
metadata, signed with an HMAC the bridge can verify.

## Files to create or modify
- `apps/api/src/landings/runtime-vars.controller.ts`
- `apps/api/src/landings/runtime-vars.service.ts`:
  - Composes vars from `LandingContextResolver` (Phase 1.3 stub) — namespace
    keys with `LS_` prefix: `LS_PRICE`, `LS_OLD_PRICE`, `LS_CURRENCY`,
    `LS_CTA`, `LS_PRODUCT_NAME`, `LS_PIXEL_ID`, etc.
  - Money values are pre-formatted using geo's locale rules (server-side).
- `apps/api/src/landings/runtime-vars.guard.ts` — verifies a shared-secret
  header `X-LS-Bridge-Key`.
- `apps/api/src/landings/runtime-vars.spec.ts`
- Add `etag` + `cache-control: public, max-age=30, stale-while-revalidate=60`.
- Generate OpenAPI; add to `packages/types/src/runtime-vars.ts`.

## Acceptance criteria
- Endpoint returns 200 with `ETag` header; second call with matching
  `If-None-Match` returns 304.
- Payload schema matches `RuntimeVars` exactly (validated by integration test).
- All numeric values are **strings, locale-formatted** (e.g. `"39,00"` for DE,
  `"39.00"` for US).
- Requests without `X-LS-Bridge-Key` or with wrong key get 401.
- p95 latency < 50 ms with warm cache (`autocannon -c 50 -d 10`).

## Out of scope
- The PHP bridge itself (Step 2.2).
- Cache invalidation (Step 2.5).

## Verification
    pnpm --filter @lendsphera/api test runtime-vars
    pnpm --filter @lendsphera/api test:integration runtime-vars
PROMPT_EOF

cat > "$ROOT/phase-2-legacy-bridge/2.2-php-bridge-package.md" <<'PROMPT_EOF'
# Phase 2 · Step 2 — PHP bridge package

## Context
A small PHP file shipped to the legacy hosts. It is the only PHP code we
*own* in the legacy fleet.

## Goal
A self-contained `lendsphera-bridge.php` that, when included before any
output, fetches runtime vars for the current landing and rewrites
`{{LS_*}}` placeholders in the response body.

## Files to create or modify
- New package `tools/legacy-bridge-php/`:
  - `src/lendsphera-bridge.php` — entry point.
  - `src/Client.php` — minimal HTTP client (curl), HMAC signing, ETag cache.
  - `src/Cache.php` — APCu primary, file fallback under `/tmp/ls-cache/`.
  - `src/Rewriter.php` — `ob_start` callback; rewrites placeholders +
    legacy "magic" strings configured in `config.php`.
  - `config.example.php` — `LS_API_URL`, `LS_BRIDGE_KEY`, `LS_LANDING_ID`,
    `LS_PLACEHOLDER_MAP`, `LS_FALLBACK_TTL`.
  - `tests/` — PHPUnit, mocked HTTP.
  - `composer.json`, `phpunit.xml`.
- `tools/legacy-bridge-php/README.md` — install + integration notes.

## Acceptance criteria
- Zero hard dependencies beyond ext-curl + ext-apcu (optional).
- If the API is unreachable, the rewriter **falls back to last known cache**
  and never blanks out the page; logs to `/var/log/lendsphera-bridge.log`.
- HMAC: `sha256(landingId + ":" + epochMinute, BRIDGE_KEY)` header
  `X-LS-Bridge-Sig`.
- Output buffering must not break already-buffered legacy code (use
  `ob_start` with `PHP_OUTPUT_HANDLER_CLEANABLE`).
- Unit tests cover: cache hit, cache miss, network failure, malformed JSON,
  placeholder absence (no-op), partial placeholder set.
- Total file size < 25 KB compiled.

## Out of scope
- Editing legacy `index.php` files (Step 2.3).
- nginx config (Step 2.4).

## Verification
    docker run --rm -v $PWD/tools/legacy-bridge-php:/app -w /app php:8.2-cli \
        bash -c "composer install && vendor/bin/phpunit"
PROMPT_EOF

cat > "$ROOT/phase-2-legacy-bridge/2.3-placeholder-migration.md" <<'PROMPT_EOF'
# Phase 2 · Step 3 — Placeholder migration script

## Context
Legacy HTML has hard-coded prices like `1.99`, `2.99`, `49,00 €`. The bridge
rewrites `{{LS_*}}` placeholders. We need a one-time, reviewable migration.

## Goal
A TypeScript CLI that takes a Landing row + the legacy folder path and writes
a **PR-ready diff** turning magic strings into `{{LS_*}}` placeholders,
backed by a manifest stored on the Landing row (`placeholderManifest`).

## Files to create or modify
- `apps/api/scripts/migrate-placeholders.ts` — CLI:
  - `--landing-id <id>` resolves the landing + price via API.
  - `--root ../landing-legacy-2` — legacy repo root.
  - `--apply` (default: dry-run; only `--apply` writes files).
- `apps/api/src/legacy/placeholder-planner.service.ts`:
  - Loads `index.php` (and other text files) for the landing.
  - Generates a candidate list of replacements with byte offsets and
    surrounding context (3 lines before/after).
  - Resolves conflicts (e.g. `1.99` appearing inside JS, inside HTML, etc.).
- `apps/api/src/legacy/placeholder-planner.spec.ts` — fixture-based.
- `apps/api/prisma/migrations/<ts>_add_placeholder_manifest/` — add
  `Landing.placeholderManifest Json?`.

## Acceptance criteria
- Dry-run prints a unified diff and a JSON manifest, exits 0.
- `--apply` writes files **only** under `landing-legacy-2/lander/<...>` for
  the targeted landing, never elsewhere.
- Re-running with `--apply` is a no-op (manifest detects already-migrated).
- For each replacement, the planner attaches `{ key, before, after, context,
  file, offset }` to the manifest.
- A unit test proves a known false-positive (e.g. CSS `1.99rem`) is **not**
  rewritten.

## Out of scope
- Running the script in production (manual, per-landing).
- Non-price placeholders (extend later).

## Verification
    pnpm --filter @lendsphera/api test placeholder
    pnpm --filter @lendsphera/api exec tsx scripts/migrate-placeholders.ts \
        --landing-id <known-id> --root ../landing-legacy-2
PROMPT_EOF

cat > "$ROOT/phase-2-legacy-bridge/2.4-nginx-auto-prepend.md" <<'PROMPT_EOF'
# Phase 2 · Step 4 — nginx auto_prepend integration

## Context
We chose nginx `auto_prepend_file` over editing every PHP file. This is the
deploy-side piece.

## Goal
Document and ship a deploy recipe that installs `lendsphera-bridge.php` into
the legacy hosts and turns it on via PHP-FPM config.

## Files to create or modify
- `tools/legacy-bridge-php/deploy/`:
  - `php.ini.snippet` — `auto_prepend_file = /opt/lendsphera/bridge/src/lendsphera-bridge.php`
  - `nginx.conf.snippet` — `fastcgi_param LS_LANDING_ID $ls_landing_id;`
    with `map $request_uri $ls_landing_id { ... }` derived from a generated
    file (see below).
  - `generate-nginx-map.ts` — reads all Landings with `origin=WRAPPED_LEGACY`
    via API and emits the `map` block (path → landingId).
  - `Dockerfile.legacy` — patched legacy image with the bridge mounted.
  - `docker-compose.legacy.yml` — overlay for the existing legacy stack.
- `tools/legacy-bridge-php/deploy/README.md` — runbook.

## Acceptance criteria
- A local `docker compose -f docker-compose.legacy.yml up` starts the patched
  legacy stack; visiting a known migrated landing shows API-driven price.
- Disabling the API (`docker stop lendsphera-api`) does **not** 500 the
  landing — the cached price stays visible.
- `generate-nginx-map.ts` is idempotent and produces a stable, sorted output.
- The integration test in `tests/e2e/legacy-bridge.spec.ts` (added in 2.6)
  passes against this stack.

## Out of scope
- Production rollout automation.
- TLS / WAF concerns.

## Verification
    pnpm --filter @lendsphera/api exec tsx \
        tools/legacy-bridge-php/deploy/generate-nginx-map.ts > /tmp/ls.map
    docker compose -f tools/legacy-bridge-php/deploy/docker-compose.legacy.yml up -d
    curl -sI http://localhost:8080/de/urology/ | grep -q '200 OK'
PROMPT_EOF

cat > "$ROOT/phase-2-legacy-bridge/2.5-cache-invalidation.md" <<'PROMPT_EOF'
# Phase 2 · Step 5 — Cache invalidation on price change

## Context
Bridge caches runtime-vars for 30 s. We want price edits to propagate in
seconds, not in 30. We achieve it with two layers: ETag bump + webhook.

## Goal
When `Price` changes, the API: (a) bumps the Landing's `version`, (b) emits a
webhook (Redis pub/sub + outbound HTTP) that legacy hosts subscribe to and
flush their APCu cache for the affected `landingId`s.

## Files to create or modify
- `apps/api/src/events/event-bus.module.ts` — wraps Redis pub/sub.
- `apps/api/src/landings/landing-events.listener.ts` — on `price.changed` →
  fetch affected landings → publish `landing.invalidated` per id.
- `apps/api/src/webhooks/webhooks.module.ts` — outbound delivery with retry
  (BullMQ).
- `apps/api/src/webhooks/webhooks.controller.ts` — `GET/POST/DELETE
  /v1/webhooks` (registry).
- `tools/legacy-bridge-php/src/Invalidator.php` — tiny HTTP endpoint
  (`/_ls/invalidate?landingId=...&sig=...`) wired into the bridge container.
- Outbound delivery uses HMAC `X-LS-Signature` (sha256 over body).
- `apps/api/test/integration/price-invalidation.spec.ts`.

## Acceptance criteria
- Editing a price for `(product, geo)` produces:
  - exactly one `price.changed` Redis event,
  - one `landing.invalidated` event per affected published landing,
  - one outbound webhook delivery per registered endpoint.
- Webhook delivery has at-least-once semantics with exponential backoff
  (`1s, 5s, 30s, 5m, 30m`) and dead-letter after 5 attempts.
- Bridge `Invalidator.php` clears APCu for the specific landingId only.
- End-to-end: API price PATCH → bridge cache cleared in < 3 s (asserted
  in integration test with mocked clock).

## Out of scope
- UI to inspect deliveries (Phase 4).
- Cross-region replication.

## Verification
    pnpm --filter @lendsphera/api test:integration price-invalidation
PROMPT_EOF

cat > "$ROOT/phase-2-legacy-bridge/2.6-e2e-price-propagation.md" <<'PROMPT_EOF'
# Phase 2 · Step 6 — E2E: change price in CRM → assert on legacy page

## Context
The whole point of Phase 2: prove that a marketer changing a price in CRM is
visible on the running PHP landing within seconds, with no deploy.

## Goal
A Playwright e2e test that orchestrates the full stack (API + bridge + legacy
nginx + Postgres + Redis), edits a price via API, and asserts the rendered
HTML at the legacy URL reflects the new value.

## Files to create or modify
- `tests/e2e/legacy-bridge.spec.ts` — the test scenario:
  1. Boot via `docker compose -f docker-compose.test.yml`.
  2. Seed a known Landing + Price.
  3. Curl the legacy URL, capture price.
  4. PATCH price via API.
  5. Poll legacy URL until new price appears or 10 s timeout.
- `docker-compose.test.yml` — full-stack overlay.
- `tests/e2e/fixtures/legacy-de-urology/` — minimal anonymized legacy folder
  (already migrated with placeholders).
- `tests/e2e/playwright.config.ts` — add a `legacy-bridge` project with the
  legacy URL.

## Acceptance criteria
- Test passes locally and in CI in < 90 s wall time.
- Test asserts both: HTML contains the new price, **and** does not contain
  the old price.
- Test runs again immediately after price revert and passes.
- A retry-on-network step is **not** allowed — flakiness is a defect.

## Out of scope
- Performance regression tests (later).

## Verification
    pnpm test:e2e -- legacy-bridge
PROMPT_EOF

# ---------- PHASE 3 ----------

cat > "$ROOT/phase-3-widgets-runtime/3.1-widget-contract.md" <<'PROMPT_EOF'
# Phase 3 · Step 1 — Widget contract and core widgets

## Context
`packages/widgets` exists (Vite). We need a real contract and the first
production-grade widgets used by both the runtime and the editor.

## Goal
Define `Widget<P>` contract, ship 5 widgets covering the most common legacy
blocks: `Hero`, `Form`, `PriceBlock`, `Wheel`, `Testimonials`.

## Files to create or modify
- `packages/widgets/src/contract.ts` — `defineWidget({ kind, schema, render,
  editor })` returning a registered widget. `schema` is a Zod schema.
- `packages/widgets/src/registry.ts` — kind → widget map; `renderTree(specs[],
  ctx)`.
- `packages/widgets/src/widgets/hero/`, `.../form/`, `.../price-block/`,
  `.../wheel/`, `.../testimonials/` — each with `index.tsx`, `props.ts`
  (Zod), `widget.css`, `widget.stories.tsx`.
- `packages/widgets/src/index.ts` — public API.
- Update `packages/types/src/widget.ts` to import the kind union from
  registry — single source of truth.

## Acceptance criteria
- A widget is invalid if its props fail Zod validation; the renderer renders
  a visible error placeholder in dev and an empty fragment in prod.
- All 5 widgets render server-side (no `window` references in module scope).
- `renderTree([...], ctx)` is referentially stable for identical input
  (memoization via stable JSON keys).
- 90 %+ statement coverage on `contract.ts` and `registry.ts`.
- Each widget exposes a static `meta` (label, icon, group) used by the editor.

## Out of scope
- The editor UI (Phase 4.1).
- Storybook visual regression (Step 3.2).

## Verification
    pnpm --filter @lendsphera/widgets test
    pnpm --filter @lendsphera/widgets build
PROMPT_EOF

cat > "$ROOT/phase-3-widgets-runtime/3.2-storybook-visual-regression.md" <<'PROMPT_EOF'
# Phase 3 · Step 2 — Storybook + visual regression

## Goal
Storybook for widgets with Playwright-based screenshot tests gating PRs.

## Files to create or modify
- `packages/widgets/.storybook/` — config (Vite framework, a11y addon).
- `packages/widgets/tests/visual/*.spec.ts` — one per widget, captures
  3 viewports × 3 prop variants.
- `packages/widgets/tests/visual/__snapshots__/` — baseline screenshots.
- `.github/workflows/visual.yml` — runs `pnpm visual` and uploads diffs.

## Acceptance criteria
- `pnpm --filter @lendsphera/widgets storybook` opens Storybook with all
  registered widgets.
- `pnpm visual` produces deterministic screenshots (fonts pinned, animations
  disabled).
- A trivial CSS change to any widget fails the visual job until the snapshot
  is updated with `pnpm visual:update`.

## Out of scope
- Cross-browser snapshots (Chromium only for now).

## Verification
    pnpm --filter @lendsphera/widgets visual
PROMPT_EOF

cat > "$ROOT/phase-3-widgets-runtime/3.3-landing-context-resolver.md" <<'PROMPT_EOF'
# Phase 3 · Step 3 — LandingContextResolver (full)

## Goal
Promote the Phase 1.3 stub to the full deterministic merge:
`global → geo → product → active price → i18n → landing.overrides`.

## Files to create or modify
- `apps/api/src/landings/landing-context.resolver.ts` — full implementation.
- `apps/api/src/landings/landing-context.resolver.spec.ts` — table tests:
  - override beats price beats geo beats product beats global;
  - missing currency falls back to geo currency;
  - missing i18n key falls back to English;
  - `at` parameter respected (historical resolution).
- `apps/api/src/landings/landing-context.types.ts` — internal helpers.

## Acceptance criteria
- Resolver is **pure** given `(landingId, at, db snapshot)` — deterministic.
- All resolver inputs come from a single transaction (no N+1; use
  `Promise.all` with `findMany` joins).
- Test matrix: ≥ 20 rows of behavior covered.
- p50 resolution time < 5 ms for a landing with 20 i18n keys (microbench).

## Verification
    pnpm --filter @lendsphera/api test landing-context
PROMPT_EOF

cat > "$ROOT/phase-3-widgets-runtime/3.4-runtime-dynamic-route.md" <<'PROMPT_EOF'
# Phase 3 · Step 4 — Runtime dynamic route

## Goal
`apps/runtime` renders `GET /<geo>/<slug>` from `LandingVersion.snapshot`
using widgets.

## Files to create or modify
- `apps/runtime/src/app/[geo]/[slug]/page.tsx` — fetch landing + version,
  call `renderTree(specs, ctx)`.
- `apps/runtime/src/app/[geo]/[slug]/head.tsx` — title, meta, pixel script
  injection from `ctx`.
- `apps/runtime/src/app/[geo]/[slug]/not-found.tsx`.
- `apps/runtime/src/lib/loader.ts` — server-only loader using the API client.
- `apps/runtime/src/middleware.ts` — handle `?preview=<token>` for drafts.

## Acceptance criteria
- Visiting `/de/urology-wheel-v1` renders the published version.
- Visiting with a valid preview token renders the latest DRAFT.
- Unknown geo+slug returns 404, not 500.
- HTML response < 50 KB gzipped for a typical landing (no client JS bundles
  for widgets that don't need them — use `'use client'` only where required).

## Verification
    pnpm --filter @lendsphera/runtime build
    pnpm test:e2e -- runtime-render.spec.ts
PROMPT_EOF

cat > "$ROOT/phase-3-widgets-runtime/3.5-isr-revalidation.md" <<'PROMPT_EOF'
# Phase 3 · Step 5 — ISR + on-publish revalidation

## Goal
Cache rendered HTML; flush exact paths on publish or price invalidation.

## Files to create or modify
- `apps/runtime/src/app/api/revalidate/route.ts` — POST endpoint with HMAC
  signature; calls `revalidatePath('/' + geo + '/' + slug)`.
- `apps/api/src/landings/publish.listener.ts` — on `landing.published` and
  `landing.invalidated`, POST to runtime revalidate URL.
- `apps/runtime/src/app/[geo]/[slug]/page.tsx` — add
  `export const revalidate = 300;`.

## Acceptance criteria
- Publishing a landing makes the next request serve fresh HTML within 1 s.
- Forging the revalidate webhook (wrong HMAC) returns 401.
- Stale cache is still served for unrelated paths (no cache stampede).

## Verification
    pnpm test:e2e -- revalidation.spec.ts
PROMPT_EOF

cat > "$ROOT/phase-3-widgets-runtime/3.6-lead-form-forwarding.md" <<'PROMPT_EOF'
# Phase 3 · Step 6 — Lead form forwarding

## Goal
Form widget submits to `apps/runtime`, which forwards to the same
`traffic-gateway` legacy uses, then redirects to the configured thank-you URL.

## Files to create or modify
- `apps/runtime/src/app/api/leads/route.ts` — POST handler, validates with
  Zod schema declared on the Form widget, forwards to `LS_TRAFFIC_GATEWAY_URL`,
  records a `Lead` row.
- `apps/api/prisma/migrations/<ts>_leads/` — `Lead` model (`id, landingId,
  geoCode, payload Json, gatewayStatus, createdAt`).
- `apps/api/src/leads/leads.module.ts` — `GET /v1/leads?landingId=` for
  the CRM later.

## Acceptance criteria
- Lead created in DB even if upstream gateway 5xxs (status `pending_retry`),
  retried by BullMQ.
- PII fields encrypted at rest (column-level via Prisma extension, key
  in env).
- E2E: submit form on a runtime landing → DB row → mocked gateway hit.

## Verification
    pnpm test:e2e -- lead-flow.spec.ts
PROMPT_EOF

# ---------- PHASE 4 ----------

cat > "$ROOT/phase-4-editor-publishing/4.1-landing-editor.md" <<'PROMPT_EOF'
# Phase 4 · Step 1 — Landing editor

## Goal
Drag-and-drop editor in `apps/web` to build a landing by composing widgets.

## Files to create or modify
- `apps/web/src/app/(app)/landings/[id]/edit/page.tsx`
- `apps/web/src/features/editor/canvas.tsx` — dnd-kit canvas.
- `apps/web/src/features/editor/widget-palette.tsx` — reads `Widget.meta` from
  `@lendsphera/widgets/registry`.
- `apps/web/src/features/editor/props-panel.tsx` — auto-form from Zod schema
  via `@autoform/zod` or similar.
- `apps/web/src/features/editor/store.ts` — Zustand store, autosave debounced.

## Acceptance criteria
- Adding/reordering/deleting widgets persists via PATCH to `/v1/landings/:id`
  (debounced 1 s).
- Props panel renders form derived from widget Zod schema; invalid input is
  blocked client-side and server-side.
- Undo/redo with 50 steps in memory.
- Editor works without internet for in-progress edits (writes queued, flushed
  on reconnect).

## Verification
    pnpm test:e2e -- editor.spec.ts
PROMPT_EOF

cat > "$ROOT/phase-4-editor-publishing/4.2-versioning-diff.md" <<'PROMPT_EOF'
# Phase 4 · Step 2 — Versioning & diff viewer

## Goal
Every publish snapshots `LandingContext` into `LandingVersion`. UI shows a
diff between any two versions.

## Files to create or modify
- `apps/api/src/landings/versions.controller.ts` — list + get + restore.
- `apps/web/src/app/(app)/landings/[id]/versions/page.tsx` — timeline.
- `apps/web/src/features/diff/json-diff.tsx` — uses `jsondiffpatch`.

## Acceptance criteria
- Restoring a version creates a new version (no destructive rollback).
- Diff highlights price changes specifically (custom formatter).
- Version list paginates and shows actor + reason.

## Verification
    pnpm --filter @lendsphera/api test versions
    pnpm test:e2e -- versions.spec.ts
PROMPT_EOF

cat > "$ROOT/phase-4-editor-publishing/4.3-preview-flow.md" <<'PROMPT_EOF'
# Phase 4 · Step 3 — Preview flow

## Goal
Editor "Preview" button opens an iframe to `apps/runtime` with a signed
preview token for the current DRAFT.

## Files to create or modify
- `apps/api/src/landings/preview.controller.ts` — `POST /v1/landings/:id/preview-token`.
- `apps/web/src/features/editor/preview-pane.tsx` — iframe + viewport toggle
  (mobile / tablet / desktop).
- `apps/runtime/src/middleware.ts` — already accepts `?preview=` from 3.4;
  verify token signature + workspace match.

## Acceptance criteria
- Preview token TTL ≤ 30 min; cannot be exchanged for a published view.
- Editing in the editor reflects in preview within 2 s of save.

## Verification
    pnpm test:e2e -- preview.spec.ts
PROMPT_EOF

cat > "$ROOT/phase-4-editor-publishing/4.4-approve-publish-workflow.md" <<'PROMPT_EOF'
# Phase 4 · Step 4 — Approve / publish workflow

## Goal
DRAFT → REVIEW → PUBLISHED with required approvals based on workspace policy.

## Files to create or modify
- `apps/api/src/landings/approvals.module.ts` — `Approval` model, endpoints
  `POST /v1/landings/:id/submit`, `/approve`, `/reject`.
- `apps/web/src/features/approvals/` — submit + review UI.
- `apps/api/src/policy/policy.service.ts` — load workspace rule
  (e.g. `requireApprovals: 1`, `roles: [ADMIN]`).

## Acceptance criteria
- Cannot publish without N approvals from required roles.
- Submitter cannot self-approve.
- Audit log records every transition.

## Verification
    pnpm --filter @lendsphera/api test approvals
    pnpm test:e2e -- publish-workflow.spec.ts
PROMPT_EOF

cat > "$ROOT/phase-4-editor-publishing/4.5-pricing-matrix.md" <<'PROMPT_EOF'
# Phase 4 · Step 5 — Pricing matrix UI

## Goal
A Product × Geo grid with inline editing, bulk operations, and validity
scheduling. This is **the** "change X everywhere" UI.

## Files to create or modify
- `apps/web/src/app/(app)/pricing/page.tsx` — grid (TanStack Table + virtualized).
- `apps/web/src/features/pricing/bulk-bar.tsx` — multi-select rows, ops:
  `set`, `percent`, `copy from geo`, `schedule for later`.
- `apps/web/src/features/pricing/diff-modal.tsx` — shows preview of what will
  change before confirming.

## Acceptance criteria
- Inline edit persists via `POST /v1/products/:id/prices` and shows
  optimistic UI with rollback on error.
- Bulk +10% on 50 cells issues exactly one API call (`/v1/pricing/bulk`).
- Scheduled prices (`validFrom > now`) render with a clock badge and apply
  automatically.
- The diff modal lists affected published landings count.

## Verification
    pnpm test:e2e -- pricing-matrix.spec.ts
PROMPT_EOF

cat > "$ROOT/phase-4-editor-publishing/4.6-landings-bulk-grid.md" <<'PROMPT_EOF'
# Phase 4 · Step 6 — Landings bulk operations grid

## Goal
Power-user grid to bulk-publish, bulk-pause, bulk-replace pixel, bulk-set
template across selected landings.

## Files to create or modify
- `apps/web/src/app/(app)/landings/grid/page.tsx`.
- `apps/web/src/features/landings/bulk-bar.tsx` — ops + dry-run.
- `apps/api/src/landings/bulk.controller.ts` — `POST /v1/landings/bulk` with
  `{ ids[], op, args, dryRun }`.

## Acceptance criteria
- Bulk op is transactional (all-or-none) when `dryRun=false`.
- Dry-run shows expected diff per landing without writing.
- Audit log gets one parent entry + children per landing.

## Verification
    pnpm test:e2e -- landings-bulk.spec.ts
PROMPT_EOF

# ---------- PHASE 5 ----------

cat > "$ROOT/phase-5-legacy-importer/5.1-html-parser.md" <<'PROMPT_EOF'
# Phase 5 · Step 1 — Legacy HTML parser

## Goal
Parse a legacy `index.php` into a normalized DOM-light tree we can analyze.

## Files to create or modify
- `apps/api/src/legacy-importer/parser/php-strip.ts` — removes `<?php ... ?>`
  blocks, keeps placeholder markers.
- `apps/api/src/legacy-importer/parser/dom.ts` — `parse5` wrapper returning
  our `Node` type.
- `apps/api/src/legacy-importer/parser/parser.spec.ts` — golden tests on
  fixture files.

## Acceptance criteria
- Round-trips unknown HTML losslessly to within byte-equivalent (sans the
  stripped PHP).
- Handles malformed HTML (recovers, does not throw).
- Strips inline scripts but preserves their existence as a `Script` node.

## Verification
    pnpm --filter @lendsphera/api test legacy-importer/parser
PROMPT_EOF

cat > "$ROOT/phase-5-legacy-importer/5.2-block-detection.md" <<'PROMPT_EOF'
# Phase 5 · Step 2 — Block detection heuristics

## Goal
Deterministic classifier that labels DOM subtrees as `hero`, `form`,
`price`, `testimonials`, `wheel`, `unknown`.

## Files to create or modify
- `apps/api/src/legacy-importer/detect/rules/` — one file per kind; each
  exports `score(node)` ∈ [0,1].
- `apps/api/src/legacy-importer/detect/classify.ts` — runs all rules,
  resolves overlaps.
- `apps/api/src/legacy-importer/detect/classify.spec.ts` — fixture-driven.

## Acceptance criteria
- ≥ 80% precision on the labeled fixture set (committed in
  `apps/api/test/fixtures/legacy/labeled/`).
- Output is a list of `{ nodeRef, kind, confidence }`.

## Verification
    pnpm --filter @lendsphera/api test legacy-importer/detect
PROMPT_EOF

cat > "$ROOT/phase-5-legacy-importer/5.3-llm-widget-mapping.md" <<'PROMPT_EOF'
# Phase 5 · Step 3 — LLM-assisted widget mapping

## Goal
For blocks the heuristic can't confidently classify or fill, ask the LLM
to produce a `WidgetSpec` matching the widget's Zod schema.

## Files to create or modify
- `apps/api/src/legacy-importer/map/llm-mapper.service.ts` — uses
  `@lendsphera/llm` provider (see 6.2), constructs a prompt with the widget's
  Zod schema (`zod-to-json-schema`) and the block's HTML.
- `apps/api/src/legacy-importer/map/repair.ts` — validates LLM output against
  Zod; on failure runs a single repair turn ("your output failed: <error>").
- `apps/api/src/legacy-importer/map/llm-mapper.spec.ts` — uses a recorded
  fixture provider, not a live LLM.

## Acceptance criteria
- LLM output is **always** validated against the widget's Zod schema before
  use; invalid output after repair becomes `kind: unknown` with the raw HTML
  preserved.
- Cost cap per landing (configurable, default $0.50) enforced via the
  provider's accounting.

## Verification
    pnpm --filter @lendsphera/api test legacy-importer/map
PROMPT_EOF

cat > "$ROOT/phase-5-legacy-importer/5.4-asset-uploader.md" <<'PROMPT_EOF'
# Phase 5 · Step 4 — Asset uploader

## Goal
Move per-landing images from the legacy `files/` folder into MinIO and link
them as `Asset` rows.

## Files to create or modify
- `apps/api/src/legacy-importer/assets/uploader.service.ts` — content-hashed
  uploads (`sha256` prefix in S3 key), dedup across landings.
- `apps/api/src/legacy-importer/assets/uploader.spec.ts`.
- Use `@aws-sdk/client-s3` against MinIO endpoint in compose.

## Acceptance criteria
- Same image referenced twice yields one Asset row.
- Upload streams (no full buffer in memory) — verified with a 10 MB file.
- WebP files retain mime; non-image extensions rejected with a clear error.

## Verification
    pnpm --filter @lendsphera/api test:integration legacy-importer/assets
PROMPT_EOF

cat > "$ROOT/phase-5-legacy-importer/5.5-promote-to-native.md" <<'PROMPT_EOF'
# Phase 5 · Step 5 — Promote to NATIVE

## Goal
A single CRM action that runs parser → detector → LLM mapper → asset uploader,
produces a DRAFT IMPORTED_LEGACY landing the editor can open, and when
published flips the origin to NATIVE and unwires the bridge for it.

## Files to create or modify
- `apps/api/src/legacy-importer/orchestrator.service.ts` — the pipeline.
- `apps/api/src/legacy-importer/orchestrator.controller.ts` —
  `POST /v1/legacy/landings/:id/promote` (ADMIN+).
- `apps/web/src/app/(app)/landings/[id]/promote/page.tsx` — UI with side-by-side
  preview (legacy vs candidate native).

## Acceptance criteria
- Promotion is reversible until publish (DRAFT lives alongside the WRAPPED
  one).
- On publish, the legacy nginx map (Step 2.4) regenerates and routes that path
  to the runtime instead of the legacy host.
- Promotion is idempotent.

## Verification
    pnpm test:e2e -- promote.spec.ts
PROMPT_EOF

# ---------- PHASE 6 ----------

cat > "$ROOT/phase-6-i18n-ai/6.1-i18n-editor.md" <<'PROMPT_EOF'
# Phase 6 · Step 1 — I18n editor

## Goal
Spreadsheet-style editor over `I18nString` with key namespaces and inline
context hints.

## Files to create or modify
- `apps/api/src/i18n/i18n.controller.ts` — CRUD + `GET /v1/i18n/missing?lang=`.
- `apps/web/src/app/(app)/i18n/page.tsx` — grid (key × lang).
- `apps/web/src/features/i18n/inline-edit.tsx`.

## Acceptance criteria
- Filter "missing for X lang" works.
- Key rename creates a deprecation alias entry (so old snapshots still
  resolve).

## Verification
    pnpm test:e2e -- i18n-editor.spec.ts
PROMPT_EOF

cat > "$ROOT/phase-6-i18n-ai/6.2-llm-provider-abstraction.md" <<'PROMPT_EOF'
# Phase 6 · Step 2 — LLM provider abstraction

## Goal
Single interface `LlmProvider` with Anthropic primary, OpenAI fallback,
recorded fixture provider for tests.

## Files to create or modify
- `packages/llm/src/provider.ts` — `interface LlmProvider { complete(req):
  Promise<Resp>; embed(...): ... }`.
- `packages/llm/src/anthropic.ts`, `openai.ts`, `fixture.ts`.
- `packages/llm/src/router.ts` — picks provider by env, transparent fallback
  on 5xx/timeout.
- `packages/llm/src/accounting.ts` — token/cost tracking per request.

## Acceptance criteria
- Switching provider via env requires no code change.
- Fixture provider is the default in tests; CI never calls a live LLM.
- Cost accounting matches provider invoice ±2% in a recorded test.

## Verification
    pnpm --filter @lendsphera/llm test
PROMPT_EOF

cat > "$ROOT/phase-6-i18n-ai/6.3-translation-queue.md" <<'PROMPT_EOF'
# Phase 6 · Step 3 — Translation queue

## Goal
New/changed i18n keys auto-enqueue translation jobs across configured target
languages.

## Files to create or modify
- `apps/api/src/i18n/translation-queue.module.ts` — BullMQ.
- `apps/api/src/i18n/translation.processor.ts` — fan-out per lang; uses
  `@lendsphera/llm`.
- `apps/api/src/i18n/translation.controller.ts` — `GET /v1/i18n/jobs`.

## Acceptance criteria
- Creating a new key fan-outs to N jobs in < 1 s.
- Job retries 3× on provider error; failures surface in `GET /v1/i18n/jobs`.

## Verification
    pnpm --filter @lendsphera/api test:integration translation-queue
PROMPT_EOF

cat > "$ROOT/phase-6-i18n-ai/6.4-human-review-ui.md" <<'PROMPT_EOF'
# Phase 6 · Step 4 — Human review UI

## Goal
Translators approve / edit machine translations before they go live.

## Files to create or modify
- `apps/web/src/app/(app)/i18n/review/page.tsx` — pending queue.
- `apps/web/src/features/i18n/review-pane.tsx` — source + MT + edit + approve.
- `apps/api/src/i18n/i18n-string.service.ts` — `approve`, `reject` actions
  guarded by role `TRANSLATOR` or higher.

## Acceptance criteria
- Approved translation becomes the active value; previous value kept in
  history.
- Rejecting requeues with a reason attached to the next LLM prompt.

## Verification
    pnpm test:e2e -- i18n-review.spec.ts
PROMPT_EOF

cat > "$ROOT/phase-6-i18n-ai/6.5-compliance-sweeper.md" <<'PROMPT_EOF'
# Phase 6 · Step 5 — Compliance sweeper

## Goal
A scheduled job that flags published landings violating per-geo compliance
profiles (disallowed claim phrases, missing disclaimer, etc.).

## Files to create or modify
- `apps/api/src/compliance/profile.ts` — per-geo `ComplianceProfile`
  (disallowed regex list, required keys).
- `apps/api/src/compliance/sweeper.processor.ts` — daily BullMQ job, scans
  all PUBLISHED landings, emits `ComplianceIssue` rows.
- `apps/web/src/app/(app)/compliance/page.tsx` — issue list with "Open
  landing", "Acknowledge", "Auto-fix" (where safe).

## Acceptance criteria
- Sweeper runs in < 5 min for 1k landings.
- A new disallowed phrase added to a profile retroactively flags existing
  offenders on the next sweep.
- Acknowledge is audit-logged with actor + reason.

## Verification
    pnpm --filter @lendsphera/api test:integration compliance
PROMPT_EOF

echo "✓ docs/prompts/ scaffolded (34 files)"
find "$ROOT" -type f | sort