# Legacy Bridge — Deploy Recipe

> Phase 2 · Step 4 — nginx `auto_prepend` integration

## Overview

This deploy recipe installs the Lendsphera PHP bridge into a legacy PHP-FPM
stack using nginx's `auto_prepend_file` mechanism. No legacy PHP files are
modified — the bridge is injected transparently at the PHP-FPM level.

### How it works

```text
  ┌────────────┐    ┌─────────────┐    ┌─────────────────────┐
  │   Browser   │───▶│    nginx     │───▶│     PHP-FPM         │
  │             │    │             │    │                     │
  │             │    │  map block  │    │  auto_prepend_file  │
  │             │    │  resolves   │    │  ──▶ bridge.php     │
  │             │    │  URI → ID   │    │       ↓             │
  │             │    │             │    │  fetches vars from  │
  │             │    │  passes     │    │  API (with cache)   │
  │             │    │  LS_*       │    │       ↓             │
  │             │    │  fastcgi    │    │  rewrites output    │
  │             │◀───│  params     │◀───│  buffer             │
  └────────────┘    └─────────────┘    └─────────────────────┘
                                              ↕
                                       ┌─────────────┐
                                       │ Lendsphera  │
                                       │ API         │
                                       │ /v1/landings│
                                       │ /:id/       │
                                       │ runtime-vars│
                                       └─────────────┘
```

1. **nginx** receives a request and resolves `$request_uri` → `$ls_landing_id`
   via the generated `map` block.
2. The landing ID (plus `LS_API_URL` and `LS_BRIDGE_KEY`) is passed to PHP-FPM
   as `fastcgi_param` values.
3. PHP-FPM's `auto_prepend_file` loads the bridge **before** any legacy code.
4. The bridge fetches runtime vars (prices, product names, etc.) from the API,
   caches them in APCu / `/tmp/ls-cache/`, exposes PHP variables such as
   `$PRODUCT_NAME`, `$PRODUCT_PRICE`, `$LS_PRODUCT_NAME`, and `$LS_RUNTIME_VARS`
   before `index.php` executes, then rewrites `{{LS_*}}` placeholders in the
   output buffer.
5. If the API is down, the bridge serves the last cached values — **no 500**.

## Files

| File                         | Purpose                                                     |
| ---------------------------- | ----------------------------------------------------------- |
| `php.ini.snippet`            | `auto_prepend_file` directive for PHP-FPM                   |
| `config.docker.php`          | Docker-aware `config.php` (reads `$_SERVER` from fastcgi)   |
| `nginx.conf.snippet`         | Standalone `fastcgi_param` directives (documentation)       |
| `default.conf`               | Full nginx site config used by docker-compose               |
| `generate-nginx-map.ts`      | Script: queries DB, emits `map $request_uri $ls_landing_id` |
| `generate-nginx-map.spec.ts` | Unit tests for the map generator                            |
| `Dockerfile.legacy`          | Patched PHP-FPM image with bridge installed                 |
| `docker-compose.legacy.yml`  | Overlay that starts the legacy stack                        |

## Prerequisites

- Main `docker-compose.yml` running (postgres, redis, minio)
- Lendsphera API running on `http://localhost:4000`
- At least one Landing with `origin = WRAPPED_LEGACY` in the database
- Legacy PHP app files available (or a test `docroot/`)

## Quick Start

### 1. Generate the nginx landing-ID map

```bash
# Ensure the database is populated with WRAPPED_LEGACY landings
pnpm --filter @workspace/api exec tsx \
    ../../tools/legacy-bridge-php/deploy/generate-nginx-map.ts \
    > tools/legacy-bridge-php/deploy/ls-landing-map.conf
```

The output is **idempotent** — same DB state always produces byte-identical
output.

### 2. Create a test docroot (if needed)

```bash
mkdir -p tools/legacy-bridge-php/deploy/docroot/de/urology
cat > tools/legacy-bridge-php/deploy/docroot/de/urology/index.php << 'PHP'
<?php
echo '<h1>' . $PRODUCT_NAME . '</h1>';
echo '<p>Price: ' . $PRODUCT_PRICE . ' ' . $CURRENCY . '</p>';
echo '<p>Mirror: {{LS_PRODUCT_NAME}}</p>';
echo '<p>Old price: {{LS_OLD_PRICE}}</p>';
echo '<p>Discount: {{LS_DISCOUNT}}%</p>';
PHP
```

### 3. Bring up the legacy stack

```bash
docker compose -f tools/legacy-bridge-php/deploy/docker-compose.legacy.yml up -d
```

### 4. Verify

```bash
# Should return 200 OK
curl -sI http://localhost:8082/de/urology/ | grep -q '200 OK'

# Should show API-driven prices (not placeholders)
curl -s http://localhost:8082/de/urology/ | grep -v '{{LS_'
```

### 5. Verify graceful degradation

```bash
# Stop the API
docker stop landing_builder_postgres  # or the API container

# Legacy pages should still work (cached values, no 500)
curl -sI http://localhost:8082/de/urology/ | grep -q '200 OK'
```

## Environment Variables

| Variable         | Default                                | Description                   |
| ---------------- | -------------------------------------- | ----------------------------- |
| `LS_API_URL`     | `http://host.docker.internal:4000/api` | Lendsphera API base URL       |
| `LS_BRIDGE_KEY`  | `dev-ls-bridge-key-change-me`          | Shared secret for bridge auth |
| `LEGACY_DOCROOT` | `./docroot`                            | Path to legacy PHP app files  |
| `LEGACY_PORT`    | `8082`                                 | Host port for the nginx proxy |

## Regenerating the Map

Run the generator whenever landings are added/removed:

```bash
pnpm --filter @workspace/api exec tsx \
    ../../tools/legacy-bridge-php/deploy/generate-nginx-map.ts \
    > tools/legacy-bridge-php/deploy/ls-landing-map.conf

# Reload nginx without downtime
docker exec lendsphera_legacy_nginx nginx -s reload
```

## Running Tests

```bash
# Unit tests for the map generator (from monorepo root)
pnpm vitest run tools/legacy-bridge-php/deploy/generate-nginx-map.spec.ts
```

## Production Notes

- Replace `dev-ls-bridge-key-change-me` with a strong random secret
- Use `LS_API_URL` pointing to the internal API service (not
  `host.docker.internal`)
- The `ls-landing-map.conf` should be regenerated on deploy via CI/CD
- TLS and WAF are **out of scope** for this recipe (see production rollout docs)
