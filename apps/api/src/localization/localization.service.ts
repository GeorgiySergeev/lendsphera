import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { getPagination, listResponse } from "../common/pagination";
import { TranslationQueueService } from "../i18n/translation-queue.service";
import { PrismaService } from "../prisma/prisma.service";
import type {
  I18nListQueryDto,
  I18nMissingQueryDto,
  RenameI18nKeyDto,
  UpsertI18nStringDto
} from "./localization.dto";

export type LocalizationStatusResponse = {
  name: "localization";
  status: "ok";
  timestamp: string;
};

@Injectable()
export class LocalizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly translationQueue: TranslationQueueService
  ) {}

  getStatus(): LocalizationStatusResponse {
    return {
      name: "localization",
      status: "ok",
      timestamp: new Date().toISOString()
    };
  }

  async list(query: I18nListQueryDto) {
    const { skip, take, page, limit } = getPagination(query);
    const keyWhere: Prisma.I18nStringWhereInput = {
      key: {
        contains: query.search,
        mode: "insensitive",
        startsWith: query.namespace ? `${query.namespace}.` : undefined
      }
    };

    const grouped = await this.prisma.i18nString.groupBy({
      by: ["key"],
      where: keyWhere,
      _max: { updatedAt: true },
      orderBy: { _max: { updatedAt: "desc" } },
      skip,
      take
    });

    const totalDistinct = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT "key")::bigint AS count
      FROM "I18nString"
      WHERE (${query.search ?? null}::text IS NULL OR "key" ILIKE ${`%${query.search ?? ""}%`})
      AND (${query.namespace ?? null}::text IS NULL OR "key" LIKE ${`${query.namespace ?? ""}.%`})
    `;

    const keys = grouped.map((row) => row.key);
    const rows = keys.length
      ? await this.prisma.i18nString.findMany({ where: { key: { in: keys } } })
      : [];

    const langSet = new Set<string>(rows.map((row) => row.lang));
    if (query.lang) {
      langSet.add(query.lang);
    }

    const items = keys.map((key) => {
      const keyRows = rows.filter((row) => row.key === key);
      const namespace = key.includes(".") ? key.split(".")[0] : "general";
      const translations = Object.fromEntries(
        [...langSet].sort().map((lang) => {
          const cell = keyRows.find((row) => row.lang === lang);
          return [lang, cell?.value ?? null];
        })
      );
      const missingFor = query.missingFor
        ? !keyRows.some((row) => row.lang === query.missingFor)
        : false;

      return {
        key,
        namespace,
        context: keyRows.find((row) => row.context)?.context ?? null,
        translations,
        missingFor
      };
    });

    return listResponse(
      query.missingFor ? items.filter((item) => item.missingFor) : items,
      Number(totalDistinct[0]?.count ?? 0n),
      page,
      limit
    );
  }

  async upsert(dto: UpsertI18nStringDto, userId: string | null) {
    const existing = await this.prisma.i18nString.findUnique({
      where: { key_lang: { key: dto.key, lang: dto.lang } }
    });

    const record = await this.prisma.i18nString.upsert({
      where: { key_lang: { key: dto.key, lang: dto.lang } },
      create: {
        key: dto.key,
        lang: dto.lang,
        value: dto.value,
        context: dto.context,
        source: "manual"
      },
      update: {
        value: dto.value,
        context: dto.context,
        source: "manual"
      }
    });

    await this.audit.log(AuditAction.UPDATE, "I18nString", record.id, userId, {
      diff: { key: dto.key, lang: dto.lang, op: "upsert" }
    });

    if (
      !existing ||
      existing.value !== dto.value ||
      (existing.context ?? null) !== (dto.context ?? null)
    ) {
      await this.translationQueue.enqueueForKeyChange({
        key: dto.key,
        sourceLang: dto.lang,
        sourceValue: dto.value,
        context: dto.context
      });
    }

    return record;
  }

  async missing(query: I18nMissingQueryDto) {
    const keyRows = await this.prisma.i18nString.findMany({
      where: {
        key: {
          contains: query.search,
          mode: "insensitive",
          startsWith: query.namespace ? `${query.namespace}.` : undefined
        }
      },
      select: { key: true, lang: true }
    });

    const byKey = new Map<string, Set<string>>();
    for (const row of keyRows) {
      if (!byKey.has(row.key)) byKey.set(row.key, new Set<string>());
      byKey.get(row.key)?.add(row.lang);
    }

    const missingKeys = [...byKey.entries()]
      .filter(([, langs]) => !langs.has(query.lang))
      .map(([key]) => key)
      .sort();

    return {
      lang: query.lang,
      count: missingKeys.length,
      items: missingKeys
    };
  }

  async renameKey(dto: RenameI18nKeyDto, userId: string | null) {
    if (dto.oldKey === dto.newKey) {
      throw new BadRequestException("oldKey and newKey must differ");
    }

    const sourceRows = await this.prisma.i18nString.findMany({
      where: { key: dto.oldKey }
    });
    if (!sourceRows.length) {
      throw new NotFoundException(`No i18n rows found for key '${dto.oldKey}'`);
    }

    await this.prisma.$transaction(async (tx) => {
      for (const row of sourceRows) {
        await tx.i18nString.upsert({
          where: { key_lang: { key: dto.newKey, lang: row.lang } },
          create: {
            key: dto.newKey,
            lang: row.lang,
            value: row.value,
            context: row.context,
            source: row.source ?? "manual",
            isApproved: row.isApproved
          },
          update: {
            value: row.value,
            context: row.context,
            source: row.source ?? "manual",
            isApproved: row.isApproved
          }
        });

        await tx.i18nString.upsert({
          where: { key_lang: { key: dto.oldKey, lang: row.lang } },
          create: {
            key: dto.oldKey,
            lang: row.lang,
            value: row.value,
            context: `Deprecated alias for ${dto.newKey}`,
            source: "alias",
            isApproved: true
          },
          update: {
            value: row.value,
            context: `Deprecated alias for ${dto.newKey}`,
            source: "alias",
            isApproved: true
          }
        });
      }
    });

    await this.audit.log(AuditAction.UPDATE, "I18nString", dto.oldKey, userId, {
      diff: { op: "rename", from: dto.oldKey, to: dto.newKey }
    });

    return {
      oldKey: dto.oldKey,
      newKey: dto.newKey,
      aliasCreated: true,
      affectedLanguages: sourceRows.map((row) => row.lang)
    };
  }
}
