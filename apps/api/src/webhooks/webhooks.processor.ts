import { createHmac } from "node:crypto";

import { InjectQueue } from "@nestjs/bullmq";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import type { Queue } from "bullmq";

import { PrismaService } from "../prisma/prisma.service";
import { WebhooksService } from "./webhooks.service";

type DeliveryJob = {
  event: "landing.invalidated";
  at: string;
  landingId: string;
  source: "price.changed";
  attempt?: number;
};

const RETRY_DELAYS_MS = [1000, 5000, 30000, 300000, 1800000];

@Processor("webhookDeliveries")
export class WebhooksProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhooksProcessor.name);

  constructor(
    private readonly webhooks: WebhooksService,
    private readonly prisma: PrismaService,
    @InjectQueue("webhookDeliveries") private readonly queue: Queue
  ) {
    super();
  }

  async process(job: Job<DeliveryJob>): Promise<void> {
    const hooks = await this.webhooks.listEnabled();
    const body = JSON.stringify(job.data);

    for (const hook of hooks) {
      try {
        const signature = createHmac("sha256", hook.secret).update(body).digest("hex");
        const response = await fetch(hook.url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-ls-signature": signature
          },
          body
        });

        if (!response.ok) {
          throw new Error(`Webhook HTTP ${response.status}`);
        }
      } catch (error) {
        const attempt = (job.data.attempt ?? 0) + 1;
        if (attempt >= RETRY_DELAYS_MS.length) {
          this.logger.error(
            `Webhook dead-letter id=${hook.id}: ${(error as Error).message}`
          );
          continue;
        }

        await this.queue.add(
          "deliver",
          { ...job.data, attempt },
          { delay: RETRY_DELAYS_MS[attempt], removeOnComplete: 1000, removeOnFail: 1000 }
        );
      }
    }

    await this.prisma.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "webhook.delivery",
        entityId: job.id ?? "unknown",
        diff: {
          event: job.data.event,
          landingId: job.data.landingId
        }
      }
    });
  }
}
