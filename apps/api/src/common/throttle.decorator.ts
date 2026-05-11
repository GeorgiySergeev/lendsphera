import { SetMetadata } from "@nestjs/common";

export const THROTTLE_SKIP_KEY = "THROTTLE_SKIP";

/**
 * Decorator to skip throttling on specific endpoints.
 * Usage: @Throttle.Skip()
 */
export const Throttle = {
  Skip: () => SetMetadata(THROTTLE_SKIP_KEY, true)
};
