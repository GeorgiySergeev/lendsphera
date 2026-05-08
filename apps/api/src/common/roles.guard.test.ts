import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { RolesGuard } from "./roles.guard";
import { ROLES_KEY } from "./roles";

function contextWithRole(role?: Role): ExecutionContext {
  return {
    getHandler: () => "handler",
    getClass: () => "class",
    switchToHttp: () => ({
      getRequest: () => ({
        user: role ? { id: "user_1", email: "user@example.com", role } : undefined
      })
    })
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  it("allows users with one of the required roles", () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = (() => [
      Role.ADMIN
    ]) as typeof reflector.getAllAndOverride;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(contextWithRole(Role.ADMIN))).toBe(true);
  });

  it("blocks users without a required role", () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = ((key: string) =>
      key === ROLES_KEY
        ? [Role.ADMIN]
        : undefined) as unknown as typeof reflector.getAllAndOverride;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(contextWithRole(Role.VIEWER))).toBe(false);
  });
});
