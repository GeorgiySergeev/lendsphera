import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

import { CurrentUser, type AuthUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { ADMIN_ROLES, READ_ROLES, Roles, WRITE_ROLES } from "../common/roles";
import { RolesGuard } from "../common/roles.guard";
import {
  CreateLegacyDto,
  CreateLegacyFileDto,
  ImportLinkDto,
  LegacyAssetQueryDto,
  LegacyFileContentDto,
  LegacyFilesQueryDto,
  LegacyGitConnectDto,
  LegacyImportAsLandingDto,
  LegacyListQueryDto,
  LegacyUploadQueryDto,
  UpdateLegacyDto
} from "./legacy.dto";
import { LegacyService } from "./legacy.service";

@ApiTags("Legacy")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("legacy")
export class LegacyController {
  constructor(private readonly legacy: LegacyService) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@Query() query: LegacyListQueryDto) {
    return this.legacy.list(query);
  }

  @Roles(...WRITE_ROLES)
  @Post("upload")
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: { type: "string", format: "binary" }
        }
      }
    }
  })
  @UseInterceptors(FilesInterceptor("files", 50))
  upload(
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Query() query: LegacyUploadQueryDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.legacy.upload(files, query, user);
  }

  @Roles(...WRITE_ROLES)
  @Post("git/connect")
  connectGitRepository(@Body() dto: LegacyGitConnectDto, @CurrentUser() user: AuthUser) {
    return this.legacy.connectGitRepository(dto, user);
  }

  @Roles(...READ_ROLES)
  @Get("files/:fileId/content")
  getFileContent(@Param("fileId") fileId: string) {
    return this.legacy.getFileContent(fileId);
  }

  @Roles(...WRITE_ROLES)
  @Put("files/:fileId/content")
  saveFileContent(
    @Param("fileId") fileId: string,
    @Body() dto: LegacyFileContentDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.legacy.saveFileContent(fileId, dto, user);
  }

  @Roles(...READ_ROLES)
  @Get("files/:fileId/preview")
  @Header(
    "Content-Security-Policy",
    "default-src 'self' 'unsafe-inline' data: blob:; img-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  )
  async previewHtml(@Param("fileId") fileId: string, @Res() response: Response) {
    const html = await this.legacy.previewHtml(fileId);
    response.type("text/html; charset=utf-8").send(html);
  }

  @Roles(...READ_ROLES)
  @Get("files/:fileId/asset")
  async getRelativeAsset(
    @Param("fileId") fileId: string,
    @Query() query: LegacyAssetQueryDto,
    @Res() response: Response
  ) {
    const { buffer, file } = await this.legacy.getRelativeAsset(fileId, query);
    response.type(file.mimeType ?? "application/octet-stream").send(buffer);
  }

  @Roles(...WRITE_ROLES)
  @Post("files/:fileId/import-as-landing")
  importAsLanding(
    @Param("fileId") fileId: string,
    @Body() dto: LegacyImportAsLandingDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.legacy.importAsLanding(fileId, dto, user);
  }

  @Roles(...READ_ROLES)
  @Get(":id/tree")
  tree(@Param("id") id: string) {
    return this.legacy.tree(id);
  }

  @Roles(...READ_ROLES)
  @Get(":id/files")
  listFiles(@Param("id") id: string, @Query() query: LegacyFilesQueryDto) {
    return this.legacy.listFiles(id, query);
  }

  @Roles(...WRITE_ROLES)
  @Post(":id/sync")
  syncGitRepository(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.legacy.syncGitRepository(id, user);
  }

  @Roles(...WRITE_ROLES)
  @Post(":id/files")
  createFile(@Param("id") id: string, @Body() dto: CreateLegacyFileDto) {
    return this.legacy.createFile(id, dto);
  }

  @Roles(...ADMIN_ROLES)
  @Delete("files/:fileId")
  deleteFile(@Param("fileId") fileId: string) {
    return this.legacy.deleteFile(fileId);
  }

  @Roles(...ADMIN_ROLES)
  @Post(":id/import-link")
  importLink(@Param("id") id: string, @Body() dto: ImportLinkDto) {
    return this.legacy.importLink(id, dto);
  }

  @Roles(...READ_ROLES)
  @Get(":id")
  get(@Param("id") id: string) {
    return this.legacy.get(id);
  }

  @Roles(...WRITE_ROLES)
  @Post()
  create(@Body() dto: CreateLegacyDto) {
    return this.legacy.create(dto);
  }

  @Roles(...WRITE_ROLES)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateLegacyDto) {
    return this.legacy.update(id, dto);
  }

  @Roles(...ADMIN_ROLES)
  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.legacy.delete(id);
  }
}
