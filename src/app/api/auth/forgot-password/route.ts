import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validators";
import { createPasswordResetToken, getPasswordResetUrl } from "@/lib/password-reset";
import { trySendPasswordResetEmail } from "@/lib/email";
import { jsonError } from "@/lib/http";
import { ensureAllowedOrigin } from "@/lib/request-security";
import { checkRateLimit, RATE_LIMITS, getClientIP } from "@/lib/rate-limit";
import { db } from "@/lib/db";

// Always returns the same response regardless of whether the email exists,
// so this endpoint cannot be used to enumerate registered addresses.
const SAFE_RESPONSE = NextResponse.json(
  { ok: true, message: "If that address is registered, a reset link is on its way." },
  { status: 200 }
);

export async function POST(request: Request) {
  try {
    const originError = ensureAllowedOrigin(request);
    if (originError) return originError;

    const clientIP = getClientIP(request);
    const ipLimit = await checkRateLimit(
      `forgot-password:ip:${clientIP}`,
      RATE_LIMITS.passwordResetRequest.max,
      RATE_LIMITS.passwordResetRequest.window
    );

    if (!ipLimit.success) {
      return NextResponse.json(
        { error: "Too many reset requests. Please try again later.", retryAfter: ipLimit.resetInSeconds },
        { status: 429, headers: { "Retry-After": String(ipLimit.resetInSeconds) } }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      // Return safe response even on validation failure to avoid enumeration.
      return SAFE_RESPONSE;
    }

    const email = parsed.data.email.toLowerCase();

    const emailLimit = await checkRateLimit(
      `forgot-password:email:${email}`,
      RATE_LIMITS.passwordResetRequest.max,
      RATE_LIMITS.passwordResetRequest.window
    );

    if (!emailLimit.success) {
      // Still return safe response — don't reveal the email is registered.
      return SAFE_RESPONSE;
    }

    const user = await db.user.findUnique({
      where: { email },
      select: { name: true },
    });

    const token = await createPasswordResetToken(email);

    // If no token was created (unknown email or OAuth-only account), return safe response.
    if (!token || !user) {
      return SAFE_RESPONSE;
    }

    const resetUrl = getPasswordResetUrl(token);

    await trySendPasswordResetEmail({
      email,
      name: user.name,
      resetUrl,
    });

    return SAFE_RESPONSE;
  } catch (error) {
    return jsonError("Unable to process your request.", 500, error);
  }
}
