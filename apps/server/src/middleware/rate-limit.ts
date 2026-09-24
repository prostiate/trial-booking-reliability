import type { MiddlewareHandler } from 'hono';
import { BOOKING_ERROR_CODES } from '@trial-booking/shared';

interface RateBucket {
  timestamps: number[];
  burstTimestamps: number[];
}

const clientBuckets = new Map<string, RateBucket>();

export interface RateLimitOptions {
  windowMs: number;
  maxRequestsPerWindow: number;
  burstWindowMs: number;
  maxBurstRequests: number;
}

export function resetRateLimiterState(): void {
  clientBuckets.clear();
}

export function createRateLimiter(options: RateLimitOptions): MiddlewareHandler {
  return async (c, next) => {
    const clientIp =
      c.req.header('cf-connecting-ip') ??
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      '127.0.0.1';
    const methodCategory = c.req.method === 'GET' || c.req.method === 'HEAD' ? 'read' : 'write';
    const key = `${clientIp}:${methodCategory}`;
    const now = Date.now();

    const maxWindow =
      methodCategory === 'write' ? options.maxRequestsPerWindow : options.maxRequestsPerWindow * 4;
    const maxBurst =
      methodCategory === 'write' ? options.maxBurstRequests : options.maxBurstRequests * 3;

    let bucket = clientBuckets.get(key);
    if (!bucket) {
      bucket = { timestamps: [], burstTimestamps: [] };
      clientBuckets.set(key, bucket);
    }

    bucket.timestamps = bucket.timestamps.filter((t) => now - t < options.windowMs);
    bucket.burstTimestamps = bucket.burstTimestamps.filter((t) => now - t < options.burstWindowMs);

    const remaining = Math.max(0, maxWindow - bucket.timestamps.length);
    c.header('X-RateLimit-Limit', String(maxWindow));
    c.header('X-RateLimit-Remaining', String(remaining));

    if (bucket.timestamps.length >= maxWindow || bucket.burstTimestamps.length >= maxBurst) {
      const retryAfterSec = Math.ceil(options.burstWindowMs / 1000);
      c.header('Retry-After', String(retryAfterSec));
      return c.json(
        {
          ok: false,
          errorCode: BOOKING_ERROR_CODES.RATE_LIMIT_EXCEEDED,
          message: `Rate limit or burst threshold exceeded. Please wait ${retryAfterSec}s before retrying.`,
          data: null,
        },
        429
      );
    }

    bucket.timestamps.push(now);
    bucket.burstTimestamps.push(now);
    await next();
  };
}
