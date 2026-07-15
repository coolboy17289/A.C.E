import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * In-memory token bucket keyed by client IP. Sufficient for v1 since the
 * backend only runs locally (Pi or dev laptop). When the server is ever
 * exposed to the public internet this should be swapped for a Redis-
 * backed limiter so it works across instances.
 *
 * - capacity:  burst size (max tokens a bucket can hold)
 * - refillPerSec: how many tokens/sec trickle back in
 * On each request we consume one token. If the bucket is empty we 429.
 *
 * We also keep a periodic sweep that drops buckets idle for > 5 min so
 * the Map can't grow without bound under heavy traffic.
 */
export interface RateLimitOptions {
  capacity: number;
  refillPerSec: number;
  /** Default 5 min - after this we forget about an idle IP. */
  idleMs?: number;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
  lastSeen: number;
}

export function createRateLimiter(opts: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, Bucket>();
  const idleMs = opts.idleMs ?? 5 * 60_000;

  // Periodic cleanup. unref() so it never holds the event loop open.
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) {
      if (now - v.lastSeen > idleMs) buckets.delete(k);
    }
  }, 60_000);
  cleanup.unref();

  return function rateLimit(req: Request, res: Response, next: NextFunction) {
    const ip = clientIp(req);
    const now = Date.now();
    let bucket = buckets.get(ip);
    if (!bucket) {
      bucket = { tokens: opts.capacity, lastRefill: now, lastSeen: now };
      buckets.set(ip, bucket);
    } else {
      // Refill based on elapsed time.
      const elapsedSec = (now - bucket.lastRefill) / 1000;
      bucket.tokens = Math.min(
        opts.capacity,
        bucket.tokens + elapsedSec * opts.refillPerSec,
      );
      bucket.lastRefill = now;
      bucket.lastSeen = now;
    }

    if (bucket.tokens < 1) {
      const retryAfter = Math.ceil((1 - bucket.tokens) / opts.refillPerSec);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        ok: false,
        error: {
          code: 'rate_limited',
          message: `Too many requests. Retry in ${retryAfter}s.`,
        },
        requestId: res.locals.requestId,
      });
      return;
    }
    bucket.tokens -= 1;
    next();
  };
}

/** Best-effort client IP. Honour X-Forwarded-For if we're behind a proxy. */
function clientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}
