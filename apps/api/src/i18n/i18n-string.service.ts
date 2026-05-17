import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { AuditAction, Role } from "@prisma/client";

import type { AuthUser } from "../common/current-user.decorator";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import type {
  ApproveI18nTranslationDto,
  I18nReviewQueueQueryDto,
  RejectI18nTranslationDto
} from "./translation.dto";
import { TranslationQueueService } from "./translation-queue.service";

const TRANSLATOR_OR_HIGHER: Role[] = [Role.EDITOR, Role.ADMIN, Role.OWNER];

@Injectable()
export class I18nStringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly queue: TranslationQueueService
  ) {}

  async listPendingReview(query: I18nReviewQueueQueryDto) {
    const items = await this.prisma.i18nString.findMany({
      where: {
        source: "llm",
        isApproved: false,
        lang: query.lang
      },
      orderBy: { updatedAt: "desc" },
      skip: query.cursor,
      take: query.take
    });

    const sourceLang = (process.env.I18N_SOURCE_LANG ?? "en").trim();

    const enriched = await Promise.all(
      items.map(async (item) => {
        const source = await this.prisma.i18nString.findUnique({
          where: { key_lang: { key: item.key, lang: sourceLang } },
          select: { lang: true, value: true, updatedAt: true }
        });

        return {
          id: item.id,
          key: item.key,
          lang: item.lang,
          mtValue: item.value,
          context: item.context,
          updatedAt: item.updatedAt,
          source: source
            ? {
                lang: source.lang,
                value: source.value,
                updatedAt: source.updatedAt
              }
            : null
        };
      })
    );

    return {
      items: enriched,
      meta: {
        take: query.take,
        cursor: query.cursor,
        nextCursor: enriched.length === query.take ? query.cursor + query.take : null
      }
    };
  }

  async approve(translationId: string, dto: ApproveI18nTranslationDto, user: AuthUser) {
    this.assertTranslatorRole(user);

    const existing = await this.prisma.i18nString.findUnique({
      where: { id: translationId }
    });
    if (!existing) {
      throw new NotFoundException("Translation not found");
    }

    const nextValue = dto.value ?? existing.value;
    const updated = await this.prisma.i18nString.update({
      where: { id: translationId },
      data: {
        value: nextValue,
        isApproved: true,
        source: "manual"
      }
    });

    await this.audit.log(AuditAction.UPDATE, "I18nString", existing.id, user.id, {
      diff: {
        op: "review.approve",
        key: existing.key,
        lang: existing.lang,
        prevValue: existing.value,
        nextValue,
        prevApproved: existing.isApproved,
        nextApproved: true
      }
    });

    return {
      ok: true,
      item: updated
    };
  }

  async reject(translationId: string, dto: RejectI18nTranslationDto, user: AuthUser) {
    this.assertTranslatorRole(user);

    const existing = await this.prisma.i18nString.findUnique({
      where: { id: translationId }
    });
    if (!existing) {
      throw new NotFoundException("Translation not found");
    }

    const source = await this.resolveSourceForRetry(existing.key, existing.lang);
    if (!source) {
      throw new BadRequestException(
        `Cannot requeue '${existing.key}:${existing.lang}' because no source language string is available`
      );
    }

    await this.queue.enqueueManualReviewRetry({
      key: existing.key,
      sourceLang: source.lang,
      sourceValue: source.value,
      targetLang: existing.lang,
      context: existing.context ?? undefined,
      reviewFeedback: dto.reason
    });

    await this.audit.log(AuditAction.UPDATE, "I18nString", existing.id, user.id, {
      diff: {
        op: "review.reject",
        key: existing.key,
        lang: existing.lang,
        reason: dto.reason,
        requeuedFrom: source.lang
      }
    });

    return {
      ok: true,
      requeued: true
    };
  }

  private async resolveSourceForRetry(key: string, targetLang: string) {
    const configuredSourceLang = (process.env.I18N_SOURCE_LANG ?? "en").trim();

    const preferred = await this.prisma.i18nString.findUnique({
      where: {
        key_lang: {
          key,
          lang: configuredSourceLang
        }
      },
      select: { lang: true, value: true }
    });

    if (preferred && preferred.lang !== targetLang) {
      return preferred;
    }

    return this.prisma.i18nString.findFirst({
      where: {
        key,
        lang: { not: targetLang },
        isApproved: true
      },
      select: { lang: true, value: true },
      orderBy: { updatedAt: "desc" }
    });
  }

  private assertTranslatorRole(user: AuthUser) {
    if (!user || !TRANSLATOR_OR_HIGHER.includes(user.role)) {
      throw new ForbiddenException("Translator role or higher is required");
    }
  }
}
