import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { PublishService } from "./publish.service";

describe("PublishService approvals gate", () => {
  it("prevents publish when approvals are below policy requirement", async () => {
    const tx = {
      landing: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "l1",
          currentVersionId: "v1",
          currentVersion: { id: "v1" }
        })
      }
    };

    const prisma = {
      $transaction: vi.fn(async (cb: (trx: typeof tx) => unknown) => cb(tx))
    } as any;

    const landingContext = {
      resolve: vi.fn().mockResolvedValue({ placeholders: {} })
    } as any;
    const approvalsService = {
      getApprovalSummary: vi.fn().mockResolvedValue({ approvedCount: 0 })
    } as any;
    const policyService = {
      getLandingPublishPolicy: vi.fn().mockResolvedValue({ requireApprovals: 1 })
    } as any;
    const queue = { add: vi.fn() } as any;

    const service = new PublishService(
      prisma,
      landingContext,
      approvalsService,
      policyService,
      queue
    );

    await expect(
      service.enqueuePublishJob("l1", {
        id: "u1",
        email: "u@u.com",
        role: "ADMIN" as any
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
