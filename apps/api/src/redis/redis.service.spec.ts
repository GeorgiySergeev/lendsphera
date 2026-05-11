import { beforeEach, describe, expect, it, vi } from "vitest";

import { RedisService } from "./redis.service";

// ============================================================================
// Mock ioredis — we use a class-based mock with a shared instance reference
// so that dynamically-added methods (via defineCommand) are accessible in tests.
// ============================================================================

// Shared reference to the mock Redis instance created during construction.
let mockClient: Record<string, unknown>;

vi.mock("ioredis", () => {
  return {
    default: class MockRedis {
      constructor() {
        // Expose the instance for test access.
        mockClient = this as unknown as Record<string, unknown>;
      }

      set = vi.fn();
      get = vi.fn();
      del = vi.fn();
      ttl = vi.fn();
      quit = vi.fn();
      on = vi.fn();

      // Intercept defineCommand to actually register the method on the instance,
      // mimicking ioredis behavior. The Lua script itself is not executed — the
      // tests stub the registered method directly.
      defineCommand(name: string) {
        (this as Record<string, unknown>)[name] = vi.fn();
      }
    }
  };
});

// Suppress the env import side-effect (it reads actual env vars at import time).
vi.mock("../config/env", () => ({
  env: { REDIS_URL: "redis://localhost:6379" }
}));

