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
      user: {
        email: "admin@example.test",
        id: "user_1",
        name: "Admin Desk",
      },
    });

    const response = await apiClient.get("/interceptor-probe", {
      adapter: async (config) => ({
        config,
        data: {
          authorization: config.headers.Authorization,
        },
        headers: {},
        status: 200,
        statusText: "OK",
      }),
    });

    expect(response.data.authorization).toBe("Bearer access-token-123");
  });

  it("does not include refreshToken in store state", () => {
    useAuthStore.getState().setSession({
      accessToken: "access-token-456",
      user: {
        email: "test@example.test",
        id: "user_2",
        name: "Test User",
      },
    });

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe("access-token-456");
    expect(state.user).toBeDefined();
    // refreshToken should not exist on the state at all
    expect("refreshToken" in state).toBe(false);
  });
});
