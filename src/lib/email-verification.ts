import crypto from "crypto";
import { db } from "@/lib/db";
import { getAppBaseUrl } from "@/lib/env";
import { sendVerificationEmail } from "@/lib/email";
import { getSafeRedirectTarget } from "@/lib/redirects";

const EMAIL_VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24;

// Reuses a friendly message anywhere the app needs to explain the verification requirement.
export const EMAIL_VERIFICATION_REQUIRED_MESSAGE =
  "Please verify your email address before using this feature.";

// Builds a safe in-app verification URL that can return the user to their original destination.
export function getVerifyEmailUrl(token: string, redirectTo?: string | null) {
  const url = new URL("/verify-email", getAppBaseUrl());
  url.searchParams.set("token", token);
  url.searchParams.set("redirectTo", getSafeRedirectTarget(redirectTo, "/library"));

  return url.toString();
}

// Creates a fresh verification token, replaces any old ones for the email, and emails the link.
export async function createAndSendEmailVerification(options: {
  userId: string;
  email: string;
  name?: string | null;
  redirectTo?: string | null;
}) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS);

  await db.verificationToken.deleteMany({
    where: {
      identifier: options.email.toLowerCase(),
    },
  });

  await db.verificationToken.create({
    data: {
      identifier: options.email.toLowerCase(),
      token,
      expires,
    },
  });

  const verificationUrl = getVerifyEmailUrl(token, options.redirectTo);

  await sendVerificationEmail({
    email: options.email,
    name: options.name || "there",
    verificationUrl,
  });
}

// Marks a user as verified when a valid token is presented and cleans up stale tokens.
export async function verifyEmailAddress(token: string) {
  const cleanedToken = token.trim();

  if (!cleanedToken) {
    return { ok: false as const, error: "Missing verification token." };
  }

  const record = await db.verificationToken.findUnique({
    where: { token: cleanedToken },
  });

  if (!record) {
    return { ok: false as const, error: "This verification link is invalid or has already been used." };
  }

  if (record.expires.getTime() < Date.now()) {
    await db.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: record.identifier,
          token: record.token,
        },
      },
    });

    return { ok: false as const, error: "This verification link has expired. Please request a new one." };
  }

  const user = await db.user.findUnique({
    where: { email: record.identifier },
    select: {
      id: true,
      emailVerified: true,
    },
  });

  if (!user) {
    return { ok: false as const, error: "We could not find an account for this verification link." };
  }

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: user.emailVerified ?? new Date(),
      },
    }),
    db.verificationToken.deleteMany({
      where: { identifier: record.identifier },
    }),
  ]);

  return { ok: true as const };
}

// Looks up the latest verification state for a signed-in user.
export async function getUserVerificationState(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
    },
  });

  return {
    user,
    isVerified: Boolean(user?.emailVerified),
  };
}
