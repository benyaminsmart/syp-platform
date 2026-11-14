import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// در محیط Edge، فقط از Upstash Redis استفاده می‌کنیم
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

export const createEdgeRateLimiter = (limit: number, window: string) => {
  if (!redis) {
    // در محیط تست (بدون Redis)، همیشه اجازه می‌دهیم
    return {
      limit: async () => ({ success: true, remaining: limit }),
    };
  }
  
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window as any),
  });
};

export const claimCodeEdgeLimiter = createEdgeRateLimiter(5, "1 m");
