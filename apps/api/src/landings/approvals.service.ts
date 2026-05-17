import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import { AuditAction, LandingStatus, Prisma } from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import type { AuthUser } from "../common/current-user.decorator";
import { PolicyService } from "../policy/policy.service";
import { PrismaService } from "../prisma/prisma.service";
import type { ApprovalDecisionDto } from "./approvals.dto";

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly policy: PolicyService
  ) {}

  async submit(landingId: string, user: AuthUser) {
    const landing = await this.prisma.landing.findUniqueOrThrow({
      where: { id: landingId }
    });

    if (landing.status === LandingStatus.PUBLISHED) {
      throw new ConflictException("Published landing cannot be submitted for approval.");
    }

    const approval = await this.prisma.approval.create({
      data: {
        landingId,
        submitterId: user.id,
        status: "PENDING"
      }
    });

    await this.prisma.landing.update({
      where: { id: landingId },
      data: { status: LandingStatus.IN_REVIEW }
    });

    await this.audit.log(AuditAction.UPDATE, "Landing", landingId, user.id, {
      diff: {
        event: "approval.submit",
        approvalId: approval.id,
        from: landing.status,
        to: LandingStatus.IN_REVIEW
      } as Prisma.InputJsonValue
    });

    return approval;
  }

  async approve(landingId: string, dto: ApprovalDecisionDto, user: AuthUser) {
    const landing = await this.prisma.landing.findUniqueOrThrow({
      where: { id: landingId }
    });
    const pending = await this.prisma.approval.findFirst({
      where: { landingId, status: "PENDING" },
      orderBy: { createdAt: "desc" }
    });

    if (!pending) {
      throw new BadRequestException("No pending approval request found.");
    }
    if (pending.submitterId === user.id) {
      throw new ForbiddenException("Submitter cannot self-approve.");
    }

    const policy = await this.policy.getLandingPublishPolicy();
    if (!policy.roles.includes(user.role)) {
      throw new ForbiddenException("Your role is not allowed to approve publishing.");
    }

    const updated = await this.prisma.approval.update({
      where: { id: pending.id },
      data: {
        reviewerId: user.id,
        note: dto.note,
        status: "APPROVED",
        reviewedAt: new Date(),
        rejectedAt: null
      }
    });

    const approvedCount = await this.prisma.approval.count({
      where: { landingId, status: "APPROVED" }
    });

    if (landing.status !== LandingStatus.IN_REVIEW) {
      await this.prisma.landing.update({
        where: { id: landingId },
        data: { status: LandingStatus.IN_REVIEW }
      });
    }

    await this.audit.log(AuditAction.UPDATE, "Landing", landingId, user.id, {
      diff: {
        event: "approval.approve",
        approvalId: updated.id,
        approvedCount,
        requiredApprovals: policy.requireApprovals
      } as Prisma.InputJsonValue
    });

    return {
      ...updated,
      approvedCount,
      requiredApprovals: policy.requireApprovals,
      readyToPublish: approvedCount >= policy.requireApprovals
    };
  }

  async reject(landingId: string, dto: ApprovalDecisionDto, user: AuthUser) {
    const pending = await this.prisma.approval.findFirst({
      where: { landingId, status: "PENDING" },
      orderBy: { createdAt: "desc" }
    });

    if (!pending) {
      throw new BadRequestException("No pending approval request found.");
    }

    const updated = await this.prisma.approval.update({
      where: { id: pending.id },
      data: {
        reviewerId: user.id,
        note: dto.note,
        status: "REJECTED",
        rejectedAt: new Date(),
        reviewedAt: null
      }
    });

    await this.prisma.landing.update({
      where: { id: landingId },
      data: { status: LandingStatus.DRAFT }
    });

    await this.audit.log(AuditAction.UPDATE, "Landing", landingId, user.id, {
      diff: {
        event: "approval.reject",
        approvalId: updated.id,
        note: dto.note ?? null,
        to: LandingStatus.DRAFT
      } as Prisma.InputJsonValue
    });

    return updated;
  }

  async getApprovalSummary(landingId: string) {
    const policy = await this.policy.getLandingPublishPolicy();
    const [approvedCount, pendingCount] = await Promise.all([
      this.prisma.approval.count({ where: { landingId, status: "APPROVED" } }),
      this.prisma.approval.count({ where: { landingId, status: "PENDING" } })
    ]);

    return {
      requireApprovals: policy.requireApprovals,
      roles: policy.roles,
      approvedCount,
      pendingCount,
      readyToPublish: approvedCount >= policy.requireApprovals
    };
  }
}
