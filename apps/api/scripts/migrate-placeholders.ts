/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import {
  PlaceholderPlannerService,
  type PriceContext
} from "../src/legacy/placeholder-planner.service";

type CliOptions = {
  apply: boolean;
  landingId: string;
  root: string;
};

const DEFAULT_ROOT = "../landing-legacy-2";
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
loadEnv({ path: path.join(REPO_ROOT, ".env") });

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.landingId) {
    console.error(
      "Usage: migrate-placeholders --landing-id <id> [--root <path>] [--apply]"
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const planner = new PlaceholderPlannerService();

  try {
    const landing = await prisma.landing.findUniqueOrThrow({
      where: { id: options.landingId },
      include: { product: true, geo: true }
    });

    if (!landing.legacyRef) {
      console.error(`Landing ${options.landingId} has no legacyRef. Cannot migrate.`);
      process.exit(1);
    }

    if (planner.isAlreadyMigrated(landing.placeholderManifest)) {
      console.log("Already migrated. Manifest exists on landing row. No-op.");
      process.exit(0);
    }

    const now = new Date();
    const activePrice = landing.productId
      ? await prisma.price.findFirst({
          where: {
            productId: landing.productId,
            geoId: landing.geoId,
            validFrom: { lte: now },
            OR: [{ validTo: null }, { validTo: { gt: now } }]
          },
          orderBy: { validFrom: "desc" }
        })
      : null;

    const prices: PriceContext = {
      price: activePrice?.price?.toString() ?? null,
      oldPrice: activePrice?.oldPrice?.toString() ?? null,
      currency: activePrice?.currency ?? null
    };

    const rootPath = path.resolve(REPO_ROOT, options.root);
    const result = await planner.plan(landing.id, landing.legacyRef, rootPath, prices);

    console.log("\n--- Placeholder Migration Plan ---");
    console.log(`Landing:   ${landing.id} (${landing.name})`);
    console.log(`LegacyRef: ${landing.legacyRef}`);
    console.log(
      `Price:     ${prices.price ?? "N/A"} | Old: ${prices.oldPrice ?? "N/A"} | Currency: ${prices.currency ?? "N/A"}`
    );
    console.log(`Entries:   ${result.manifest.entries.length}`);
    console.log(`Files:     ${result.patches.length}`);
    console.log();

    if (result.manifest.entries.length === 0) {
      console.log("No replacements found. Nothing to do.");
      process.exit(0);
    }

    for (const patch of result.patches) {
      console.log(`\n=== ${patch.file} ===`);
      printUnifiedDiff(patch.file, patch.original, patch.patched);
    }

    console.log("\n--- Manifest (JSON) ---");
    console.log(JSON.stringify(result.manifest, null, 2));

    if (!options.apply) {
      console.log("\nDry-run complete. Use --apply to write files.");
      process.exit(0);
    }

    const landerBase = path.resolve(rootPath, landing.legacyRef);

    for (const patch of result.patches) {
      const targetPath = path.resolve(landerBase, patch.file);
      const resolvedTarget = path.resolve(targetPath);

      if (!resolvedTarget.startsWith(landerBase)) {
        console.error(`Refusing to write outside landing directory: ${resolvedTarget}`);
        continue;
      }

      await writeFile(resolvedTarget, patch.patched, "utf8");
      console.log(`Written: ${resolvedTarget}`);
    }

    await prisma.landing.update({
      where: { id: landing.id },
      data: { placeholderManifest: result.manifest as object }
    });

    console.log(`\nManifest saved to Landing.placeholderManifest for ${landing.id}.`);
    console.log("Migration complete.");
  } finally {
    await prisma.$disconnect();
  }
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    apply: false,
    landingId: "",
    root: DEFAULT_ROOT
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--apply") {
      options.apply = true;
      continue;
    }

    if (arg === "--landing-id") {
      const value = args[i + 1];
      if (value) {
        options.landingId = value;
        i += 1;
      }
      continue;
    }

    if (arg === "--root") {
      const value = args[i + 1];
      if (value) {
        options.root = value;
        i += 1;
      }
      continue;
    }
  }

  return options;
}

function printUnifiedDiff(fileName: string, original: string, patched: string) {
  const oldLines = original.split("\n");
  const newLines = patched.split("\n");
  const maxLen = Math.max(oldLines.length, newLines.length);

  console.log(`--- a/${fileName}`);
  console.log(`+++ b/${fileName}`);

  let chunkStart = -1;
  let chunkOld: string[] = [];
  let chunkNew: string[] = [];

  const flushChunk = () => {
    if (chunkStart === -1) return;
    console.log(
      `@@ -${chunkStart + 1},${chunkOld.length} +${chunkStart + 1},${chunkNew.length} @@`
    );
    for (const line of chunkOld) console.log(`-${line}`);
    for (const line of chunkNew) console.log(`+${line}`);
    chunkStart = -1;
    chunkOld = [];
    chunkNew = [];
  };

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i] ?? "";
    const newLine = newLines[i] ?? "";

    if (oldLine !== newLine) {
      if (chunkStart === -1) chunkStart = i;
      chunkOld.push(oldLine);
      chunkNew.push(newLine);
    } else {
      flushChunk();
    }
  }

  flushChunk();
}

void main();
