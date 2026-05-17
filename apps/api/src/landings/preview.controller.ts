import { Controller, NotFoundException, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { READ_ROLES, Roles } from "../common/roles";
import { RolesGuard } from "../common/roles.guard";
import { PrismaService } from "../prisma/prisma.service";
import { createPreviewToken, PREVIEW_TOKEN_TTL_SECONDS } from "./preview-token";

@ApiTags("Landings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("landings")
export class LandingPreviewController {
  constructor(private readonly prisma: PrismaService) {}

  @Roles(...READ_ROLES)
  @Post(":id/preview-token")
  async issuePreviewToken(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    const landing = await this.prisma.landing.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        geo: { select: { code: true } }
      }
    });

    if (!landing) {
      throw new NotFoundException("Landing not found.");
    }

    const token = createPreviewToken({
      landingId: landing.id,
      geo: landing.geo.code,
      slug: landing.slug,
      userId: user.id
    });

    return {
      token,
      geo: landing.geo.code.toLowerCase(),
      slug: landing.slug,
      expiresInSeconds: PREVIEW_TOKEN_TTL_SECONDS
    };
  }
}
