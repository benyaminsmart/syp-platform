import { Redis } from "@upstash/redis";

// اگر کلیدهای Redis در .env تنظیم شده باشند، از Redis استفاده می‌کنیم.
// در غیر این صورت، از یک Map ساده در حافظه (برای توسعه) استفاده می‌کنیم.
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const memoryCache = new Map<string, { value: any; expiresAt: number }>();

export async function getCached<T>(key: string): Promise<T | null> {
  if (redis) {
    return await redis.get<T>(key);
  }
  const cached = memoryCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value as T;
  }
  memoryCache.delete(key);
  return null;
}

export async function setCached(key: string, value: any, ttlSeconds: number = 60): Promise<void> {
  if (redis) {
    await redis.set(key, value, { ex: ttlSeconds });
  } else {
    memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}
