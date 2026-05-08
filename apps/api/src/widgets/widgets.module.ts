import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { WidgetsController } from "./widgets.controller";
import { WidgetsService } from "./widgets.service";

@Module({
  imports: [PrismaModule],
  controllers: [WidgetsController],
  providers: [WidgetsService]
})
export class WidgetsModule {}