describe("RedisService — Atomic Locks", () => {
  let service: RedisService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RedisService();
  });

  // Helper to access the mock client with proper typing.
  function client() {
    return mockClient as Record<string, ReturnType<typeof vi.fn>>;
  }

  // ==========================================================================
  // acquireLock — uses SET NX EX (natively atomic)
  // ==========================================================================

  describe("acquireLock", () => {
    it("should return true when lock is successfully acquired", async () => {
      client().set.mockResolvedValue("OK");

      const result = await service.acquireLock("landing-1", "user-a", 60);

      expect(result).toBe(true);
      expect(client().set).toHaveBeenCalledWith(
        "landing:lock:landing-1",
        "user-a",
        "EX",
        60,
        "NX"
      );
    });

    it("should return false when lock is already held", async () => {
      client().set.mockResolvedValue(null);

      const result = await service.acquireLock("landing-1", "user-b", 60);

      expect(result).toBe(false);
    });

    it("should propagate Redis errors", async () => {
      client().set.mockRejectedValue(new Error("Connection refused"));

      await expect(
        service.acquireLock("landing-1", "user-a", 60)
      ).rejects.toThrow("Connection refused");
    });
  });

  // ==========================================================================
  // releaseLock — Lua compare-and-delete
  // ==========================================================================

  describe("releaseLock", () => {
    it("should return true when lock owner matches (Lua returns 1)", async () => {
      client().releaseLockAtomic.mockResolvedValue(1);

      const result = await service.releaseLock("landing-1", "user-a");

      expect(result).toBe(true);
      expect(client().releaseLockAtomic).toHaveBeenCalledWith(
        "landing:lock:landing-1",
        "user-a"
      );
    });

    it("should return false when lock owner does not match (Lua returns 0)", async () => {
      client().releaseLockAtomic.mockResolvedValue(0);

      const result = await service.releaseLock("landing-1", "user-b");

      expect(result).toBe(false);
    });

    it("should return false when lock does not exist (Lua returns 0)", async () => {
      client().releaseLockAtomic.mockResolvedValue(0);

      const result = await service.releaseLock("nonexistent", "user-a");

      expect(result).toBe(false);
    });

    it("should propagate Redis errors", async () => {
      client().releaseLockAtomic.mockRejectedValue(new Error("NOSCRIPT"));

      await expect(
        service.releaseLock("landing-1", "user-a")
      ).rejects.toThrow("NOSCRIPT");
    });
  });

  // ==========================================================================
  // refreshLock — Lua compare-and-extend
  // ==========================================================================

  describe("refreshLock", () => {
    it("should return true when lock owner matches (Lua returns 1)", async () => {
      client().refreshLockAtomic.mockResolvedValue(1);

      const result = await service.refreshLock("landing-1", "user-a", 120);

      expect(result).toBe(true);
      expect(client().refreshLockAtomic).toHaveBeenCalledWith(
        "landing:lock:landing-1",
        "user-a",
        "120"
      );
    });

    it("should return false when lock owner does not match (Lua returns 0)", async () => {
      client().refreshLockAtomic.mockResolvedValue(0);

      const result = await service.refreshLock("landing-1", "user-b", 120);

      expect(result).toBe(false);
    });

    it("should use default TTL of 120 seconds when not specified", async () => {
      client().refreshLockAtomic.mockResolvedValue(1);

      await service.refreshLock("landing-1", "user-a");

      expect(client().refreshLockAtomic).toHaveBeenCalledWith(
        "landing:lock:landing-1",
        "user-a",
        "120"
      );
    });

    it("should propagate Redis errors", async () => {
      client().refreshLockAtomic.mockRejectedValue(
        new Error("Syntax error in Lua script")
      );

      await expect(
        service.refreshLock("landing-1", "user-a", 60)
      ).rejects.toThrow("Syntax error in Lua script");
    });
  });

  // ==========================================================================
  // getLockOwner — simple GET
  // ==========================================================================

  describe("getLockOwner", () => {
    it("should return the userId of the lock owner", async () => {
      client().get.mockResolvedValue("user-a");

      const owner = await service.getLockOwner("landing-1");

      expect(owner).toBe("user-a");
      expect(client().get).toHaveBeenCalledWith("landing:lock:landing-1");
    });

    it("should return null when no lock exists", async () => {
      client().get.mockResolvedValue(null);

      const owner = await service.getLockOwner("landing-1");

      expect(owner).toBeNull();
    });

    it("should return null on Redis errors (graceful degradation)", async () => {
      client().get.mockRejectedValue(new Error("timeout"));

      const owner = await service.getLockOwner("landing-1");

      expect(owner).toBeNull();
    });
  });

  // ==========================================================================
  // getLockTTL — simple TTL
  // ==========================================================================

  describe("getLockTTL", () => {
    it("should return remaining TTL in seconds", async () => {
      client().ttl.mockResolvedValue(95);

      const ttl = await service.getLockTTL("landing-1");

      expect(ttl).toBe(95);
    });

    it("should return -2 when key does not exist", async () => {
      client().ttl.mockResolvedValue(-2);

      const ttl = await service.getLockTTL("nonexistent");

      expect(ttl).toBe(-2);
    });
  });

  // ==========================================================================
  // Race condition scenario:
  // User B cannot release or refresh a lock owned by User A
  // ==========================================================================

  describe("Cross-user atomicity guarantees", () => {
    it("User B cannot release lock owned by User A", async () => {
      // Simulate: User A acquires the lock
      client().set.mockResolvedValue("OK");
      await service.acquireLock("landing-1", "user-a", 60);

      // User B tries to release → Lua script returns 0 (owner mismatch)
      client().releaseLockAtomic.mockResolvedValue(0);
      const releasedByB = await service.releaseLock("landing-1", "user-b");
      expect(releasedByB).toBe(false);

      // User A releases → Lua script returns 1 (owner match)
      client().releaseLockAtomic.mockResolvedValue(1);
      const releasedByA = await service.releaseLock("landing-1", "user-a");
      expect(releasedByA).toBe(true);
    });

    it("User B cannot refresh lock owned by User A", async () => {
      // Simulate: User A acquires the lock
      client().set.mockResolvedValue("OK");
      await service.acquireLock("landing-1", "user-a", 10);

      // User B tries to refresh → Lua script returns 0
      client().refreshLockAtomic.mockResolvedValue(0);
      const refreshedByB = await service.refreshLock(
        "landing-1",
        "user-b",
        60
      );
      expect(refreshedByB).toBe(false);

      // User A refreshes → Lua script returns 1
      client().refreshLockAtomic.mockResolvedValue(1);
      const refreshedByA = await service.refreshLock(
        "landing-1",
        "user-a",
        60
      );
      expect(refreshedByA).toBe(true);
    });
  });

  // ==========================================================================
  // Lua script registration via defineCommand
  // ==========================================================================

  describe("defineCommand registration", () => {
    it("should register releaseLockAtomic command on construction", () => {
      // The defineCommand mock in our MockRedis actually registers the method,
      // so we check that the method exists on the client.
      expect(typeof client().releaseLockAtomic).toBe("function");
    });

    it("should register refreshLockAtomic command on construction", () => {
      expect(typeof client().refreshLockAtomic).toBe("function");
    });
  });

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  describe("onModuleDestroy", () => {
    it("should cleanly disconnect from Redis", async () => {
      client().quit.mockResolvedValue("OK");

      await service.onModuleDestroy();

      expect(client().quit).toHaveBeenCalled();
    });
  });
});
