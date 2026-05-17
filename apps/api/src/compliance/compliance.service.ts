import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, ComplianceIssueStatus, Prisma } from "@prisma/client";

import { type AuthUser } from "../common/current-user.decorator";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import type {
  AcknowledgeComplianceIssueDto,
  ComplianceIssueListQueryDto
} from "./compliance.dto";
import { getComplianceProfileByGeo } from "./profile";

@Injectable()
export class ComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async listIssues(query: ComplianceIssueListQueryDto) {
    const issues = await this.prisma.complianceIssue.findMany({
      where: {
        status: query.status
      },
      orderBy: [{ detectedAt: "desc" }, { id: "desc" }],
      skip: query.cursor,
      take: query.take,
      include: {
        landing: {
          select: {
            id: true,
            name: true,
            publicId: true,
            geo: {
              select: {
                code: true,
                name: true
              }
            }
          }
        },
        acknowledgedBy: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    return {
      items: issues,
      meta: {
        take: query.take,
        cursor: query.cursor,
        nextCursor: issues.length === query.take ? query.cursor + query.take : null
      }
    };
  }

  async acknowledgeIssue(id: string, dto: AcknowledgeComplianceIssueDto, user: AuthUser) {
    const issue = await this.prisma.complianceIssue.findUnique({ where: { id } });
    if (!issue) {
      throw new NotFoundException("Compliance issue not found");
    }

    const updated = await this.prisma.complianceIssue.update({
      where: { id },
      data: {
        status: ComplianceIssueStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
        acknowledgedById: user.id,
        acknowledgmentReason: dto.reason
      }
    });

    await this.audit.log(AuditAction.UPDATE, "ComplianceIssue", id, user.id, {
      diff: {
        before: {
          status: issue.status,
          acknowledgmentReason: issue.acknowledgmentReason
        },
        after: {
          status: updated.status,
          acknowledgmentReason: updated.acknowledgmentReason
        }
      }
    });

    return updated;
  }

  async autoFixIssue(id: string, user: AuthUser) {
    const issue = await this.prisma.complianceIssue.findUnique({
      where: { id },
      include: {
        landing: {
          include: {
            geo: {
              select: {
                code: true
              }
            },
            currentVersion: {
              select: {
                id: true,
                html: true
              }
            }
          }
        }
      }
    });

    if (!issue) {
      throw new NotFoundException("Compliance issue not found");
    }

    if (issue.issueKey !== "missing_required_disclaimer") {
      return {
        fixed: false,
        reason: "Issue type is not safe for auto-fix"
      };
    }

    const profile = getComplianceProfileByGeo(issue.landing.geo.code);
    const currentHtml = issue.landing.currentVersion?.html ?? "";
    const needsFix = !currentHtml
      .toLowerCase()
      .includes(profile.disclaimer.toLowerCase());

    if (needsFix && issue.landing.currentVersion) {
      const nextHtml = `${currentHtml}\n<section data-compliance-key="medical_disclaimer"><p>${profile.disclaimer}</p></section>`;
      await this.prisma.version.update({
        where: {
          id: issue.landing.currentVersion.id
        },
        data: {
          html: nextHtml
        }
      });
    }

    const updated = await this.prisma.complianceIssue.update({
      where: { id },
      data: {
        status: ComplianceIssueStatus.AUTO_FIXED,
        autoFixedAt: new Date(),
        resolvedAt: new Date(),
        resolvedById: user.id
      }
    });

    await this.audit.log(AuditAction.UPDATE, "ComplianceIssue", id, user.id, {
      diff: {
        before: {
          status: issue.status
        },
        after: {
          status: updated.status,
          autoFixedAt: updated.autoFixedAt
        }
      }
    });

    return {
      fixed: true,
      issue: updated
    };
  }

  async runSweep() {
    const startedAt = Date.now();
    const published = await this.prisma.landing.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null
      },
      select: {
        id: true,
        geo: {
          select: {
            code: true
          }
        },
        currentVersion: {
          select: {
            html: true
          }
        }
      }
    });

    const upserts: Prisma.PrismaPromise<unknown>[] = [];

    for (const landing of published) {
      const html = landing.currentVersion?.html ?? "";
      const profile = getComplianceProfileByGeo(landing.geo.code);

      for (const phrase of profile.disallowedPhrases) {
        if (phrase.test(html)) {
          upserts.push(
            this.prisma.complianceIssue.upsert({
              where: {
                landingId_issueKey: {
                  landingId: landing.id,
                  issueKey: `disallowed_phrase:${phrase.source}`
                }
              },
              create: {
                landingId: landing.id,
                issueKey: `disallowed_phrase:${phrase.source}`,
                severity: "CRITICAL",
                details: {
                  pattern: phrase.source
                }
              },
              update: {
                status: "OPEN",
                detectedAt: new Date(),
                details: {
                  pattern: phrase.source
                },
                acknowledgedAt: null,
                acknowledgedById: null,
                acknowledgmentReason: null,
                resolvedAt: null,
                resolvedById: null,
                autoFixedAt: null
              }
            })
          );
        }
      }

      const hasDisclaimer = html.toLowerCase().includes(profile.disclaimer.toLowerCase());
      const hasRequiredKeys = profile.requiredKeys.every((key) => html.includes(key));
      if (!hasDisclaimer || !hasRequiredKeys) {
        upserts.push(
          this.prisma.complianceIssue.upsert({
            where: {
              landingId_issueKey: {
                landingId: landing.id,
                issueKey: "missing_required_disclaimer"
              }
            },
            create: {
              landingId: landing.id,
              issueKey: "missing_required_disclaimer",
              severity: "HIGH",
              details: {
                requiredKeys: profile.requiredKeys,
                disclaimer: profile.disclaimer
              }
            },
            update: {
              status: "OPEN",
              detectedAt: new Date(),
              details: {
                requiredKeys: profile.requiredKeys,
                disclaimer: profile.disclaimer
              },
              acknowledgedAt: null,
              acknowledgedById: null,
              acknowledgmentReason: null,
              resolvedAt: null,
              resolvedById: null,
              autoFixedAt: null
            }
          })
        );
      }
    }

    if (upserts.length > 0) {
      await this.prisma.$transaction(upserts);
    }

    return {
      scanned: published.length,
      flagged: upserts.length,
      durationMs: Date.now() - startedAt
    };
  }
}
