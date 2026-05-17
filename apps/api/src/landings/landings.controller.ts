import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { ADMIN_ROLES, READ_ROLES, Roles, WRITE_ROLES } from "../common/roles";
import { RolesGuard } from "../common/roles.guard";
import { LandingContextResolver } from "./landing-context.resolver";
import {
  BulkLandingDeleteDto,
  BulkLandingStatusDto,
  CreateLandingDto,
  DuplicateLandingDto,
  LandingListQueryDto,
  LandingNameAvailabilityQueryDto,
  LandingPublicIdSuggestionQueryDto,
  LockLandingDto,
  UpdateLandingDto
} from "./landings.dto";
import { LandingsService } from "./landings.service";

@ApiTags("Landings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("landings")
export class LandingsController {
  constructor(
    private readonly landings: LandingsService,
    private readonly landingContext: LandingContextResolver
  ) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@Query() query: LandingListQueryDto) {
    return this.landings.list(query);
  }

  @Roles(...READ_ROLES)
  @Get("name-availability")
  nameAvailability(@Query() query: LandingNameAvailabilityQueryDto) {
    return this.landings.nameAvailability(query);
  }

  @Roles(...READ_ROLES)
  @Get("public-id-suggestion")
  publicIdSuggestion(@Query() query: LandingPublicIdSuggestionQueryDto) {
    return this.landings.publicIdSuggestion(query);
  }

  @Roles(...WRITE_ROLES)
  @Patch("bulk/status")
  bulkStatus(@Body() dto: BulkLandingStatusDto) {
    return this.landings.bulkUpdateStatus(dto);
  }

  @Roles(...ADMIN_ROLES)
  @Post("bulk/delete")
  bulkDelete(@Body() dto: BulkLandingDeleteDto) {
    return this.landings.bulkSoftDelete(dto);
  }

  @Roles(...WRITE_ROLES)
  @Post()
  create(@Body() dto: CreateLandingDto, @CurrentUser() user: AuthUser) {
    return this.landings.create(dto, user);
  }

  @Roles(...READ_ROLES)
  @Get(":id")
  get(@Param("id") id: string) {
    return this.landings.get(id);
  }

  @Roles(...READ_ROLES)
  @Get(":id/editor")
  editor(@Param("id") id: string) {
    return this.landings.editor(id);
  }

  @Roles(...READ_ROLES)
  @Get(":id/context")
  context(@Param("id") id: string) {
    return this.landingContext.resolve(id);
  }

  @Roles(...READ_ROLES)
  @Get(":id/versions")
  versions(@Param("id") id: string, @Query() query: LandingListQueryDto) {
    return this.landings.versions(id, query);
  }

  @Roles(...WRITE_ROLES)
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateLandingDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.landings.update(id, dto, user);
  }

  @Roles(...ADMIN_ROLES)
  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.landings.softDelete(id);
  }

  @Roles(...WRITE_ROLES)
  @Post(":id/duplicate")
  duplicate(
    @Param("id") id: string,
    @Body() dto: DuplicateLandingDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.landings.duplicate(id, dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Post(":id/lock")
  lock(
    @Param("id") id: string,
    @Body() dto: LockLandingDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.landings.lock(id, dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Post(":id/unlock")
  unlock(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.landings.unlock(id, user);
  }

  @Roles(...WRITE_ROLES)
  @Post(":id/lock/heartbeat")
  refreshLock(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.landings.refreshLock(id, user);
  }
}
