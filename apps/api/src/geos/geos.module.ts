import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { GeosController } from "./geos.controller";
import { GeosService } from "./geos.service";

@Module({
  imports: [PrismaModule],
  controllers: [GeosController],
  providers: [GeosService]
})
export class GeosModule {}
