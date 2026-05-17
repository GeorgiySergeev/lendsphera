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

| Phase | Theme                     | Steps | Exit criterion                                                                      |
| ----: | ------------------------- | :---: | ----------------------------------------------------------------------------------- |
|     0 | Foundations               |   5   | Prisma migrated, OpenAPI + TS client, Auth working, AuditLog records every mutation |
|     1 | CRM Inventory (read-only) |   5   | All legacy folders ingested as `Landing` rows, visible in `apps/web`                |
|     2 | Legacy Bridge             |   6   | Editing a price in CRM updates the running PHP landing within 30 s                  |
|     3 | Widgets & Native Runtime  |   6   | One landing rendered fully from DB by `apps/runtime`, visually parity with legacy   |
|     4 | CRM Editor & Publishing   |   6   | Marketers can build/version/publish/bulk-edit from `apps/web`                       |
|     5 | Legacy Importer (auto)    |   5   | One-click promotion of a WRAPPED landing to NATIVE via parser + LLM                 |
|     6 | i18n & AI                 |   5   | A new i18n key fans out to N locales via review queue                               |

Phases 0–2 are **production-ready prompts**. Phases 3–6 are written at the same
format but should be re-reviewed at the end of Phase 2 against real code.

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
- **Bridge** — `auto_prepend_file` PHP shim that pulls runtime-vars from API and
  rewrites `{{LS_*}}` placeholders in the legacy HTML.

## Defaults locked in

- Monorepo: pnpm + Turbo (already set).
- API style: REST + OpenAPI; generated TS client lives in `packages/api-client`.
- Auth: Auth.js in `apps/web`, JWT verified in `apps/api`.
- Multi-tenancy: single-tenant **now**, but `workspaceId` is on every row.
- LLM: provider-agnostic interface; Anthropic primary, OpenAI fallback.
- Tests: Vitest (packages), Jest (Nest), Playwright (e2e + visual).
- Deploy: self-hosted Docker, Next standalone, revalidation via webhook.
