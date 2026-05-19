import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { READ_ROLES, Roles, WRITE_ROLES } from "../common/roles";
import { RolesGuard } from "../common/roles.guard";
import {
  BulkDeleteAssetsDto,
  CreateFolderDto,
  MediaListQueryDto,
  MoveAssetsDto,
  MoveFolderDto,
  RenameFolderDto,
  UpdateAssetDto
} from "./media.dto";
import { mediaUploadConfig } from "./media.multer";
import { MediaService } from "./media.service";

@ApiTags("Media")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("media")
export class MediaController {
  constructor(private readonly media: MediaService) {}

  /* ───────── FOLDER ROUTES ───────── */

  @Roles(...READ_ROLES)
  @Get("folders")
  listFolders(
    @Query("parentId") parentId: string | undefined,
    @CurrentUser() user: AuthUser
  ) {
    return this.media.listFolders(parentId, user);
  }

  @Roles(...WRITE_ROLES)
  @Post("folders")
  @HttpCode(HttpStatus.CREATED)
  createFolder(@Body() dto: CreateFolderDto, @CurrentUser() user: AuthUser) {
    return this.media.createFolder(dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Patch("folders/:id")
  renameFolder(
    @Param("id") id: string,
    @Body() dto: RenameFolderDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.media.renameFolder(id, dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Patch("folders/:id/move")
  moveFolder(
    @Param("id") id: string,
    @Body() dto: MoveFolderDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.media.moveFolder(id, dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Delete("folders/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFolder(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    await this.media.deleteFolder(id, user);
  }

  /* ───────── ASSET ROUTES ───────── */

  @Roles(...READ_ROLES)
  @Get()
  listMedia(@Query() query: MediaListQueryDto, @CurrentUser() user: AuthUser) {
    return this.media.listMedia(query, user);
  }

  @Roles(...WRITE_ROLES)
  @Post("upload")
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FilesInterceptor("files", 20, mediaUploadConfig))
  uploadAssets(
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Body("folderId") folderId: string | undefined,
    @Body("landingId") landingId: string | undefined,
    @CurrentUser() user: AuthUser
  ) {
    if (!files?.length) {
      throw new BadRequestException("No files provided");
    }

    return Promise.all(
      files.map((file) => this.media.uploadAsset(file, folderId, landingId, user))
    );
  }

  @Roles(...READ_ROLES)
  @Get(":id/content")
  streamAssetContent(
    @Param("id") id: string,
    @Query("download") download: string | undefined,
    @CurrentUser() user: AuthUser,
    @Res() response: Response
  ) {
    return this.media.streamAssetContent(id, user, response, download === "1");
  }

  @Roles(...READ_ROLES)
  @Get(":id")
  getAsset(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.media.getAsset(id, user);
  }

  @Roles(...WRITE_ROLES)
  @Patch(":id")
  updateAsset(
    @Param("id") id: string,
    @Body() dto: UpdateAssetDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.media.updateAsset(id, dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Post("move")
  moveAssets(@Body() dto: MoveAssetsDto, @CurrentUser() user: AuthUser) {
    return this.media.moveAssets(dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Post("delete")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAssets(@Body() dto: BulkDeleteAssetsDto, @CurrentUser() user: AuthUser) {
    await this.media.deleteAssets(dto, user);
  }
}
