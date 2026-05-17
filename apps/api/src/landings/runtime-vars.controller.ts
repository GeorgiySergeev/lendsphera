import { Controller, Get, Param, Req, Res, UseGuards } from "@nestjs/common";
import {
  ApiHeader,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import type { Request, Response } from "express";

import { RuntimeVarsGuard } from "./runtime-vars.guard";
import { RuntimeVarsService } from "./runtime-vars.service";

@ApiTags("Runtime Vars")
@Controller("v1/landings")
export class RuntimeVarsController {
  constructor(private readonly runtimeVars: RuntimeVarsService) {}

  @ApiHeader({ name: "X-LS-Bridge-Key", required: true })
  @ApiOkResponse({ description: "Signed runtime vars payload" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid X-LS-Bridge-Key" })
  @UseGuards(RuntimeVarsGuard)
  @Get(":id/runtime-vars")
  async byLandingId(
    @Param("id") id: string,
    @Req() request: Request,
    @Res() response: Response
  ) {
    const { etag, payload } = await this.runtimeVars.getByLandingId(id);
    const incomingEtag = request.header("if-none-match");

    response.setHeader("ETag", etag);
    response.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");

    if (incomingEtag && incomingEtag === etag) {
      response.status(304).send();
      return;
    }

    response.status(200).json(payload);
  }
}
