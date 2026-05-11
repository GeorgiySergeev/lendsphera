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
import { READ_ROLES, Roles, WRITE_ROLES } from "../common/roles";
import { RolesGuard } from "../common/roles.guard";
import { CreateComponentDto } from "./dto/create-component.dto";
import { CreateVariantDto, UpdateVariantDto } from "./dto/create-variant.dto";
import { QueryComponentsDto } from "./dto/query-components.dto";
import { UpdateComponentDto } from "./dto/update-component.dto";
import { ComponentsService } from "./components.service";

@ApiTags("Components")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("components")
export class ComponentsController {
  constructor(private readonly components: ComponentsService) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@Query() query: QueryComponentsDto) {
    return this.components.list(query);
  }

  @Roles(...READ_ROLES)
  @Get(":id")
  get(@Param("id") id: string) {
    return this.components.get(id);
  }

  @Roles(...WRITE_ROLES)
  @Post()
  create(@Body() dto: CreateComponentDto, @CurrentUser() user: AuthUser) {
    return this.components.create(dto, user.id);
  }

  @Roles(...WRITE_ROLES)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateComponentDto) {
    return this.components.update(id, dto);
  }

  @Roles(...WRITE_ROLES)
  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.components.delete(id);
  }

  @Roles(...WRITE_ROLES)
  @Post(":id/duplicate")
  duplicate(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.components.duplicate(id, user.id);
  }

  @Roles(...READ_ROLES)
  @Post(":id/use")
  trackUsage(@Param("id") id: string) {
    return this.components.trackUsage(id);
  }

  @Roles(...READ_ROLES)
  @Get(":id/variants")
  listVariants(@Param("id") id: string) {
    return this.components.listVariants(id);
  }

  @Roles(...WRITE_ROLES)
  @Post(":id/variants")
  createVariant(@Param("id") id: string, @Body() dto: CreateVariantDto) {
    return this.components.createVariant(id, dto);
  }

  @Roles(...WRITE_ROLES)
  @Patch(":componentId/variants/:variantId")
  updateVariant(
    @Param("componentId") componentId: string,
    @Param("variantId") variantId: string,
    @Body() dto: UpdateVariantDto
  ) {
    return this.components.updateVariant(componentId, variantId, dto);
  }

  @Roles(...WRITE_ROLES)
  @Delete(":componentId/variants/:variantId")
  deleteVariant(
    @Param("componentId") componentId: string,
    @Param("variantId") variantId: string
  ) {
    return this.components.deleteVariant(componentId, variantId);
  }
}
