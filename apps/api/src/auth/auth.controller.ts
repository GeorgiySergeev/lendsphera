import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response } from "express";
import type { User } from "@prisma/client";

import { Throttle as CustomThrottle } from "../common/throttle.decorator";
import { CurrentUser, type AuthUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { env } from "../config/env";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto } from "./auth.dto";

// ────────────────────────────────────────────────────────────────
// Cookie configuration — single source of truth for all endpoints
// ────────────────────────────────────────────────────────────────

const REFRESH_TOKEN_COOKIE = "refreshToken" as const;

const REFRESH_COOKIE_MAX_AGE_MS =
  Number.parseInt(env.JWT_REFRESH_EXPIRES_DAYS, 10) * 24 * 60 * 60 * 1000;

/**
 * Returns a consistent cookie options object.
 * `httpOnly`  — prevents JavaScript access (XSS mitigation).
 * `secure`    — HTTPS-only in production.
 * `sameSite`  — blocks cross-site cookie sending (CSRF mitigation).
 * `path`      — cookie is available on every route.
 */
function refreshCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge?: number;
} {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // ──────────── REGISTER ────────────
  @Post("register")
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, accessToken, refreshToken } = await this.auth.register(
      dto,
      this.getMeta(request),
    );

    response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...refreshCookieOptions(),
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });

    return { accessToken, user };
  }

  // ──────────── LOGIN ────────────
  @Post("login")
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, accessToken, refreshToken } = await this.auth.login(
      dto.email,
      dto.password,
      this.getMeta(request),
    );

    // Set refresh token in HttpOnly cookie — inaccessible to JavaScript
    response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...refreshCookieOptions(),
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });

    // Access token returned in body (short-lived — 15 min)
    return { accessToken, user };
  }

  // ──────────── REFRESH ────────────
  @Post("refresh")
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Read refresh token from HttpOnly cookie (auto-parsed by cookie-parser)
    const oldRefreshToken = (request.cookies as Record<string, string>)?.[
      REFRESH_TOKEN_COOKIE
    ];

    if (!oldRefreshToken) {
      throw new UnauthorizedException("Refresh token not found in cookies");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await this.auth.refresh(oldRefreshToken, this.getMeta(request));

    // Rotate refresh token cookie
    response.cookie(REFRESH_TOKEN_COOKIE, newRefreshToken, {
      ...refreshCookieOptions(),
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });

    // Only access token in the body — refresh token lives in the cookie
    return { accessToken };
  }

  // ──────────── LOGOUT ────────────
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @CustomThrottle.Skip()
  @Post("logout")
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = (request.cookies as Record<string, string>)?.[
      REFRESH_TOKEN_COOKIE
    ];

    if (refreshToken) {
      await this.auth.logout(refreshToken);
    }

    // Clear cookie (set expiry in the past)
    response.clearCookie(REFRESH_TOKEN_COOKIE, refreshCookieOptions());

    return { message: "Logged out successfully" };
  }

  // ──────────── ME ────────────
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  // ──────────── GOOGLE OAUTH ────────────
  @Get("google")
  @UseGuards(AuthGuard("google"))
  googleStart() {
    // Passport redirects to Google — no body needed
  }

  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  async googleCallback(
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const user = request.user as User;
    const { accessToken, refreshToken } = await this.auth.issueTokenPair(
      user,
      this.getMeta(request),
    );

    response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...refreshCookieOptions(),
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });

    const redirect = new URL(env.GOOGLE_OAUTH_SUCCESS_REDIRECT!);
    redirect.hash = `accessToken=${encodeURIComponent(accessToken)}`;
    response.redirect(redirect.toString());
  }

  // ──────────── HELPERS ────────────
  private getMeta(request: Request) {
    return {
      userAgent: request.headers["user-agent"],
      ip: request.ip,
    };
  }
}
