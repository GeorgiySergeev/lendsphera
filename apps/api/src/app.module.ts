import { Module } from "@nestjs/common";

import { AssetsModule } from "./assets/assets.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { CategoriesModule } from "./categories/categories.module";
import { GeosModule } from "./geos/geos.module";
import { HealthController } from "./health/health.controller";
import { LandingsModule } from "./landings/landings.module";
import { LegacyModule } from "./legacy/legacy.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { TemplatesModule } from "./templates/templates.module";
import { VariantsModule } from "./variants/variants.module";
import { VersionsModule } from "./versions/versions.module";
import { BullModule } from "@nestjs/bullmq";
import { env } from "./config/env";
import { PublishModule } from "./publish/publish.module";
import { WidgetsModule } from "./widgets/widgets.module";

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: env.REDIS_URL
      }
    }),
    PrismaModule,
    RedisModule,
    AuditModule,
    AuthModule,
    GeosModule,
    CategoriesModule,
    VariantsModule,
    TemplatesModule,
    LandingsModule,
    VersionsModule,
    WidgetsModule,
    AssetsModule,
    LegacyModule,
    PublishModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
