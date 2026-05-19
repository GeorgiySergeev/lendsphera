import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { Roles, WRITE_ROLES } from "../common/roles";
import { RolesGuard } from "../common/roles.guard";
import { ZipImportService } from "./zip-import.service";
import { CreateLandingFromZipDto } from "./zip-import.dto";

@ApiTags("ZIP Import")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("zip-import")
export class ZipImportController {
  constructor(private readonly zipImport: ZipImportService) {}

  @Roles(...WRITE_ROLES)
  @Post("landings")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  async createLandingFromZip(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateLandingFromZipDto,
    @CurrentUser() user: AuthUser
  ) {
    if (!file) {
      throw new BadRequestException("No ZIP file provided.");
    }

    return this.zipImport.createFromZip(
      {
        name: dto.name,
        slug: dto.slug,
        geoId: dto.geoId,
        categoryId: dto.categoryId,
        variantId: dto.variantId,
        templateId: dto.templateId,
        publicId: dto.publicId,
        file
      },
      user
    );
  }

  @Roles(...WRITE_ROLES)
  @Post("landings/:landingId/replace")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  async replaceLandingDraft(
    @Param("landingId") landingId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser
  ) {
    if (!file) {
      throw new BadRequestException("No ZIP file provided.");
    }

    return this.zipImport.replaceDraft({ landingId, file }, user);
  }
}
