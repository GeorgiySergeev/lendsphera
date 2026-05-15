import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { READ_ROLES, Roles } from "../common/roles";
import { RolesGuard } from "../common/roles.guard";
import { MediaService, type MediaStatusResponse } from "./media.service";

@ApiTags("Media")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("media")
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Roles(...READ_ROLES)
  @Get()
  status(): MediaStatusResponse {
    return this.media.getStatus();
  }
}
