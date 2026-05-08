import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { READ_ROLES, Roles, WRITE_ROLES } from "../common/roles";
import { RolesGuard } from "../common/roles.guard";
import { PublishService } from "./publish.service";

@ApiTags("Publish")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("landings/:landingId")
export class PublishController {
  constructor(private readonly publishService: PublishService) {}

  @Roles(...WRITE_ROLES)
  @Post("publish")
  publish(@Param("landingId") landingId: string, @CurrentUser() user: AuthUser) {
    return this.publishService.enqueuePublishJob(landingId, user);
  }

  @Roles(...READ_ROLES)
  @Get("publish/:jobId")
  getJob(@Param("jobId") jobId: string) {
    return this.publishService.getJobStatus(jobId);
  }

  @Roles(...WRITE_ROLES)
  @Post("build-preview")
  buildPreview(@Param("landingId") landingId: string) {
    return this.publishService.buildPreview(landingId);
  }
}
