import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { Roles, WRITE_ROLES } from "../common/roles";
import { RolesGuard } from "../common/roles.guard";
import { BulkLandingOperationDto } from "./landings.dto";
import { LandingsService } from "./landings.service";

@ApiTags("Landings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("landings")
export class LandingBulkController {
  constructor(private readonly landings: LandingsService) {}

  @Roles(...WRITE_ROLES)
  @Post("bulk")
  bulkOperate(@Body() dto: BulkLandingOperationDto, @CurrentUser() user: AuthUser) {
    return this.landings.bulkOperate(dto, user);
  }
}
