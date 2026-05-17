import { Controller, Get } from "@nestjs/common";

type HealthResponse = {
  status: "ok";
  service: string;
  timestamp: string;
};

@Controller(["health", "v1/health"])
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
