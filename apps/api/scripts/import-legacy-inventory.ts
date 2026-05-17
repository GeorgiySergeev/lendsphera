import {
  AuditAction,
  LandingOrigin,
  LandingStatus,
  LegacySource,
  Prisma,
  PrismaClient
} from "@prisma/client";
import { config as loadEnv } from "dotenv";
import path from "node:path";

import { LegacyScanService } from "../src/legacy/legacy-scan.service";

type CliOptions = {
  allowSkips: boolean;
  dryRun: boolean;
  reviewThreshold: number;
  root: string;
  workspace: string;
};

type ImportSummary = {
  landings: number;
  needsReview: number;
  prices: number;
  products: number;
};

const DEFAULT_ROOT = "../landing-legacy-2";
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
loadEnv({ path: path.join(REPO_ROOT, ".env") });

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  const scanner = new LegacyScanService();

  try {
    const rootPath = path.resolve(REPO_ROOT, options.root);
    const candidates = await scanner.scan(rootPath);

    const summary: ImportSummary = {
      landings: 0,
      needsReview: 0,
      prices: 0,
      products: 0
    };

    const owner = await prisma.user.findFirst({
      where: { role: { in: ["OWNER", "ADMIN"] } },
      select: { id: true },
      orderBy: { createdAt: "asc" }
    });

    if (!owner) {
      throw new Error("No OWNER/ADMIN user found. Seed users first.");
    }

    const defaultVariant = await prisma.variant.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true }
    });

    if (!defaultVariant) {
      throw new Error("No active variant found. Seed variants first.");
    }

    for (const candidate of candidates) {
      const geo = await prisma.geo.findUnique({
        where: { code: candidate.geo },
        select: { id: true, currency: true }
      });

      if (!geo) {
        summary.needsReview += 1;
        continue;
      }

      const category = await prisma.category.findFirst({
        where: {
          slug: {
            equals: slugify(candidate.legacyRef.split("/")[2] ?? ""),
            mode: "insensitive"
          }
        },
        select: { id: true }
      });

      if (!category) {
        summary.needsReview += 1;
        continue;
      }

      const existingLanding = await prisma.landing.findUnique({
        where: { legacyRef: candidate.legacyRef },
        select: { id: true }
      });

      if (existingLanding) {
        continue;
      }

      let productId: string | null = null;

      if (candidate.productHint) {
        const productSlug = slugify(candidate.productHint);
        const existingProduct = await prisma.product.findUnique({
          where: { slug: productSlug },
          select: { id: true }
        });

        if (existingProduct) {
          productId = existingProduct.id;
        } else if (!options.dryRun) {
          const product = await prisma.product.create({
            data: {
              slug: productSlug,
              name: candidate.productHint,
              categoryId: category.id
            },
            select: { id: true }
          });
          productId = product.id;
          summary.products += 1;
        } else {
          summary.products += 1;
        }
      }

      const landingNeedsReview = !productId;
      if (landingNeedsReview) {
        summary.needsReview += 1;
      }

      if (options.dryRun) {
        summary.landings += 1;
        if (candidate.priceCandidate !== null && productId) {
          summary.prices += 1;
        }
        continue;
      }

      const landing = await prisma.landing.create({
        data: {
          name: candidate.landingName,
          slug: uniqueSlug(candidate.landingName, candidate.legacyRef),
          publicId: `legacy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
          geoId: geo.id,
          categoryId: category.id,
          variantId: defaultVariant.id,
          ownerId: owner.id,
          status: LandingStatus.DRAFT,
          origin: LandingOrigin.WRAPPED_LEGACY,
          legacyRef: candidate.legacyRef,
          needsReview: landingNeedsReview,
          productId
        },
        select: { id: true }
      });
      summary.landings += 1;

      if (candidate.priceCandidate !== null && productId) {
        const existingPrice = await prisma.price.findFirst({
          where: { geoId: geo.id, productId, validTo: null },
          select: { id: true }
        });

        if (!existingPrice) {
          await prisma.price.create({
            data: {
              productId,
              geoId: geo.id,
              currency: geo.currency,
              price: candidate.priceCandidate,
              validFrom: new Date(),
              createdBy: owner.id,
              notes: `Imported from ${candidate.legacyRef}`
            }
          });
          summary.prices += 1;
        }
      }

      await prisma.auditLog.create({
        data: {
          action: AuditAction.IMPORT,
          entity: "legacy.import",
          entityId: landing.id,
          userId: owner.id,
          diff: {
            legacyRef: candidate.legacyRef,
            sourcePath: rootPath,
            workspace: options.workspace
          }
        }
      });

      await prisma.legacyLanding.upsert({
        where: { path: candidate.legacyRef },
        update: {
          importedAsId: landing.id,
          importedAt: new Date(),
          source: LegacySource.GIT_REPO
        },
        create: {
          name: candidate.landingName,
          path: candidate.legacyRef,
          source: LegacySource.GIT_REPO,
          fileTree: Prisma.JsonNull,
          importedAsId: landing.id,
          importedAt: new Date(),
          geoHint: candidate.geo
        }
      });
    }

    console.log(JSON.stringify(summary));

    if (!options.allowSkips && summary.needsReview > options.reviewThreshold) {
      process.exit(2);
    }
  } finally {
    await prisma.$disconnect();
  }
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    allowSkips: false,
    dryRun: false,
    reviewThreshold: 0,
    root: DEFAULT_ROOT,
    workspace: "default"
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--allow-skips") {
      options.allowSkips = true;
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

    if (arg === "--workspace") {
      const value = args[i + 1];
      if (value) {
        options.workspace = value;
        i += 1;
      }
      continue;
    }

    if (arg === "--review-threshold") {
      const value = Number.parseInt(args[i + 1] ?? "0", 10);
      options.reviewThreshold = Number.isFinite(value) ? value : 0;
      i += 1;
    }
  }

  return options;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueSlug(name: string, legacyRef: string): string {
  const base = slugify(name) || "legacy-landing";
  const suffix = slugify(legacyRef).slice(-12);

  return `${base}-${suffix}`;
}

void main();
