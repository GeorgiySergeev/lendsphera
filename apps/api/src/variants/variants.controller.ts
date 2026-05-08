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

import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { ADMIN_ROLES, READ_ROLES, Roles, WRITE_ROLES } from "../common/roles";
import { RolesGuard } from "../common/roles.guard";
import {
  CreateVariantDto,
  ReorderVariantsDto,
  UpdateVariantDto,
  VariantListQueryDto
} from "./variants.dto";
import { VariantsService } from "./variants.service";

@ApiTags("Variants")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("variants")
export class VariantsController {
  constructor(private readonly variants: VariantsService) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@Query() query: VariantListQueryDto) {
    return this.variants.list(query);
  }

  @Roles(...READ_ROLES)
  @Get(":id")
  get(@Param("id") id: string) {
    return this.variants.get(id);
  }

  @Roles(...WRITE_ROLES)
  @Patch("reorder")
  reorder(@Body() dto: ReorderVariantsDto) {
    return this.variants.reorder(dto);
  }

  @Roles(...WRITE_ROLES)
  @Post()
  create(@Body() dto: CreateVariantDto) {
    return this.variants.create(dto);
  }

  @Roles(...WRITE_ROLES)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateVariantDto) {
    return this.variants.update(id, dto);
  }

  @Roles(...ADMIN_ROLES)
  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.variants.delete(id);
  }
}
