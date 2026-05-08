import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { JwtPayload } from "./tokens.service";
import { env } from "../config/env";
import type { AuthUser } from "../common/current-user.decorator";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.JWT_ACCESS_SECRET
    });
  }

  validate(payload: JwtPayload): AuthUser {
    if (!payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException("Invalid token payload.");
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role
    };
  }
}
