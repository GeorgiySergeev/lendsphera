import { JwtService } from "@nestjs/jwt";
import { Role } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { TokensService } from "./tokens.service";

describe("TokensService", () => {
  it("creates unique refresh tokens and stable hashes", () => {
    const service = new TokensService(new JwtService());
    const first = service.createRefreshToken();
    const second = service.createRefreshToken();

    expect(first).not.toBe(second);
    expect(service.hashRefreshToken(first)).toBe(service.hashRefreshToken(first));
    expect(service.hashRefreshToken(first)).not.toBe(first);
  });

  it("creates an access token", () => {
    const service = new TokensService(new JwtService());
    const token = service.createAccessToken({
      id: "user_1",
      email: "user@example.com",
      role: Role.ADMIN
    });

    expect(token.split(".")).toHaveLength(3);
  });
});
