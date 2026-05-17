import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";

import { env } from "../config/env";

@Injectable()
export class RuntimeVarsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string> }>();
    const bridgeKey = request.headers["x-ls-bridge-key"];

    if (!bridgeKey || bridgeKey !== env.LS_BRIDGE_KEY) {
      throw new UnauthorizedException("Invalid bridge key.");
    }

    return true;
  }
}
