import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { CurrentUser, type AuthUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { WRITE_ROLES, Roles } from "../common/roles";
import { RolesGuard } from "../common/roles.guard";
import { WebhooksService } from "./webhooks.service";

const createWebhookSchema = z.object({
  url: z.string().url(),
  secret: z.string().min(16),
  enabled: z.boolean().default(true)
});

export class CreateWebhookDto extends createZodDto(createWebhookSchema) {}

@ApiTags("Webhooks")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("v1/webhooks")
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Roles(...WRITE_ROLES)
  @Get()
  list() {
    return this.webhooks.list();
  }

  @Roles(...WRITE_ROLES)
  @Post()
  create(@Body() body: CreateWebhookDto, @CurrentUser() user: AuthUser) {
    return this.webhooks.create(body.url, body.secret, body.enabled, user.id);
  }

  @Roles(...WRITE_ROLES)
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.webhooks.remove(id, user.id);
  }
}
