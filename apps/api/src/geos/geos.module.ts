import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { GeoLocalesService } from "./geo-locales.service";
import { GeosController } from "./geos.controller";
import { GeosService } from "./geos.service";

@Module({
  imports: [PrismaModule],
  controllers: [GeosController],
  providers: [GeosService, GeoLocalesService]
})
export class GeosModule {}
