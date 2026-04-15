import crypto from "crypto";
import { db } from "@/lib/db";
import { getAppBaseUrl } from "@/lib/env";

const PASSWORD_RESET_TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour

// Builds the URL the user clicks in the reset email.
export function getPasswordResetUrl(token: string) {
  const url = new URL("/reset-password", getAppBaseUrl());
  url.searchParams.set("token", token);
  return url.toString();
}

// Creates a fresh reset token for the given email address, deleting any previous one.
// Returns the token string so the caller can send it in an email.
// Always returns silently if the email is not found — callers should not reveal
// whether a given email exists in the system.
export async function createPasswordResetToken(email: string): Promise<string | null> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, passwordHash: true },
  });

  // No account found, or account uses OAuth only (no password to reset).
  if (!user || !user.passwordHash) {
    return null;
  }

  // Delete any existing tokens for this email before creating a new one.
  await db.passwordResetToken.deleteMany({
    where: { email: normalizedEmail },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

  await db.passwordResetToken.create({
    data: {
      email: normalizedEmail,
      token,
      expires,
    },
  });

  return token;
}

// Validates a reset token and returns the associated user email if valid.
export async function validatePasswordResetToken(
  token: string
): Promise<{ ok: true; email: string; userId: string } | { ok: false; error: string }> {
  const cleanedToken = token.trim();

  if (!cleanedToken) {
    return { ok: false, error: "Missing reset token." };
  }

  const record = await db.passwordResetToken.findUnique({
    where: { token: cleanedToken },
  });

  if (!record) {
    return { ok: false, error: "This reset link is invalid or has already been used." };
  }

  if (record.expires.getTime() < Date.now()) {
    await db.passwordResetToken.delete({ where: { token: cleanedToken } });
    return { ok: false, error: "This reset link has expired. Please request a new one." };
  }

  const user = await db.user.findUnique({
    where: { email: record.email },
    select: { id: true },
  });

  if (!user) {
    return { ok: false, error: "No account found for this reset link." };
  }

  return { ok: true, email: record.email, userId: user.id };
}

// Applies the new password hash and deletes the consumed token in a single transaction.
export async function consumePasswordResetToken(
  token: string,
  newPasswordHash: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const validation = await validatePasswordResetToken(token);

  if (!validation.ok) {
    return validation;
  }

  await db.$transaction([
    db.user.update({
      where: { id: validation.userId },
      data: { passwordHash: newPasswordHash },
    }),
    db.passwordResetToken.deleteMany({
      where: { email: validation.email },
    }),
  ]);

  return { ok: true };
}
