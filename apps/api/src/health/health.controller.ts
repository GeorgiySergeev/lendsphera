import { Controller, Get } from "@nestjs/common";
import type { HealthResponse } from "@workspace/types";

@Controller("health")
export class HealthController {
  @Get()
  health(): HealthResponse {
    return {
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString()
    };
  }
}
