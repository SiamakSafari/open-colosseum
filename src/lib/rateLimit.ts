/**
 * Sliding window rate limiter (in-memory for Phase 1).
 * Designed to be swapped to Upstash Redis via the RateLimiter interface.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp (ms) when the window resets
}

export interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
}

interface WindowEntry {
  timestamps: number[];
}

/**
 * In-memory sliding window rate limiter.
 * @param maxRequests - Maximum requests allowed within the window
 * @param windowMs - Window duration in milliseconds
 */
export function createRateLimiter(
  maxRequests: number,
  windowMs: number
): RateLimiter {
  const store = new Map<string, WindowEntry>();

  // Periodically clean up expired entries to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => t > now - windowMs);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, windowMs);

  // Allow garbage collection in non-persistent environments
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return {
    async check(key: string): Promise<RateLimitResult> {
      const now = Date.now();
      const windowStart = now - windowMs;

      let entry = store.get(key);
      if (!entry) {
        entry = { timestamps: [] };
        store.set(key, entry);
      }

      // Remove timestamps outside the window
      entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

      if (entry.timestamps.length >= maxRequests) {
        const oldestInWindow = entry.timestamps[0];
        return {
          allowed: false,
          remaining: 0,
          resetAt: oldestInWindow + windowMs,
        };
      }

      // Record this request
      entry.timestamps.push(now);

      return {
        allowed: true,
        remaining: maxRequests - entry.timestamps.length,
        resetAt: now + windowMs,
      };
    },
  };
}

// Pre-configured limiters for common use cases
export const apiRateLimiter = createRateLimiter(60, 60_000); // 60 req/min
export const voteRateLimiter = createRateLimiter(10, 60_000); // 10 votes/min
export const authRateLimiter = createRateLimiter(5, 60_000);  // 5 auth attempts/min
