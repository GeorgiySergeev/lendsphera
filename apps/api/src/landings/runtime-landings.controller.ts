import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { RuntimeLandingsService } from "./runtime-landings.service";

class RuntimeLandingQueryDto {
  preview?: string;
}

@ApiTags("Runtime")
@Controller("v1/runtime/landings")
export class RuntimeLandingsController {
  constructor(private readonly runtimeLandings: RuntimeLandingsService) {}

  @Get(":geo/:slug")
  async byGeoAndSlug(
    @Param("geo") geo: string,
    @Param("slug") slug: string,
    @Query() query: RuntimeLandingQueryDto
  ) {
    const result = await this.runtimeLandings.getByGeoAndSlug(
      geo,
      slug,
      query.preview ?? null
    );

    if (!result) {
      throw new NotFoundException("Landing not found.");
    }

    return result;
  }
}
