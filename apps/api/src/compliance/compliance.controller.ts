import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { READ_ROLES, Roles, WRITE_ROLES } from "../common/roles";
import { RolesGuard } from "../common/roles.guard";
import {
  AcknowledgeComplianceIssueDto,
  ComplianceIssueListQueryDto
} from "./compliance.dto";
import { ComplianceService } from "./compliance.service";

@ApiTags("Compliance")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("compliance")
export class ComplianceController {
  constructor(private readonly compliance: ComplianceService) {}

  @Roles(...READ_ROLES)
  @Get("issues")
  listIssues(@Query() query: ComplianceIssueListQueryDto) {
    return this.compliance.listIssues(query);
  }

  @Roles(...WRITE_ROLES)
  @Post("issues/:id/acknowledge")
  acknowledge(
    @Param("id") id: string,
    @Body() dto: AcknowledgeComplianceIssueDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.compliance.acknowledgeIssue(id, dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Post("issues/:id/autofix")
  autoFix(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.compliance.autoFixIssue(id, user);
  }
}
