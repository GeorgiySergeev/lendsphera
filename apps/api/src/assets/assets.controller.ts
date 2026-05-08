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
import { AssetListQueryDto, CreateAssetDto, UpdateAssetDto } from "./assets.dto";
import { AssetsService } from "./assets.service";

@ApiTags("Assets")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("assets")
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@Query() query: AssetListQueryDto) {
    return this.assets.list(query);
  }

  @Roles(...READ_ROLES)
  @Get(":id")
  get(@Param("id") id: string) {
    return this.assets.get(id);
  }

  @Roles(...WRITE_ROLES)
  @Post()
  create(@Body() dto: CreateAssetDto, @CurrentUser() user: AuthUser) {
    return this.assets.create(dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateAssetDto) {
    return this.assets.update(id, dto);
  }

  @Roles(...ADMIN_ROLES)
  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.assets.delete(id);
  }
}
