import { ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { CategoriesService } from "../categories/categories.service";
import { GeosService } from "../geos/geos.service";
import { VariantsService } from "../variants/variants.service";

function createService<T>(
  Service: new (prisma: never) => T,
  prisma: Record<string, unknown>
) {
  return new Service(prisma as never);
}

describe("taxonomy services", () => {
  it("lists GEOs with related counts in sort order", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const service = createService(GeosService, {
      $transaction: vi.fn(async (queries: Promise<unknown>[]) => Promise.all(queries)),
      geo: { count, findMany }
    });

    await service.list({ isActive: undefined, language: undefined, limit: 20, page: 1 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { _count: { select: { landings: true, templates: true } } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
      })
    );
  });

  it("blocks category deletion when active landings are linked", async () => {
    const service = createService(CategoriesService, {
      landing: { count: vi.fn().mockResolvedValue(3) }
    });

    await expect(service.delete("category_1")).rejects.toBeInstanceOf(ConflictException);
  });

  it("allows variant deletion when no active landings are linked", async () => {
    const deleteVariant = vi.fn().mockResolvedValue({ id: "variant_1" });
    const service = createService(VariantsService, {
      landing: { count: vi.fn().mockResolvedValue(0) },
      variant: { delete: deleteVariant }
    });

    await expect(service.delete("variant_1")).resolves.toEqual({ id: "variant_1" });
    expect(deleteVariant).toHaveBeenCalledWith({ where: { id: "variant_1" } });
  });

  it("reorders GEOs with deterministic sort order", async () => {
    const update = vi.fn((args: unknown) => Promise.resolve(args));
    const service = createService(GeosService, {
      $transaction: vi.fn(async (queries: Promise<unknown>[]) => Promise.all(queries)),
      geo: { update }
    });

    await expect(service.reorder({ ids: ["geo_a", "geo_b", "geo_c"] })).resolves.toEqual({
      count: 3
    });
    expect(update).toHaveBeenNthCalledWith(1, {
      data: { sortOrder: 0 },
      where: { id: "geo_a" }
    });
    expect(update).toHaveBeenNthCalledWith(3, {
      data: { sortOrder: 20 },
      where: { id: "geo_c" }
    });
  });

  it("imports GEO rows by upserting existing codes", async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "geo_de" });
    const upsert = vi.fn().mockResolvedValue({});
    const service = createService(GeosService, {
      geo: { findUnique, upsert }
    });

    await expect(
      service.import({
        rows: [
          { code: "US", currency: "USD", language: "en", name: "United States" },
          { code: "DE", currency: "EUR", language: "de", name: "Germany" }
        ]
      })
    ).resolves.toEqual({ created: 1, errors: [], updated: 1 });
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenLastCalledWith({
      create: { code: "DE", currency: "EUR", language: "de", name: "Germany" },
      update: { code: "DE", currency: "EUR", language: "de", name: "Germany" },
      where: { code: "DE" }
    });
  });
});
