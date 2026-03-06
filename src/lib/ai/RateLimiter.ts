/**
 * RateLimiter - Per-student rate limiting for AI endpoints
 * 
 * Implements sliding window rate limiting to prevent abuse and control costs.
 * 
 * Requirements: 8.4
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if a request is allowed for the given student
   * Returns { allowed: true } or { allowed: false, retryAfter: number }
   */
  checkLimit(studentId: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const key = studentId;

    // Get or create entry
    let entry = this.limits.get(key);

    // Reset if window has expired
    if (!entry || now >= entry.resetAt) {
      entry = {
        count: 0,
        resetAt: now + this.config.windowMs,
      };
      this.limits.set(key, entry);
    }

    // Check if limit exceeded
    if (entry.count >= this.config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000); // seconds
      return {
        allowed: false,
        retryAfter,
      };
    }

    // Increment count and allow
    entry.count++;
    return { allowed: true };
  }

  /**
   * Clean up expired entries (call periodically)
   */
  cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.limits.entries());
    for (const [key, entry] of entries) {
      if (now >= entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }
}

// Singleton instances for each endpoint
export const visionRateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
});

export const chatRateLimiter = new RateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000, // 1 minute
});

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    visionRateLimiter.cleanup();
    chatRateLimiter.cleanup();
  }, 5 * 60 * 1000);
}
