import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { Queue } from "bullmq";

import { ComplianceService } from "./compliance.service";

const COMPLIANCE_SWEEPER_QUEUE = "complianceSweeper";
const COMPLIANCE_SWEEPER_JOB = "dailySweep";

@Processor(COMPLIANCE_SWEEPER_QUEUE)
export class ComplianceSweeperProcessor extends WorkerHost {
  private readonly logger = new Logger(ComplianceSweeperProcessor.name);

  constructor(private readonly compliance: ComplianceService) {
    super();
  }

  async process(): Promise<void> {
    const result = await this.compliance.runSweep();
    this.logger.log(
      `Compliance sweep completed. scanned=${result.scanned} flagged=${result.flagged} durationMs=${result.durationMs}`
    );
  }
}

@Injectable()
export class ComplianceSweeperScheduler implements OnModuleInit {
  constructor(@InjectQueue(COMPLIANCE_SWEEPER_QUEUE) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    await this.queue.add(
      COMPLIANCE_SWEEPER_JOB,
      {},
      {
        jobId: COMPLIANCE_SWEEPER_JOB,
        repeat: {
          pattern: "0 2 * * *"
        },
        removeOnComplete: 50,
        removeOnFail: 50
      }
    );
  }
}

export { COMPLIANCE_SWEEPER_QUEUE };
