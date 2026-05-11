import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { THROTTLE_SKIP_KEY } from "./throttle.decorator";

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(THROTTLE_SKIP_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (skip) return true;
    return super.canActivate(context);
  }
}
