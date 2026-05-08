import { randomBytes, createHash } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Role, User } from "@prisma/client";

import { env } from "../config/env";

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
};

@Injectable()
export class TokensService {
  constructor(private readonly jwt: JwtService) {}

  createAccessToken(user: Pick<User, "id" | "email" | "role">) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role
    };

    return this.jwt.sign(payload as object, {
      secret: env.JWT_ACCESS_SECRET,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as never
    });
  }

  createRefreshToken() {
    return randomBytes(48).toString("base64url");
  }

  hashRefreshToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  getRefreshExpiry() {
    const days = Number.parseInt(env.JWT_REFRESH_EXPIRES_DAYS, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    return expiresAt;
  }
}
