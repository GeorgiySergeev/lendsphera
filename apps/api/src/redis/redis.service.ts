import { Injectable, Logger } from "@nestjs/common";
import { Redis } from "ioredis";
import { env } from "../config/env";

@Injectable()
export class RedisService {
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
  }

  async acquireLock(
    landingId: string,
    userId: string,
    ttlSeconds: number = 120
  ): Promise<boolean> {
    const key = `landing:lock:${landingId}`;
    const result = await this.client.set(key, userId, "EX", ttlSeconds, "NX");
    return result === "OK";
  }

  async refreshLock(
    landingId: string,
    userId: string,
    ttlSeconds: number = 120
  ): Promise<boolean> {
    const key = `landing:lock:${landingId}`;
    const currentOwner = await this.client.get(key);

    if (currentOwner !== userId) {
      return false;
    }

    await this.client.expire(key, ttlSeconds);
    return true;
  }

  async releaseLock(landingId: string, userId: string): Promise<boolean> {
    const key = `landing:lock:${landingId}`;
    const currentOwner = await this.client.get(key);

    if (currentOwner !== userId) {
      return false;
    }

    await this.client.del(key);
    return true;
  }

  async getLockOwner(landingId: string): Promise<string | null> {
    const key = `landing:lock:${landingId}`;
    return await this.client.get(key);
  }

  async getLockTTL(landingId: string): Promise<number> {
    const key = `landing:lock:${landingId}`;
    return await this.client.ttl(key);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
