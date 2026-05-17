import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { READ_ROLES, Roles, WRITE_ROLES } from "../common/roles";
import { RolesGuard } from "../common/roles.guard";
import { I18nStringService } from "./i18n-string.service";
import {
  ApproveI18nTranslationDto,
  I18nReviewQueueQueryDto,
  RejectI18nTranslationDto,
  TranslationJobsQueryDto
} from "./translation.dto";
import { TranslationQueueService } from "./translation-queue.service";

@ApiTags("Localization")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("v1/i18n")
export class TranslationController {
  constructor(
    private readonly queue: TranslationQueueService,
    private readonly i18nStrings: I18nStringService
  ) {}

  @Roles(...READ_ROLES)
  @Get("jobs")
  listJobs(@Query() query: TranslationJobsQueryDto) {
    return this.queue.listJobs(query);
  }

  @Roles(...READ_ROLES)
  @Get("review/pending")
  listPending(@Query() query: I18nReviewQueueQueryDto) {
    return this.i18nStrings.listPendingReview(query);
  }

  @Roles(...WRITE_ROLES)
  @Post("review/:id/approve")
  approve(
    @Param("id") id: string,
    @Body() dto: ApproveI18nTranslationDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.i18nStrings.approve(id, dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Post("review/:id/reject")
  reject(
    @Param("id") id: string,
    @Body() dto: RejectI18nTranslationDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.i18nStrings.reject(id, dto, user);
  }
}
