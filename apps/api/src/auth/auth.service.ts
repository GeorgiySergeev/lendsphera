import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import type { OAuthProvider, Role } from "@prisma/client";
import { compare, hash } from "bcryptjs";

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

  async register(
    dto: { email: string; password: string; name: string },
    meta: { userAgent?: string; ip?: string }
  ) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException("Email already in use");
    }

    const passwordHash = await hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: "EDITOR",
        isActive: true,
        emailVerified: null,
      },
    });

    return this.issueTokenPair(user, meta);
  }

  async upsertOAuthUser(input: {
    provider: OAuthProvider;
    providerAccountId: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const existingAccount = await tx.oAuthAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: input.provider,
            providerAccountId: input.providerAccountId,
          },
        },
        include: { user: true },
      });

      if (existingAccount) {
        await tx.user.update({
          where: { id: existingAccount.userId },
          data: { lastLoginAt: new Date() },
        });
        return existingAccount.user;
      }

      let user = await tx.user.findFirst({
        where: { email: input.email, deletedAt: null },
      });

      if (user) {
        await tx.oAuthAccount.create({
          data: {
            provider: input.provider,
            providerAccountId: input.providerAccountId,
            email: input.email,
            userId: user.id,
          },
        });
        await tx.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
      } else {
        user = await tx.user.create({
          data: {
            email: input.email,
            name: input.name,
            avatarUrl: input.avatarUrl,
            passwordHash: null,
            role: "EDITOR",
            isActive: true,
            emailVerified: new Date(),
            lastLoginAt: new Date(),
            oauthAccounts: {
              create: {
                provider: input.provider,
                providerAccountId: input.providerAccountId,
                email: input.email,
              },
            },
          },
        });
      }

      return user;
    });
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

  async issueTokenPair(
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
