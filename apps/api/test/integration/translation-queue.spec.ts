import { describe, expect, it, vi } from "vitest";

import { LocalizationService } from "../../src/localization/localization.service";
import { TranslationQueueService } from "../../src/i18n/translation-queue.service";

describe("translation queue", () => {
  it("fan-outs to target languages with 3 retry attempts on enqueue", async () => {
    const add = vi.fn().mockResolvedValue({});
    const queue = { add };
    const service = new TranslationQueueService(queue as never);

    await service.enqueueForKeyChange({
      key: "cta.buy",
      sourceLang: "en",
      sourceValue: "Buy now"
    });

    expect(add).toHaveBeenCalledTimes(3);
    for (const call of add.mock.calls) {
      expect(call[2]).toMatchObject({ attempts: 3 });
    }
    const targetLangs = add.mock.calls.map((call) => call[1].targetLang).sort();
    expect(targetLangs).toEqual(["de", "es", "fr"]);
  });

  it("surfaces failed jobs via jobs listing", async () => {
    const queue = {
      getJobs: vi.fn().mockResolvedValue([
        {
          id: "job_1",
          name: "translate",
          finishedOn: Date.now(),
          failedReason: "Provider timeout",
          attemptsMade: 3,
          data: {
            key: "cta.buy",
            sourceLang: "en",
            targetLang: "de",
            sourceValue: "Buy now"
          },
          timestamp: Date.now() - 1000,
          processedOn: Date.now() - 500
        }
      ])
    };

    const service = new TranslationQueueService(queue as never);
    const result = await service.listJobs({ take: 20, cursor: 0 });

    expect(result.items[0]).toMatchObject({
      id: "job_1",
      state: "failed",
      failedReason: "Provider timeout",
      attemptsMade: 3
    });
  });

  it("auto-enqueues when i18n key changes", async () => {
    const enqueueForKeyChange = vi
      .fn()
      .mockResolvedValue({ enqueued: 3, targets: ["de", "fr", "es"] });

    const prisma = {
      i18nString: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({ id: "i18n_1" })
      }
    };

    const audit = {
      log: vi.fn().mockResolvedValue({})
    };

    const service = new LocalizationService(
      prisma as never,
      audit as never,
      { enqueueForKeyChange } as never
    );

    await service.upsert(
      {
        key: "cta.buy",
        lang: "en",
        value: "Buy now"
      },
      "user_1"
    );

    expect(enqueueForKeyChange).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "cta.buy",
        sourceLang: "en",
        sourceValue: "Buy now"
      })
    );
  });
});
