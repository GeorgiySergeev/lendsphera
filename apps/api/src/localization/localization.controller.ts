import { Body, Controller, Get, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { READ_ROLES, Roles, WRITE_ROLES } from "../common/roles";
import { RolesGuard } from "../common/roles.guard";
import {
  I18nListQueryDto,
  I18nMissingQueryDto,
  RenameI18nKeyDto,
  UpsertI18nStringDto
} from "./localization.dto";
import {
  LocalizationService,
  type LocalizationStatusResponse
} from "./localization.service";

@ApiTags("Localization")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("v1/i18n")
export class LocalizationController {
  constructor(private readonly localization: LocalizationService) {}

  @Roles(...READ_ROLES)
  @Get("status")
  status(): LocalizationStatusResponse {
    return this.localization.getStatus();
  }

  @Roles(...READ_ROLES)
  @Get()
  list(@Query() query: I18nListQueryDto) {
    return this.localization.list(query);
  }

  @Roles(...READ_ROLES)
  @Get("missing")
  missing(@Query() query: I18nMissingQueryDto) {
    return this.localization.missing(query);
  }

  @Roles(...WRITE_ROLES)
  @Post()
  upsert(@Body() dto: UpsertI18nStringDto, @CurrentUser() user: AuthUser) {
    return this.localization.upsert(dto, user?.id ?? null);
  }

  @Roles(...WRITE_ROLES)
  @Patch("rename")
  rename(@Body() dto: RenameI18nKeyDto, @CurrentUser() user: AuthUser) {
    return this.localization.renameKey(dto, user?.id ?? null);
  }
}
