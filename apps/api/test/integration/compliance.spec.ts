import { describe, expect, it, vi } from "vitest";

import { ComplianceService } from "../../src/compliance/compliance.service";

describe("compliance sweeper", () => {
  it("flags disallowed phrases and missing disclaimers on published landings", async () => {
    const prisma = {
      landing: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "landing_1",
            geo: { code: "US" },
            currentVersion: {
              html: "Guaranteed cure in 24h"
            }
          }
        ])
      },
      complianceIssue: {
        upsert: vi.fn().mockResolvedValue({})
      },
      $transaction: vi.fn().mockResolvedValue([])
    };

    const audit = {
      log: vi.fn().mockResolvedValue({})
    };

    const service = new ComplianceService(prisma as never, audit as never);
    const result = await service.runSweep();

    expect(result.scanned).toBe(1);
    expect(result.flagged).toBeGreaterThanOrEqual(2);
    expect(prisma.complianceIssue.upsert).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("acknowledges with actor and reason and writes audit log", async () => {
    const prisma = {
      complianceIssue: {
        findUnique: vi.fn().mockResolvedValue({
          id: "issue_1",
          status: "OPEN",
          acknowledgmentReason: null
        }),
        update: vi.fn().mockResolvedValue({
          id: "issue_1",
          status: "ACKNOWLEDGED",
          acknowledgmentReason: "Legal approved"
        })
      }
    };

    const audit = {
      log: vi.fn().mockResolvedValue({})
    };

    const service = new ComplianceService(prisma as never, audit as never);
    await service.acknowledgeIssue(
      "issue_1",
      { reason: "Legal approved" },
      { id: "user_1", role: "ADMIN", email: "admin@example.com" }
    );

    expect(prisma.complianceIssue.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          acknowledgedById: "user_1",
          acknowledgmentReason: "Legal approved"
        })
      })
    );
    expect(audit.log).toHaveBeenCalled();
  });
});
