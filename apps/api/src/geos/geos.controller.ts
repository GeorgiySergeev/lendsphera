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

import { ADMIN_ROLES, READ_ROLES, Roles, WRITE_ROLES } from "../common/roles";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { RolesGuard } from "../common/roles.guard";
import {
  CreateGeoDto,
  GeoListQueryDto,
  ImportGeosDto,
  ReorderGeosDto,
  UpdateGeoDto
} from "./geos.dto";
import { GeosService } from "./geos.service";

@ApiTags("Geos")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("geos")
export class GeosController {
  constructor(private readonly geos: GeosService) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@Query() query: GeoListQueryDto) {
    return this.geos.list(query);
  }

  @Roles(...READ_ROLES)
  @Get(":id")
  get(@Param("id") id: string) {
    return this.geos.get(id);
  }

  @Roles(...WRITE_ROLES)
  @Patch("reorder")
  reorder(@Body() dto: ReorderGeosDto) {
    return this.geos.reorder(dto);
  }

  @Roles(...WRITE_ROLES)
  @Post("import")
  import(@Body() dto: ImportGeosDto) {
    return this.geos.import(dto);
  }

  @Roles(...WRITE_ROLES)
  @Post()
  create(@Body() dto: CreateGeoDto) {
    return this.geos.create(dto);
  }

  @Roles(...WRITE_ROLES)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateGeoDto) {
    return this.geos.update(id, dto);
  }

  @Roles(...ADMIN_ROLES)
  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.geos.delete(id);
  }
}
