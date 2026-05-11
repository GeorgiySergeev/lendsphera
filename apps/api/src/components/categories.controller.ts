import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { READ_ROLES, Roles, WRITE_ROLES } from "../common/roles";
import { RolesGuard } from "../common/roles.guard";
import {
  CreateCategoryDto,
  UpdateCategoryDto
} from "./dto/create-category.dto";
import { CategoriesService } from "./categories.service";

@ApiTags("Component categories")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("component-categories")
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Roles(...READ_ROLES)
  @Get()
  list() {
    return this.categories.listActive();
  }

  @Roles(...WRITE_ROLES)
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Roles(...WRITE_ROLES)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Roles(...WRITE_ROLES)
  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.categories.delete(id);
  }
}
