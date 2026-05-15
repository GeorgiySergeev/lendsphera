import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { READ_ROLES, Roles } from "../common/roles";
import { RolesGuard } from "../common/roles.guard";
import { DownloadService, type DownloadStatusResponse } from "./download.service";

@ApiTags("Download")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("download")
export class DownloadController {
  constructor(private readonly download: DownloadService) {}

  @Roles(...READ_ROLES)
  @Get()
  status(): DownloadStatusResponse {
    return this.download.getStatus();
  }
}
