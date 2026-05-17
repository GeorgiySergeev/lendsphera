import { Controller, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { ADMIN_ROLES, Roles } from "../common/roles";
import { RolesGuard } from "../common/roles.guard";
import { LegacyImporterOrchestratorService } from "./orchestrator.service";

@ApiTags("Legacy Importer")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("v1/legacy/landings")
export class LegacyImporterController {
  constructor(private readonly orchestrator: LegacyImporterOrchestratorService) {}

  @Roles(...ADMIN_ROLES)
  @Post(":id/promote")
  promote(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.orchestrator.promoteWrappedLanding(id, user);
  }
}
