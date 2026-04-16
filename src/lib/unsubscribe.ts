import crypto from "crypto";
import { getAppBaseUrl } from "@/lib/env";

// Long-lived (30 day) HMAC token for one-click email unsubscribe.
// Stateless — no DB table needed. Token encodes userId + expiry + signature.

const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret() {
  const s = process.env.CSRF_SECRET?.trim();
  return s ?? "development-unsub-secret";
}

function toBase64Url(buf: Buffer) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sign(userId: string, expires: string) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(`unsub:${userId}:${expires}`)
    .digest();
}

export function generateUnsubscribeToken(userId: string): string {
  const expires = String(Date.now() + EXPIRY_MS);
  const sig = toBase64Url(sign(userId, expires));
  return `${Buffer.from(userId).toString("base64url")}.${expires}.${sig}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [userIdB64, expires, sig] = parts;
    const expiresAt = Number(expires);
    if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
    const userId = Buffer.from(userIdB64, "base64url").toString();
    const expected = sign(userId, expires);
    const provided = Buffer.from(sig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    if (expected.length !== provided.length) return null;
    if (!crypto.timingSafeEqual(expected, provided)) return null;
    return userId;
  } catch {
    return null;
  }
}

export function buildUnsubscribeUrl(userId: string): string {
  const token = generateUnsubscribeToken(userId);
  return `${getAppBaseUrl()}/unsubscribe?token=${encodeURIComponent(token)}`;
}
