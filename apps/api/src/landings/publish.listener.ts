import { createHmac } from "node:crypto";

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";

import { env } from "../config/env";
import { EventBusService } from "../events/event-bus.service";
import { PrismaService } from "../prisma/prisma.service";

type RevalidateReason = "landing.published" | "landing.invalidated";

@Injectable()
export class PublishListener implements OnModuleInit {
  private readonly logger = new Logger(PublishListener.name);

  constructor(
    private readonly bus: EventBusService,
    private readonly prisma: PrismaService
  ) {}

  onModuleInit(): void {
    this.bus.on("landing.published", async (event) => {
      await this.revalidateLandingPath(event.landingId, "landing.published");
    });

    this.bus.on("landing.invalidated", async (event) => {
      await this.revalidateLandingPath(event.landingId, "landing.invalidated");
    });
  }

  private async revalidateLandingPath(
    landingId: string,
    reason: RevalidateReason
  ): Promise<void> {
    if (!env.RUNTIME_ORIGIN) {
      this.logger.warn(`Skipping revalidate for ${landingId}: RUNTIME_ORIGIN is not set`);
      return;
    }

    const landing = await this.prisma.landing.findUnique({
      where: { id: landingId },
      select: { id: true, slug: true, geo: { select: { code: true } } }
    });

    if (!landing?.geo?.code || !landing.slug) {
      this.logger.warn(`Skipping revalidate for ${landingId}: landing path not found`);
      return;
    }

    const payload = JSON.stringify({
      landingId: landing.id,
      geo: landing.geo.code,
      slug: landing.slug,
      reason
    });

    const signature = createHmac("sha256", env.LS_BRIDGE_HMAC_SECRET)
      .update(payload)
      .digest("hex");
    const revalidateUrl = new URL("/api/revalidate", env.RUNTIME_ORIGIN).toString();
    const response = await fetch(revalidateUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ls-signature": signature
      },
      body: payload
    });

    if (!response.ok) {
      const responseBody = await response.text();
      this.logger.error(
        `Revalidate failed for ${landing.id}: HTTP ${response.status} ${responseBody}`
      );
      return;
    }

    this.logger.log(
      `Revalidated path /${landing.geo.code}/${landing.slug} for ${landing.id} (${reason})`
    );
  }
}
