import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerModule, seconds } from "@nestjs/throttler";

import { AssetsModule } from "./assets/assets.module";
import { BuilderModule } from "./builder/builder.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { CategoriesModule } from "./categories/categories.module";
import { ComponentsModule } from "./components/components.module";
import { DownloadModule } from "./download/download.module";
import { EventBusModule } from "./events/event-bus.module";
import { GeosModule } from "./geos/geos.module";
import { HealthController } from "./health/health.controller";
import { LandingsModule } from "./landings/landings.module";
import { LegacyModule } from "./legacy/legacy.module";
import { LocalizationModule } from "./localization/localization.module";
import { MediaModule } from "./media/media.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { TemplatesModule } from "./templates/templates.module";
import { VariantsModule } from "./variants/variants.module";
import { VersionsModule } from "./versions/versions.module";
import { BullModule } from "@nestjs/bullmq";
import { env } from "./config/env";
import { PublishModule } from "./publish/publish.module";
import { WidgetsModule } from "./widgets/widgets.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { CustomThrottlerGuard } from "./common/custom-throttler.guard";
import { AuditInterceptor } from "./audit/audit.interceptor";
import { ProductsModule } from "./products/products.module";
import { PricingModule } from "./pricing/pricing.module";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: "global",
        ttl: seconds(process.env.NODE_ENV === "production" ? 60 : 1000),
        limit: process.env.NODE_ENV === "production" ? 100 : 10000
      },
      {
        name: "auth",
        ttl: seconds(60),
        limit: process.env.NODE_ENV === "production" ? 5 : 100
      },
      {
        name: "password-reset",
        ttl: seconds(3600),
        limit: process.env.NODE_ENV === "production" ? 3 : 100
      }
    ]),
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
    ComponentsModule,
    VariantsModule,
    TemplatesModule,
    LandingsModule,
    BuilderModule,
    DownloadModule,
    LocalizationModule,
    MediaModule,
    VersionsModule,
    WidgetsModule,
    AssetsModule,
    ProductsModule,
    PricingModule,
    LegacyModule,
    PublishModule,
    EventBusModule,
    WebhooksModule
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor
    }
  ]
})
export class AppModule {}
