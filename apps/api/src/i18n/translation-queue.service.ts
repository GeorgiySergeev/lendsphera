import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import type { Queue } from "bullmq";

import type { TranslationJobsQueryDto } from "./translation.dto";

export const TRANSLATION_QUEUE = "i18nTranslations";

export type TranslationJobData = {
  key: string;
  sourceLang: string;
  targetLang: string;
  sourceValue: string;
  context?: string;
  reviewFeedback?: string;
};

@Injectable()
export class TranslationQueueService {
  constructor(
    @InjectQueue(TRANSLATION_QUEUE) private readonly queue: Queue<TranslationJobData>
  ) {}

  async enqueueForKeyChange(input: {
    key: string;
    sourceLang: string;
    sourceValue: string;
    context?: string;
  }): Promise<{ enqueued: number; targets: string[] }> {
    const targets = this.resolveTargetLanguages(input.sourceLang);
    await Promise.all(
      targets.map((targetLang) =>
        this.queue.add(
          "translate",
          {
            key: input.key,
            sourceLang: input.sourceLang,
            targetLang,
            sourceValue: input.sourceValue,
            context: input.context
          },
          {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 300
            },
            removeOnComplete: 1000,
            removeOnFail: 1000
          }
        )
      )
    );

    return { enqueued: targets.length, targets };
  }

  async listJobs(query: TranslationJobsQueryDto) {
    const states: Array<"waiting" | "active" | "delayed" | "completed" | "failed"> = [
      "waiting",
      "active",
      "delayed",
      "completed",
      "failed"
    ];
    const jobs = await this.queue.getJobs(
      states,
      query.cursor,
      query.cursor + query.take - 1,
      true
    );

    return {
      items: jobs.map((job) => ({
        id: job.id,
        name: job.name,
        state: job.finishedOn ? (job.failedReason ? "failed" : "completed") : "queued",
        attemptsMade: job.attemptsMade,
        data: job.data,
        failedReason: job.failedReason ?? null,
        timestamp: job.timestamp,
        processedOn: job.processedOn ?? null,
        finishedOn: job.finishedOn ?? null
      })),
      meta: {
        take: query.take,
        cursor: query.cursor,
        nextCursor: jobs.length === query.take ? query.cursor + query.take : null
      }
    };
  }

  async enqueueManualReviewRetry(input: TranslationJobData): Promise<void> {
    await this.queue.add("translate", input, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 300
      },
      removeOnComplete: 1000,
      removeOnFail: 1000
    });
  }

  private resolveTargetLanguages(sourceLang: string): string[] {
    const configured = (process.env.I18N_TARGET_LANGS ?? "de,fr,es")
      .split(",")
      .map((lang) => lang.trim())
      .filter((lang) => lang.length > 0);

    return [...new Set(configured)].filter((lang) => lang !== sourceLang);
  }
}
