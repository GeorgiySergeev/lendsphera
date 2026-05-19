import { LandingStatus, Role, VersionStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { LandingsService } from "./landings.service";

describe("LandingsService publish flow", () => {
  it("create -> patch status -> publish creates a version row and audit status diff", async () => {
    const createdLanding = {
      id: "landing_1",
      status: LandingStatus.DRAFT
    };
    const currentLanding = {
      id: "landing_1",
      currentVersion: null,
      currentVersionId: null,
      status: LandingStatus.IN_REVIEW,
      templateId: "template_1"
    };

    const create = vi.fn().mockResolvedValue(createdLanding);
    const findUniqueOrThrow = vi.fn().mockResolvedValue(currentLanding);
    const update = vi
      .fn()
      .mockResolvedValueOnce({ ...currentLanding, status: LandingStatus.PUBLISHED })
      .mockResolvedValueOnce({ ...currentLanding, currentVersionId: "version_1" });
    const createAudit = vi.fn().mockResolvedValue({});
    const findFirstVersion = vi.fn().mockResolvedValue({ versionNum: 2 });
    const createVersion = vi.fn().mockResolvedValue({ id: "version_1" });

    const tx = {
      auditLog: { create: createAudit },
      landing: { update },
      version: {
        create: createVersion,
        findFirst: findFirstVersion
      }
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (trx: typeof tx) => unknown) => callback(tx)),
      landing: {
        create,
        findFirst: vi.fn().mockResolvedValue(null),
        findUniqueOrThrow
      }
    };

    const service = new LandingsService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never
    );
    const user = { email: "admin@example.com", id: "user_admin", role: Role.ADMIN };

    await service.create(
      {
        categoryId: "category_1",
        geoId: "geo_1",
        name: "Landing One",
        slug: "landing-one",
        templateId: "template_1",
        variantId: "variant_1"
      },
      user
    );

    await service.update("landing_1", { status: LandingStatus.PUBLISHED }, user);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "landing_1" }
      })
    );
    expect(createAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entity: "Landing",
          entityId: "landing_1"
        })
      })
    );
    expect(createVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          landingId: "landing_1",
          status: VersionStatus.MANUAL,
          versionNum: 3
        })
      })
    );
  });
});
