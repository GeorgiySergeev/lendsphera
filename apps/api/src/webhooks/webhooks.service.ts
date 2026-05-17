import { randomUUID } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

type WebhookRecord = {
  id: string;
  url: string;
  secret: string;
  enabled: boolean;
  createdAt: string;
};

const SETTINGS_KEY = "webhooks.registry.v1";

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<{ items: Omit<WebhookRecord, "secret">[] }> {
    const items = await this.readRegistry();
    return {
      items: items.map(({ id, url, enabled, createdAt }) => ({
        id,
        url,
        enabled,
        createdAt
      }))
    };
  }

  async listEnabled(): Promise<WebhookRecord[]> {
    const items = await this.readRegistry();
    return items.filter((item) => item.enabled);
  }

  async create(url: string, secret: string, enabled: boolean, userId: string) {
    const items = await this.readRegistry();
    const created: WebhookRecord = {
      id: randomUUID(),
      url,
      secret,
      enabled,
      createdAt: new Date().toISOString()
    };

    await this.writeRegistry([...items, created]);
    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        entity: "webhook",
        entityId: created.id,
        userId,
        diff: { url: created.url, enabled: created.enabled } satisfies Prisma.JsonObject
      }
    });

    return { id: created.id, url: created.url, enabled: created.enabled };
  }

  async remove(id: string, userId: string) {
    const items = await this.readRegistry();
    const next = items.filter((item) => item.id !== id);
    await this.writeRegistry(next);
    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.DELETE,
        entity: "webhook",
        entityId: id,
        userId,
        diff: {} satisfies Prisma.JsonObject
      }
    });

    return { ok: true };
  }

  private async readRegistry(): Promise<WebhookRecord[]> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: SETTINGS_KEY }
    });
    const value = setting?.value;
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is WebhookRecord => {
      if (!v || typeof v !== "object") return false;
      const item = v as Record<string, unknown>;
      return (
        typeof item.id === "string" &&
        typeof item.url === "string" &&
        typeof item.secret === "string" &&
        typeof item.enabled === "boolean" &&
        typeof item.createdAt === "string"
      );
    });
  }

  private async writeRegistry(items: WebhookRecord[]): Promise<void> {
    await this.prisma.appSetting.upsert({
      where: { key: SETTINGS_KEY },
      update: { value: items as unknown as Prisma.JsonArray },
      create: { key: SETTINGS_KEY, value: items as unknown as Prisma.JsonArray }
    });
  }
}
