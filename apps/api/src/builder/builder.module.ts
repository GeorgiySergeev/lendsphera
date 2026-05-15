import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { BuilderController } from "./builder.controller";
import { BuilderService } from "./builder.service";

@Module({
  imports: [PrismaModule],
  controllers: [BuilderController],
  providers: [BuilderService]
})
export class BuilderModule {}
