import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { READ_ROLES, Roles, WRITE_ROLES } from "../common/roles";
import { RolesGuard } from "../common/roles.guard";
import { ApprovalDecisionDto } from "./approvals.dto";
import { ApprovalsService } from "./approvals.service";

@ApiTags("Landings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("landings/:landingId")
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Roles(...READ_ROLES)
  @Get("approval-summary")
  summary(@Param("landingId") landingId: string) {
    return this.approvals.getApprovalSummary(landingId);
  }

  @Roles(...WRITE_ROLES)
  @Post("submit")
  submit(@Param("landingId") landingId: string, @CurrentUser() user: AuthUser) {
    return this.approvals.submit(landingId, user);
  }

  @Roles(...WRITE_ROLES)
  @Post("approve")
  approve(
    @Param("landingId") landingId: string,
    @Body() dto: ApprovalDecisionDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.approvals.approve(landingId, dto, user);
  }

  @Roles(...WRITE_ROLES)
  @Post("reject")
  reject(
    @Param("landingId") landingId: string,
    @Body() dto: ApprovalDecisionDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.approvals.reject(landingId, dto, user);
  }
}
