import { ForbiddenException } from "@nestjs/common";
import { LandingStatus, Role } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { ApprovalsService } from "./approvals.service";

describe("ApprovalsService", () => {
  it("blocks self-approval", async () => {
    const prisma = {
      landing: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue({ id: "l1", status: LandingStatus.IN_REVIEW })
      },
      approval: {
        findFirst: vi.fn().mockResolvedValue({
          id: "a1",
          landingId: "l1",
          submitterId: "u1",
          status: "PENDING"
        })
      }
    } as any;

    const audit = { log: vi.fn() } as any;
    const policy = {
      getLandingPublishPolicy: vi
        .fn()
        .mockResolvedValue({ requireApprovals: 1, roles: [Role.ADMIN] })
    } as any;

    const service = new ApprovalsService(prisma, audit, policy);

    await expect(
      service.approve(
        "l1",
        { note: "ok" },
        { id: "u1", email: "a@a.com", role: Role.ADMIN }
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("moves landing to IN_REVIEW on submit and writes audit", async () => {
    const prisma = {
      landing: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue({ id: "l1", status: LandingStatus.DRAFT }),
        update: vi.fn().mockResolvedValue({ id: "l1", status: LandingStatus.IN_REVIEW })
      },
      approval: {
        create: vi.fn().mockResolvedValue({ id: "a1", status: "PENDING" })
      }
    } as any;

    const audit = { log: vi.fn().mockResolvedValue({}) } as any;
    const policy = { getLandingPublishPolicy: vi.fn() } as any;

    const service = new ApprovalsService(prisma, audit, policy);

    await service.submit("l1", { id: "u1", email: "a@a.com", role: Role.EDITOR });

    expect(prisma.landing.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: LandingStatus.IN_REVIEW } })
    );
    expect(audit.log).toHaveBeenCalled();
  });
});
