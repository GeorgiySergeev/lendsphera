import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { env } from "../config/env";

// ============================================================================
// Lua Scripts — Atomic Redis Operations
//
// Redis executes Lua scripts atomically: the entire script runs as a single
// operation, eliminating the time window between GET → check → SET/EXPIRE
// that creates race conditions in the non-atomic JS-based approach.
// ============================================================================

/**
 * Atomic compare-and-delete script.
 *
 * Returns 1 if the lock was owned by the expected userId and was deleted,
 * returns 0 if the lock is owned by a different user or does not exist.
 *
 * KEYS[1] = lock key
 * ARGV[1] = expected userId (lock owner)
 */
const RELEASE_LOCK_LUA = `
  if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
  else
    return 0
  end
`;

/**
 * Atomic compare-and-extend script.
 *
 * Returns 1 if the lock TTL was extended (owner matched),
 * returns 0 if the lock is owned by a different user or does not exist.
 *
 * KEYS[1] = lock key
 * ARGV[1] = expected userId (lock owner)
 * ARGV[2] = new TTL in seconds
 */
const REFRESH_LOCK_LUA = `
  if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('expire', KEYS[1], tonumber(ARGV[2]))
  else
    return 0
  end
`;

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor() {
    this.client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    this.client.on("error", (error) => {
      this.logger.error("Redis connection error", error);
    });

    this.client.on("connect", () => {
      this.logger.log("Redis connected");
    });

    // Register Lua scripts as custom commands.
    // ioredis uses EVALSHA internally (with EVAL fallback on NOSCRIPT)
    // for automatic script caching and better performance.
    this.client.defineCommand("releaseLockAtomic", {
      numberOfKeys: 1,
      lua: RELEASE_LOCK_LUA
    });

    this.client.defineCommand("refreshLockAtomic", {
      numberOfKeys: 1,
      lua: REFRESH_LOCK_LUA
    });
  }

  // ============ PUBLIC METHODS ============

  /**
   * Acquire a distributed lock using SET NX EX (natively atomic in Redis ≥ 2.6.12).
   *
   * @returns `true` if lock was acquired, `false` if already held by another owner.
   */
  async acquireLock(
    landingId: string,
    userId: string,
    ttlSeconds: number = 120
  ): Promise<boolean> {
    const key = this.lockKey(landingId);

    try {
      // SET with NX + EX is a single atomic Redis command —
      // no race window between existence check and value setting.
      const result = await this.client.set(key, userId, "EX", ttlSeconds, "NX");
      return result === "OK";
    } catch (error) {
      this.logger.error(`acquireLock failed for landingId=${landingId}`, error);
      throw error;
    }
  }

  /**
   * Atomically release a lock **only** if it is owned by `userId`.
   *
   * Uses a Lua script to guarantee that between the ownership check (GET)
   * and the deletion (DEL), no other client can modify the key.
   *
   * @returns `true` if the lock existed, was owned by `userId`, and was deleted.
   *          `false` if the lock does not exist or belongs to a different user.
   */
  async releaseLock(landingId: string, userId: string): Promise<boolean> {
    const key = this.lockKey(landingId);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (this.client as any).releaseLockAtomic(key, userId);
      return result === 1;
    } catch (error) {
      this.logger.error(`releaseLock failed for landingId=${landingId}`, error);
      throw error;
    }
  }

  /**
   * Atomically refresh (extend) a lock's TTL **only** if it is owned by `userId`.
   *
   * Uses a Lua script to guarantee that between the ownership check (GET)
   * and the TTL extension (EXPIRE), no other client can acquire or modify the key.
   *
   * This prevents the critical race condition where:
   *   1. User A's lock expires.
   *   2. User B acquires the lock.
   *   3. User A's stale refreshLock call extends User B's lock.
   *
   * @returns `true` if the lock was owned by `userId` and TTL was extended.
   *          `false` if the lock does not exist or belongs to a different user.
   */
  async refreshLock(
    landingId: string,
    userId: string,
    ttlSeconds: number = 120
  ): Promise<boolean> {
    const key = this.lockKey(landingId);

    try {
      const result = await (this.client as any).refreshLockAtomic(
        key,
        userId,
        ttlSeconds.toString()
      );
      return result === 1;
    } catch (error) {
      this.logger.error(`refreshLock failed for landingId=${landingId}`, error);
      throw error;
    }
  }

  /**
   * Retrieve the current lock owner for a given landing.
   *
   * @returns The userId of the lock owner, or `null` if no lock is held.
   */
  async getLockOwner(landingId: string): Promise<string | null> {
    const key = this.lockKey(landingId);

    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`getLockOwner failed for landingId=${landingId}`, error);
      return null;
    }
  }

  /**
   * Retrieve the remaining TTL (in seconds) for a given landing lock.
   *
   * @returns TTL in seconds, -2 if key doesn't exist, -1 if key has no expiry.
   */
  async getLockTTL(landingId: string): Promise<number> {
    const key = this.lockKey(landingId);
    return await this.client.ttl(key);
  }

  // ============ LIFECYCLE ============

  async onModuleDestroy() {
    await this.client.quit();
  }

  // ============ PRIVATE HELPERS ============

  private lockKey(landingId: string): string {
    return `landing:lock:${landingId}`;
  }
}
