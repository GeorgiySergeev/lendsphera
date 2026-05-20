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
import { ApprovalsModule } from "./landings/approvals.module";
import { LegacyImporterModule } from "./legacy-importer/legacy-importer.module";
import { ComplianceModule } from "./compliance/compliance.module";
import { ZipImportModule } from "./zip-import/zip-import.module";

@Module({
  imports: [
    // Only register the global bucket here. In @nestjs/throttler v6 every
    // throttler in forRoot is enforced on all routes; named auth/password-reset
    // limits belong on their handlers via @Throttle() (see auth.controller.ts).
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: seconds(process.env.NODE_ENV === "production" ? 60 : 60),
        limit: process.env.NODE_ENV === "production" ? 100 : 1000
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
    ApprovalsModule,
    LegacyModule,
    LegacyImporterModule,
    ComplianceModule,
    PublishModule,
    EventBusModule,
    WebhooksModule,
    ZipImportModule
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
