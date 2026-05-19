import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Res,
  UnauthorizedException
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

import { verifyEditorAssetToken } from "./editor-asset-token";
import { LandingsService } from "./landings.service";

@ApiTags("Landings")
@Controller("landings")
export class LandingImportedAssetsController {
  constructor(private readonly landings: LandingsService) {}

  @Get(":id/imported-assets/*assetPath")
  streamImportedAsset(
    @Param("id") id: string,
    @Param("assetPath") assetPathParam: string | string[],
    @Query("token") token: string | undefined,
    @Res() response: Response
  ) {
    const payload = verifyEditorAssetToken(token);
    if (!payload || payload.landingId !== id) {
      throw new UnauthorizedException("Invalid or expired editor asset token.");
    }

    const rawPath = Array.isArray(assetPathParam)
      ? assetPathParam.join("/")
      : assetPathParam;
    const assetPath = rawPath
      .split("/")
      .map((segment) => decodeURIComponent(segment))
      .join("/");

    if (!assetPath) {
      throw new BadRequestException("Asset path is required.");
    }

    return this.landings.streamImportedAsset(id, assetPath, response, token);
  }
}
