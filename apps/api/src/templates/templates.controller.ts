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
  CreateTemplateDto,
  TemplateListQueryDto,
  UpdateTemplateDto
} from "./templates.dto";
import { TemplatesService } from "./templates.service";

@ApiTags("Templates")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("templates")
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@Query() query: TemplateListQueryDto) {
    return this.templates.list(query);
  }

  @Roles(...READ_ROLES)
  @Get(":id")
  get(@Param("id") id: string) {
    return this.templates.get(id);
  }

  @Roles(...WRITE_ROLES)
  @Post()
  create(@Body() dto: CreateTemplateDto, @CurrentUser() user: AuthUser) {
    return this.templates.create(dto, user.id);
  }

  @Roles(...WRITE_ROLES)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateTemplateDto) {
    return this.templates.update(id, dto);
  }

  @Roles(...ADMIN_ROLES)
  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.templates.delete(id);
  }
}
