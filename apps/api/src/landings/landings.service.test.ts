import { ConflictException } from "@nestjs/common";
import { LandingStatus, Role } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { LandingsService } from "./landings.service";

function createService(prisma: Record<string, unknown>) {
  return new LandingsService(prisma as never, {} as never, {} as never);
}

describe("LandingsService", () => {
  it("reports active name availability case-insensitively", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "landing_1" });
    const service = createService({
      landing: {
        findFirst
      }
    });

    await expect(
      service.nameAvailability({ name: " Spring Campaign " })
    ).resolves.toEqual({
      available: false,
      name: "Spring Campaign"
    });
    expect(findFirst).toHaveBeenCalledWith({
      select: { id: true },
      where: {
        deletedAt: null,
        name: { equals: "Spring Campaign", mode: "insensitive" }
      }
    });
  });

  it("reports deleted duplicate names as available", async () => {
    const service = createService({
      landing: {
        findFirst: vi.fn().mockResolvedValue(null)
      }
    });

    await expect(service.nameAvailability({ name: "Spring Campaign" })).resolves.toEqual({
      available: true,
      name: "Spring Campaign"
    });
  });

  it("suggests public ids from GEO, category, variant, and existing suffixes", async () => {
    const service = createService({
      category: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ slug: "diabetes-care" })
      },
      geo: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ code: "US" })
      },
      landing: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { publicId: "us-diabetes-care-form-1" },
            { publicId: "us-diabetes-care-form-4" },
            { publicId: "us-diabetes-care-form-copy" }
          ])
      },
      variant: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ slug: "form" })
      }
    });

    await expect(
      service.publicIdSuggestion({
        categoryId: "category_1",
        geoId: "geo_us",
        variantId: "variant_1"
      })
    ).resolves.toEqual({
      base: "us-diabetes-care-form",
      nextNumber: 5,
      publicId: "us-diabetes-care-form-5"
    });
  });

  it("rejects create when active name is already used", async () => {
    const service = createService({
      landing: {
        create: vi.fn(),
        findFirst: vi.fn().mockResolvedValue({ id: "landing_1" })
      }
    });

    await expect(
      service.create(
        {
          categoryId: "category_1",
          geoId: "geo_us",
          name: "Spring Campaign",
          slug: "spring-campaign",
          variantId: "variant_1"
        },
        { email: "owner@example.test", id: "user_1", role: Role.OWNER }
      )
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("creates draft landings with required relations", async () => {
    const created = { id: "landing_1", status: LandingStatus.DRAFT };
    const create = vi.fn().mockResolvedValue(created);
    const service = createService({
      landing: {
        create,
        findFirst: vi.fn().mockResolvedValue(null)
      }
    });

    await expect(
      service.create(
        {
          categoryId: "category_1",
          geoId: "geo_us",
          name: " Spring Campaign ",
          publicId: "us-diabetes-form-1",
          slug: "us-diabetes-form-1",
          status: LandingStatus.DRAFT,
          templateId: "template_1",
          variantId: "variant_1"
        },
        { email: "owner@example.test", id: "user_1", role: Role.OWNER }
      )
    ).resolves.toEqual(created);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          categoryId: "category_1",
          geoId: "geo_us",
          name: "Spring Campaign",
          ownerId: "user_1",
          publicId: "us-diabetes-form-1",
          slug: "us-diabetes-form-1",
          status: LandingStatus.DRAFT,
          templateId: "template_1",
          variantId: "variant_1"
        })
      })
    );
  });

  it("filters landings by multiple GEO ids or codes", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const service = createService({
      $transaction: vi.fn(async (queries: Promise<unknown>[]) => Promise.all(queries)),
      landing: {
        count,
        findMany
      }
    });

    await service.list({
      geo: "US, geo_de ",
      limit: 20,
      page: 1
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          geo: {
            OR: [
              { id: { in: ["US", "geo_de"] } },
              { code: { in: ["US", "geo_de"], mode: "insensitive" } }
            ]
          }
        })
      })
    );
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          geo: expect.any(Object)
        })
      })
    );
  });

  it("duplicates a landing into the requested GEO", async () => {
    const source = {
      categoryId: "category_1",
      currentVersion: null,
      geoId: "geo_us",
      id: "landing_1",
      name: "Spring Campaign",
      notes: null,
      pixels: null,
      postbacks: null,
      publicId: "spring-us",
      seoMeta: null,
      settings: null,
      slug: "spring-campaign",
      tags: [],
      templateId: "template_1",
      variantId: "variant_1",
      versions: []
    };
    const copied = { id: "landing_2" };
    const tx = {
      landing: {
        create: vi.fn().mockResolvedValue(copied),
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValueOnce(source)
          .mockResolvedValueOnce(copied),
        update: vi.fn()
      },
      version: {
        create: vi.fn()
      }
    };
    const service = createService({
      $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) =>
        callback(tx)
      )
    });

    await service.duplicate(
      "landing_1",
      { geoId: "geo_de" },
      { email: "owner@example.test", id: "user_1", role: Role.OWNER }
    );

    expect(tx.landing.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          geoId: "geo_de",
          status: LandingStatus.DRAFT
        })
      })
    );
  });

  it("bulk-updates selected landing statuses", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 2 });
    const service = createService({
      landing: {
        updateMany
      }
    });

    const result = await service.bulkUpdateStatus({
      ids: ["landing_1", "landing_2"],
      status: LandingStatus.PUBLISHED
    });

    expect(result).toEqual({ count: 2 });
    expect(updateMany).toHaveBeenCalledWith({
      data: { status: LandingStatus.PUBLISHED },
      where: {
        deletedAt: null,
        id: { in: ["landing_1", "landing_2"] }
      }
    });
  });

  it("bulk soft-deletes selected landings", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 3 });
    const service = createService({
      landing: {
        updateMany
      }
    });

    const result = await service.bulkSoftDelete({
      ids: ["landing_1", "landing_2", "landing_3"]
    });

    expect(result).toEqual({ count: 3 });
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { deletedAt: expect.any(Date) },
        where: {
          deletedAt: null,
          id: { in: ["landing_1", "landing_2", "landing_3"] }
        }
      })
    );
  });
});
