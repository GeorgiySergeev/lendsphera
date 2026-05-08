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
import { CategoriesService } from "./categories.service";
import {
  CategoryListQueryDto,
  CreateCategoryDto,
  ReorderCategoriesDto,
  UpdateCategoryDto
} from "./categories.dto";

@ApiTags("Categories")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@Query() query: CategoryListQueryDto) {
    return this.categories.list(query);
  }

  @Roles(...READ_ROLES)
  @Get(":id")
  get(@Param("id") id: string) {
    return this.categories.get(id);
  }

  @Roles(...WRITE_ROLES)
  @Patch("reorder")
  reorder(@Body() dto: ReorderCategoriesDto) {
    return this.categories.reorder(dto);
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

  @Roles(...ADMIN_ROLES)
  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.categories.delete(id);
  }
}
