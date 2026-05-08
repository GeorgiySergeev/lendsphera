import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { READ_ROLES, Roles, WRITE_ROLES } from "../common/roles";
import { RolesGuard } from "../common/roles.guard";
import { CreateVersionDto, DraftVersionDto } from "./versions.dto";
import { VersionsService } from "./versions.service";

@ApiTags("Versions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class VersionsController {
  constructor(private readonly versions: VersionsService) {}

  @Roles(...READ_ROLES)
  @Get("landings/:landingId/versions")
  listForLanding(@Param("landingId") landingId: string) {
    return this.versions.listForLanding(landingId);
  }

  @Roles(...WRITE_ROLES)
  @Post("landings/:landingId/versions/draft")
  saveDraft(
    @Param("landingId") landingId: string,
    @Body() dto: DraftVersionDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.versions.saveDraft(landingId, dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Post("landings/:landingId/versions")
  create(
    @Param("landingId") landingId: string,
    @Body() dto: CreateVersionDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.versions.create(landingId, dto, user);
  }

  @Roles(...READ_ROLES)
  @Get("versions/:id")
  get(@Param("id") id: string) {
    return this.versions.get(id);
  }

  @Roles(...WRITE_ROLES)
  @Post("versions/:id/rollback")
  rollback(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.versions.rollback(id, user);
  }

  @Roles(...READ_ROLES)
  @Get("versions/:fromId/diff/:toId")
  diff(@Param("fromId") fromId: string, @Param("toId") toId: string) {
    return this.versions.diff(fromId, toId);
  }
}
