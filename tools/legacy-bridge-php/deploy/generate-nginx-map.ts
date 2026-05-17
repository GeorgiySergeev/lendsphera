#!/usr/bin/env tsx
/**
 * generate-nginx-map.ts
 *
 * Reads all Landings with `origin = WRAPPED_LEGACY` from the database
 * and emits a deterministic, sorted nginx `map` block that resolves
 * `$request_uri` → `$ls_landing_id`.
 *
 * Usage:
 *   pnpm --filter @workspace/api exec tsx \
 *       ../../tools/legacy-bridge-php/deploy/generate-nginx-map.ts > ls-landing-map.conf
 *
 * The output is idempotent: identical DB state always produces
 * byte-identical output (entries sorted by geo code → slug).
 *
 * Pure logic lives in ./nginx-map-builder.ts (dependency-free, tested separately).
 */

import { PrismaClient } from "@prisma/client";

import { buildNginxMapBlock } from "./nginx-map-builder";

// ── CLI entry point ────────────────────────────────────────────────

const main = async (): Promise<void> => {
  const prisma = new PrismaClient();

  try {
    const landings = await prisma.landing.findMany({
      where: {
        origin: "WRAPPED_LEGACY",
        deletedAt: null
      },
      select: {
        id: true,
        slug: true,
        legacyRef: true,
        geo: { select: { code: true } }
      },
      orderBy: [{ geo: { code: "asc" } }, { slug: "asc" }]
    });

    process.stdout.write(buildNginxMapBlock(landings));
  } finally {
    await prisma.$disconnect();
  }
};

const isDirectExecution =
  process.argv[1]?.replace(/\\/g, "/").includes("generate-nginx-map") ?? false;

if (isDirectExecution) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `[generate-nginx-map] Fatal: ${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exit(1);
  });
}
