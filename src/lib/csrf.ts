import crypto from "crypto";
import { getRequiredServerEnv } from "@/lib/env";

const TOKEN_EXPIRY_MS = 60 * 60 * 1000;

// Resolves the signing secret lazily so builds do not fail during module evaluation.
function getCsrfSecret() {
  const configured = process.env.CSRF_SECRET?.trim();

  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    return getRequiredServerEnv("CSRF_SECRET");
  }

  return "development-csrf-secret-change-me";
}

// Encodes binary data into a URL-safe base64 string for token transport.
function toBase64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

// Decodes a URL-safe base64 segment back into a Buffer for signature checks.
function fromBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + "=".repeat(padding), "base64");
}

// Signs the session-bound token payload so the server can validate it statelessly.
function signToken(sessionId: string, nonce: string, expires: string) {
  return crypto
    .createHmac("sha256", getCsrfSecret())
    .update(`${sessionId}:${nonce}:${expires}`)
    .digest();
}

// Creates a signed CSRF token tied to a specific authenticated user session id.
export function generateCSRFToken(sessionId: string): string {
  const nonce = toBase64Url(crypto.randomBytes(32));
  const expires = String(Date.now() + TOKEN_EXPIRY_MS);
  const signature = toBase64Url(signToken(sessionId, nonce, expires));

  return `${nonce}.${expires}.${signature}`;
}

// Verifies token shape, expiry, and signature before allowing a state-changing action.
export function verifyCSRFToken(token: string, sessionId: string): boolean {
  if (!token || !sessionId) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }

  const [nonce, expires, signature] = parts;
  const expiresAt = Number(expires);

  if (!nonce || !signature || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return false;
  }

  try {
    const expectedSignature = signToken(sessionId, nonce, expires);
    const providedSignature = fromBase64Url(signature);

    if (expectedSignature.length !== providedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedSignature, providedSignature);
  } catch {
    return false;
  }
}
