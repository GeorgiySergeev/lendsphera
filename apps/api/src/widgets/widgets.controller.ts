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
import {
  CreateWidgetDto,
  CreateWidgetVersionDto,
  UpdateWidgetDto,
  WidgetListQueryDto
} from "./widgets.dto";
import { WidgetsService } from "./widgets.service";

@ApiTags("Widgets")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("widgets")
export class WidgetsController {
  constructor(private readonly widgets: WidgetsService) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@Query() query: WidgetListQueryDto) {
    return this.widgets.list(query);
  }

  @Roles(...READ_ROLES)
  @Get(":id")
  get(@Param("id") id: string) {
    return this.widgets.get(id);
  }

  @Roles(...WRITE_ROLES)
  @Post()
  create(@Body() dto: CreateWidgetDto, @CurrentUser() user: AuthUser) {
    return this.widgets.create(dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateWidgetDto) {
    return this.widgets.update(id, dto);
  }

  @Roles(...ADMIN_ROLES)
  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.widgets.delete(id);
  }

  @Roles(...READ_ROLES)
  @Get(":id/versions")
  listVersions(@Param("id") id: string) {
    return this.widgets.listVersions(id);
  }

  @Roles(...WRITE_ROLES)
  @Post(":id/versions")
  createVersion(@Param("id") id: string, @Body() dto: CreateWidgetVersionDto) {
    return this.widgets.createVersion(id, dto);
  }

  @Roles(...ADMIN_ROLES)
  @Post("versions/:versionId/latest")
  markLatest(@Param("versionId") versionId: string) {
    return this.widgets.markLatest(versionId);
  }
}
