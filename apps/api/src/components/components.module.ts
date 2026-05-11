import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { CategoriesController } from "./categories.controller";
import { CategoriesService } from "./categories.service";
import { ComponentsController } from "./components.controller";
import { ComponentsService } from "./components.service";

@Module({
  imports: [PrismaModule],
  controllers: [ComponentsController, CategoriesController],
  providers: [ComponentsService, CategoriesService]
})
export class ComponentsModule {}
