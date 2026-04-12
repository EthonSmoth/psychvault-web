import crypto from "crypto";
import { db } from "@/lib/db";

type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetInSeconds: number;
};

const rateLimiters = new Map<string, { hits: number; resetTime: number }>();

// Applies a simple in-memory limit for local development or temporary database fallback.
function checkRateLimitMemory(
  key: string,
  maxAttempts: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const record = rateLimiters.get(key);

  if (!record || now > record.resetTime) {
    rateLimiters.set(key, { hits: 1, resetTime: now + windowMs });
    return { success: true, remaining: maxAttempts - 1, resetInSeconds: 0 };
  }

  if (record.hits < maxAttempts) {
    record.hits += 1;
    return {
      success: true,
      remaining: Math.max(0, maxAttempts - record.hits),
      resetInSeconds: Math.ceil((record.resetTime - now) / 1000),
    };
  }

  return {
    success: false,
    remaining: 0,
    resetInSeconds: Math.ceil((record.resetTime - now) / 1000),
  };
}

// Clears any local in-memory record after a successful login or completed verification step.
function clearRateLimitMemory(key: string) {
  rateLimiters.delete(key);
}

// Hashes rate-limit keys before persistence so raw emails or IPs are not stored directly.
function hashRateLimitKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

// Uses the shared database as the primary rate-limit store so limits apply across instances.
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<RateLimitResult> {
  const hashedKey = hashRateLimitKey(key);
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.rateLimitState.findUnique({
        where: { key: hashedKey },
      });

      if (!existing || existing.resetAt <= now) {
        await tx.rateLimitState.upsert({
          where: { key: hashedKey },
          update: {
            hits: 1,
            resetAt,
          },
          create: {
            key: hashedKey,
            hits: 1,
            resetAt,
          },
        });

        return {
          success: true,
          remaining: maxAttempts - 1,
          resetInSeconds: 0,
        };
      }

      if (existing.hits < maxAttempts) {
        const updated = await tx.rateLimitState.update({
          where: { key: hashedKey },
          data: {
            hits: {
              increment: 1,
            },
          },
          select: {
            hits: true,
            resetAt: true,
          },
        });

        return {
          success: true,
          remaining: Math.max(0, maxAttempts - updated.hits),
          resetInSeconds: Math.ceil((updated.resetAt.getTime() - now.getTime()) / 1000),
        };
      }

      return {
        success: false,
        remaining: 0,
        resetInSeconds: Math.ceil((existing.resetAt.getTime() - now.getTime()) / 1000),
      };
    });
  } catch {
    return checkRateLimitMemory(hashedKey, maxAttempts, windowMs);
  }
}

// Resets the shared limiter after a successful action so legitimate users are not penalized.
export async function clearRateLimit(key: string) {
  const hashedKey = hashRateLimitKey(key);
  clearRateLimitMemory(hashedKey);

  try {
    await db.rateLimitState.delete({
      where: { key: hashedKey },
    });
  } catch {
    // Ignore missing records or temporary database issues.
  }
}

export const RATE_LIMITS = {
  registration: { max: 5, window: 60 * 60 * 1000 },
  registrationPerEmail: { max: 3, window: 60 * 60 * 1000 },
  login: { max: 5, window: 15 * 60 * 1000 },
  verificationEmail: { max: 3, window: 60 * 60 * 1000 },
  verifyEmailAttempt: { max: 10, window: 15 * 60 * 1000 },
  contact: { max: 3, window: 60 * 60 * 1000 },
  checkout: { max: 10, window: 60 * 60 * 1000 },
  checkoutPerUser: { max: 15, window: 60 * 60 * 1000 },
  upload: { max: 20, window: 60 * 60 * 1000 },
  uploadPerUser: { max: 25, window: 60 * 60 * 1000 },
  resourceReport: { max: 5, window: 60 * 60 * 1000 },
  review: { max: 8, window: 60 * 60 * 1000 },
  messageSend: { max: 30, window: 10 * 60 * 1000 },
  messageRead: { max: 120, window: 10 * 60 * 1000 },
  viewerState: { max: 90, window: 10 * 60 * 1000 },
  publicDetail: { max: 180, window: 60 * 1000 },
  download: { max: 60, window: 15 * 60 * 1000 },
  publicBrowse: { max: 120, window: 60 * 1000 },
} as const;

// Attempts to derive the best available client IP for route-level abuse controls.
export function getClientIP(request: Request): string {
  return getClientIPFromHeaders(request.headers);
}

export function getClientIPFromHeaders(headers: Pick<globalThis.Headers, "get">) {
  const forwarded = headers.get("x-forwarded-for");
  const realIP = headers.get("x-real-ip");
  const cfIP = headers.get("cf-connecting-ip");

  return forwarded?.split(",")[0]?.trim() || realIP || cfIP || "unknown";
}
