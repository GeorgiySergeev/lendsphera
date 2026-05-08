import { afterEach, describe, expect, it } from "vitest";

import { useAuthStore } from "../../stores/auth-store";
import { apiClient } from "./client";

describe("apiClient", () => {
  afterEach(() => {
    useAuthStore.getState().clearSession();
  });

  it("attaches the persisted access token as a bearer token", async () => {
    useAuthStore.getState().setSession({
      accessToken: "access-token-123",
      refreshToken: "refresh-token-123",
      user: {
        email: "admin@example.test",
        id: "user_1",
        name: "Admin Desk"
      }
    });

    const response = await apiClient.get("/interceptor-probe", {
      adapter: async (config) => ({
        config,
        data: {
          authorization: config.headers.Authorization
        },
        headers: {},
        status: 200,
        statusText: "OK"
      })
    });

    expect(response.data.authorization).toBe("Bearer access-token-123");
  });
});
