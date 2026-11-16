import { NextResponse } from 'next/server';
import { apiError } from './api-response';

/**
 * ==============================================================================
 * VYNTRA IN-MEMORY RATE LIMITER & ABUSE PROTECTION (MVP)
 * ==============================================================================
 * 
 * Provides defense-in-depth protection against brute-force attacks, endpoint spam,
 * and rapid duplicate submissions without external infrastructure dependencies.
 * 
 * ARCHITECTURE NOTE:
 * This implementation is node/instance-local and uses an in-memory sliding window.
 * In a distributed, multi-instance serverless or edge production environment,
 * persistent centralized rate limiting (e.g., Redis via Upstash or Cloudflare WAF)
 * should be integrated.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Automatic garbage collection: clean stale entries every 3 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    rateLimitStore.forEach((record: RateLimitRecord, key: string) => {
      // Remove timestamps older than 15 minutes
      record.timestamps = record.timestamps.filter((ts: number) => now - ts < 15 * 60 * 1000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    });
  }, 3 * 60 * 1000).unref?.();
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Checks whether a given key exceeds the maximum requests in the given time window.
 * 
 * @param key Unique identifier (e.g. `ip:127.0.0.1` or `user:usr-123:checkout`)
 * @param limit Maximum allowed requests within window
 * @param windowSeconds Window length in seconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const cutoff = now - windowMs;

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((ts: number) => ts > cutoff);

  if (record.timestamps.length >= limit) {
    const oldestInWindow = record.timestamps[0] || now;
    const resetInSeconds = Math.max(1, Math.ceil((oldestInWindow + windowMs - now) / 1000));
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetInSeconds,
    };
  }

  // Record this hit
  record.timestamps.push(now);
  const remaining = Math.max(0, limit - record.timestamps.length);

  return {
    allowed: true,
    limit,
    remaining,
    resetInSeconds: windowSeconds,
  };
}

/**
 * Extracts a client identifier from Request headers (IP or fallback).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

/**
 * Generates a standardized 429 Too Many Requests response with Retry-After header.
 */
export function rateLimitResponse(
  resetInSeconds: number,
  customMessage?: string
): NextResponse {
  const res = apiError(
    customMessage || `Too many requests. Please wait ${resetInSeconds} seconds before retrying.`,
    429,
    { retryAfterSeconds: resetInSeconds },
    'RATE_LIMIT_EXCEEDED'
  );
  res.headers.set('Retry-After', String(resetInSeconds));
  return res;
}
