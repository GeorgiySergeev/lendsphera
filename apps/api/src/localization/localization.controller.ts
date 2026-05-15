import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { READ_ROLES, Roles } from "../common/roles";
import { RolesGuard } from "../common/roles.guard";
import {
  LocalizationService,
  type LocalizationStatusResponse
} from "./localization.service";

@ApiTags("Localization")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("localization")
export class LocalizationController {
  constructor(private readonly localization: LocalizationService) {}

  @Roles(...READ_ROLES)
  @Get()
  status(): LocalizationStatusResponse {
    return this.localization.getStatus();
  }
}
