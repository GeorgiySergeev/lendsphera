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
  GeoLocalesListQueryDto,
  ImportGeosDto,
  ReorderGeosDto,
  UpdateGeoDto
} from "./geos.dto";
import { GeoLocalesService } from "./geo-locales.service";
import { GeosService } from "./geos.service";

@ApiTags("Geos")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("geos")
export class GeosController {
  constructor(
    private readonly geos: GeosService,
    private readonly geoLocales: GeoLocalesService
  ) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@Query() query: GeoListQueryDto) {
    return this.geos.list(query);
  }

  @Roles(...READ_ROLES)
  @Get("locales/countries/:code/meta")
  getCountryCatalogMeta(@Param("code") code: string) {
    return this.geoLocales.getCountryCatalogMeta(code);
  }

  @Roles(...READ_ROLES)
  @Get("locales/countries/:code")
  listLocalesForCountry(@Param("code") code: string) {
    return this.geoLocales.getCountryLocales(code);
  }

  @Roles(...READ_ROLES)
  @Get("locales")
  listLocales(@Query() query: GeoLocalesListQueryDto) {
    return this.geoLocales.listLocales(query);
  }

  @Roles(...READ_ROLES)
  @Get("id/:id")
  getById(@Param("id") id: string) {
    return this.geos.get(id);
  }

  @Roles(...READ_ROLES)
  @Get(":code")
  getByCode(@Param("code") code: string) {
    return this.geos.getByCode(code);
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
