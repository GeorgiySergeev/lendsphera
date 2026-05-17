import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { PolicyService } from "./policy.service";

@Module({
  imports: [PrismaModule],
  providers: [PolicyService],
  exports: [PolicyService]
})
export class PolicyModule {}
