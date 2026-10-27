export interface RateLimitConfig {
  readonly limit: number;
  readonly windowMs: number;
}

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private readonly config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  public isAllowed(key: string): { allowed: boolean; remaining: number; retryAfterMs?: number } {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.config.limit - 1, lastRefill: now };
      this.buckets.set(key, bucket);
      return { allowed: true, remaining: bucket.tokens };
    }

    const elapsed = now - bucket.lastRefill;
    if (elapsed >= this.config.windowMs) {
      bucket.tokens = this.config.limit;
      bucket.lastRefill = now;
    }

    if (bucket.tokens > 0) {
      bucket.tokens -= 1;
      return { allowed: true, remaining: bucket.tokens };
    }

    const retryAfterMs = this.config.windowMs - elapsed;
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  public reset(key: string): void {
    this.buckets.delete(key);
  }
}
