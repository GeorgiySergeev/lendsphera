import { describe, expect, it, vi } from "vitest";

import { ProductsService } from "./products.service";

function createService(
  prisma: Record<string, unknown>,
  audit?: { log: ReturnType<typeof vi.fn> }
) {
  return new ProductsService(prisma as never, (audit ?? { log: vi.fn() }) as never);
}

describe("ProductsService", () => {
  it("lists with cursor pagination and returns nextCursor", async () => {
    const findMany = vi.fn().mockResolvedValue([
      { id: "p3", createdAt: new Date(), category: null },
      { id: "p2", createdAt: new Date(), category: null }
    ]);
    const service = createService({
      product: { findMany }
    });

    const result = await service.list({ take: 2, includeArchived: false } as never);

    expect(result).toEqual({
      items: expect.any(Array),
      nextCursor: "p2"
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 2,
        where: expect.objectContaining({ archivedAt: null })
      })
    );
  });

  it("includes archived items when includeArchived=true", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = createService({
      product: { findMany }
    });

    await service.list({ includeArchived: true, take: 50 } as never);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ archivedAt: undefined })
      })
    );
  });

  it("creates product and writes product.create audit entry", async () => {
    const create = vi
      .fn()
      .mockResolvedValue({ id: "product_1", slug: "alpha", category: null });
    const log = vi.fn().mockResolvedValue(undefined);
    const service = createService(
      {
        product: { create }
      },
      { log }
    );

    await service.create({ name: "Alpha", slug: "alpha" } as never, "user_1");

    expect(log).toHaveBeenCalledWith(
      "CREATE",
      "product.create",
      "product_1",
      "user_1",
      expect.any(Object)
    );
  });

  it("soft deletes by setting archivedAt", async () => {
    const update = vi.fn().mockResolvedValue({ id: "product_1" });
    const service = createService({
      product: { update }
    });

    await expect(service.remove("product_1")).resolves.toEqual({ success: true });
    expect(update).toHaveBeenCalledWith({
      where: { id: "product_1" },
      data: { archivedAt: expect.any(Date) }
    });
  });
});
