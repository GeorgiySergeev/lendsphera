import { Injectable } from "@nestjs/common";
import { Role } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

export type LandingPublishPolicy = {
  requireApprovals: number;
  roles: Role[];
};

const defaultPolicy: LandingPublishPolicy = {
  requireApprovals: 1,
  roles: [Role.ADMIN]
};

@Injectable()
export class PolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getLandingPublishPolicy(): Promise<LandingPublishPolicy> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: "landing_publish_policy" }
    });

    if (!setting?.value || typeof setting.value !== "object") {
      return defaultPolicy;
    }

    const source = setting.value as Record<string, unknown>;
    const requireApprovals =
      typeof source.requireApprovals === "number" &&
      Number.isFinite(source.requireApprovals)
        ? Math.max(0, Math.floor(source.requireApprovals))
        : defaultPolicy.requireApprovals;
    const roles = Array.isArray(source.roles)
      ? source.roles.filter(
          (role): role is Role =>
            typeof role === "string" && Object.values(Role).includes(role as Role)
        )
      : defaultPolicy.roles;

    return {
      requireApprovals,
      roles: roles.length ? roles : defaultPolicy.roles
    };
  }
}
