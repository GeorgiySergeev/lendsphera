import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { READ_ROLES, Roles, WRITE_ROLES } from "../common/roles";
import { RolesGuard } from "../common/roles.guard";
import {
  CreateBuilderPageDto,
  SaveBuilderDraftDto,
  UpdateBuilderPageDto
} from "./builder.dto";
import { BuilderService, type BuilderStatusResponse } from "./builder.service";

@ApiTags("Builder")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("builder")
export class BuilderController {
  constructor(private readonly builder: BuilderService) {}

  @Roles(...READ_ROLES)
  @Get()
  status(): BuilderStatusResponse {
    return this.builder.getStatus();
  }

  @Roles(...READ_ROLES)
  @Get("pages/latest")
  latest(@CurrentUser() user: AuthUser) {
    return this.builder.latest(user);
  }

  @Roles(...READ_ROLES)
  @Get("pages")
  list(@CurrentUser() user: AuthUser) {
    return this.builder.list(user);
  }

  @Roles(...WRITE_ROLES)
  @Post("pages")
  create(@Body() dto: CreateBuilderPageDto, @CurrentUser() user: AuthUser) {
    return this.builder.create(dto, user);
  }

  @Roles(...READ_ROLES)
  @Get("pages/:id")
  get(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.builder.get(id, user);
  }

  @Roles(...WRITE_ROLES)
  @Patch("pages/:id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateBuilderPageDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.builder.update(id, dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Post("pages/:id/versions/draft")
  saveDraft(
    @Param("id") id: string,
    @Body() dto: SaveBuilderDraftDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.builder.saveDraft(id, dto, user);
  }

  @Roles(...READ_ROLES)
  @Get("pages/:id/versions")
  versions(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.builder.versions(id, user);
  }

  @Roles(...WRITE_ROLES)
  @Post("pages/:id/duplicate")
  duplicate(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.builder.duplicate(id, user);
  }
}
