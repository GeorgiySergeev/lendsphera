import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { READ_ROLES, Roles } from "../common/roles";
import { RolesGuard } from "../common/roles.guard";
import { AuditLogListQueryDto } from "./audit.dto";
import { AuditService } from "./audit.service";

@ApiTags("Audit")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("audit")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@Query() query: AuditLogListQueryDto) {
    return this.audit.list(query);
  }

  @Roles(...READ_ROLES)
  @Get("landings/:id")
  listByLanding(@Param("id") id: string, @Query() query: AuditLogListQueryDto) {
    return this.audit.listByLanding(id, query);
  }
}
