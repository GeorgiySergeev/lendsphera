import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { Role } from "@prisma/client";
import { compare } from "bcryptjs";

import { PrismaService } from "../prisma/prisma.service";
import { TokensService } from "./tokens.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService
  ) {}

  async login(
    email: string,
    password: string,
    meta: { userAgent?: string; ip?: string }
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
        isActive: true
      }
    });

    if (!user?.passwordHash || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    return this.issueTokenPair(user, meta);
  }

  async refresh(refreshToken: string, meta: { userAgent?: string; ip?: string }) {
    const tokenHash = this.tokens.hashRefreshToken(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshToken: tokenHash },
      include: { user: true }
    });

    if (
      !session ||
      session.expiresAt <= new Date() ||
      !session.user.isActive ||
      session.user.deletedAt
    ) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    await this.prisma.session.delete({ where: { id: session.id } });

    return this.issueTokenPair(session.user, meta);
  }

  async logout(refreshToken: string) {
    const tokenHash = this.tokens.hashRefreshToken(refreshToken);

    await this.prisma.session.deleteMany({
      where: { refreshToken: tokenHash }
    });

    return { success: true };
  }

  async me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  private async issueTokenPair(
    user: { id: string; email: string; role: Role },
    meta: { userAgent?: string; ip?: string }
  ) {
    const accessToken = this.tokens.createAccessToken(user);
    const refreshToken = this.tokens.createRefreshToken();

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: this.tokens.hashRefreshToken(refreshToken),
        userAgent: meta.userAgent,
        ip: meta.ip,
        expiresAt: this.tokens.getRefreshExpiry()
      }
    });

    return {
      accessToken,
      refreshToken,
      user: await this.me(user.id)
    };
  }
}
