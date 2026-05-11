import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthService } from "./auth.service";

// ────────────────────────────────────────────────────────────────
// Module mocks
// ────────────────────────────────────────────────────────────────

vi.mock("../config/env", () => ({
  env: {
    JWT_ACCESS_SECRET: "test-access-secret-32-chars-minimum",
    JWT_REFRESH_SECRET: "test-refresh-secret-32-chars-minimum",
    JWT_ACCESS_EXPIRES_IN: "15m",
    JWT_REFRESH_EXPIRES_DAYS: "30",
    NODE_ENV: "test",
  },
}));

vi.mock("bcryptjs", () => ({
  compare: vi.fn(),
  hash: vi.fn(),
}));

import { compare, hash } from "bcryptjs";

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

const makeUser = (overrides = {}) => ({
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  passwordHash: "hashed-password",
  role: "EDITOR" as const,
  isActive: true,
  avatarUrl: null,
  lastLoginAt: null,
  emailVerified: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

const makeSession = () => ({
  id: "session-1",
  userId: "user-1",
  refreshToken: "hashed-refresh",
  userAgent: null,
  ip: null,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
});

const makeMeta = () => ({ userAgent: "test-agent", ip: "127.0.0.1" });

// ────────────────────────────────────────────────────────────────
// Mocked dependencies
// ────────────────────────────────────────────────────────────────

function makePrismaMock() {
  return {
    user: {
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    oAuthAccount: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

function makeTokensMock() {
  return {
    createAccessToken: vi.fn().mockReturnValue("access-token"),
    createRefreshToken: vi.fn().mockReturnValue("refresh-token"),
    hashRefreshToken: vi.fn().mockReturnValue("hashed-refresh"),
    getRefreshExpiry: vi.fn().mockReturnValue(new Date(Date.now() + 86400000)),
  };
}

// ────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────

describe("AuthService", () => {
  let service: AuthService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let tokens: ReturnType<typeof makeTokensMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrismaMock();
    tokens = makeTokensMock();
    service = new AuthService(prisma as never, tokens as never);
  });

  // ──────────────────────────────────────────────
  // login
  // ──────────────────────────────────────────────

  describe("login", () => {
    it("returns tokens on valid credentials", async () => {
      const user = makeUser();
      prisma.user.findFirst.mockResolvedValue(user);
      vi.mocked(compare).mockResolvedValue(true as never);
      prisma.user.update.mockResolvedValue(user);
      prisma.session.create.mockResolvedValue(makeSession());
      prisma.user.findUniqueOrThrow.mockResolvedValue(user);

      const result = await service.login("test@example.com", "password123", makeMeta());

      expect(result.accessToken).toBe("access-token");
      expect(result.refreshToken).toBe("refresh-token");
    });

    it("throws UnauthorizedException on wrong password", async () => {
      prisma.user.findFirst.mockResolvedValue(makeUser());
      vi.mocked(compare).mockResolvedValue(false as never);

      await expect(
        service.login("test@example.com", "wrong", makeMeta())
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("throws UnauthorizedException when user not found", async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login("nobody@example.com", "password", makeMeta())
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ──────────────────────────────────────────────
  // register
  // ──────────────────────────────────────────────

  describe("register", () => {
    const dto = { email: "new@example.com", password: "password123", name: "New User" };

    it("creates a user with hashed password and returns tokens", async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      vi.mocked(hash).mockResolvedValue("hashed-password" as never);
      const user = makeUser({ email: dto.email, name: dto.name });
      prisma.user.create.mockResolvedValue(user);
      prisma.session.create.mockResolvedValue(makeSession());
      prisma.user.findUniqueOrThrow.mockResolvedValue(user);

      const result = await service.register(dto, makeMeta());

      expect(hash).toHaveBeenCalledWith("password123", 10);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: dto.email,
            name: dto.name,
            passwordHash: "hashed-password",
            role: "EDITOR",
            isActive: true,
          }),
        })
      );
      expect(result.accessToken).toBe("access-token");
    });

    it("throws ConflictException when email already exists", async () => {
      prisma.user.findFirst.mockResolvedValue(makeUser());

      await expect(service.register(dto, makeMeta())).rejects.toBeInstanceOf(
        ConflictException
      );
    });

    it("throws ConflictException with correct message", async () => {
      prisma.user.findFirst.mockResolvedValue(makeUser());

      await expect(service.register(dto, makeMeta())).rejects.toThrow(
        "Email already in use"
      );
    });
  });

  // ──────────────────────────────────────────────
  // upsertOAuthUser
  // ──────────────────────────────────────────────

  describe("upsertOAuthUser", () => {
    const oauthInput = {
      provider: "GOOGLE" as const,
      providerAccountId: "google-sub-123",
      email: "oauth@example.com",
      name: "OAuth User",
      avatarUrl: "https://example.com/avatar.jpg",
    };

    it("returns existing user when OAuthAccount already exists", async () => {
      const user = makeUser({ email: oauthInput.email });
      const account = { userId: user.id, user };

      prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        const tx = {
          ...prisma,
          oAuthAccount: {
            findUnique: vi.fn().mockResolvedValue(account),
            create: vi.fn(),
          },
          user: {
            ...prisma.user,
            update: vi.fn().mockResolvedValue(user),
          },
        };
        return fn(tx as never);
      });

      const result = await service.upsertOAuthUser(oauthInput);

      expect(result).toEqual(user);
    });

    it("links OAuth account to existing user when email matches", async () => {
      const user = makeUser({ email: oauthInput.email });

      prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        const tx = {
          ...prisma,
          oAuthAccount: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({}),
          },
          user: {
            ...prisma.user,
            findFirst: vi.fn().mockResolvedValue(user),
            update: vi.fn().mockResolvedValue(user),
            create: vi.fn(),
          },
        };
        return fn(tx as never);
      });

      const result = await service.upsertOAuthUser(oauthInput);

      expect(result).toEqual(user);
    });

    it("creates a new user with OAuthAccount when no matching email exists", async () => {
      const newUser = makeUser({
        email: oauthInput.email,
        name: oauthInput.name,
        passwordHash: null,
        emailVerified: new Date(),
      });

      prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        const tx = {
          ...prisma,
          oAuthAccount: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
          },
          user: {
            ...prisma.user,
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue(newUser),
          },
        };
        return fn(tx as never);
      });

      const result = await service.upsertOAuthUser(oauthInput);

      expect(result).toEqual(newUser);
    });
  });
});
