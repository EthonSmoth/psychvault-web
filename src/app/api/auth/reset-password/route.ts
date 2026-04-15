import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { resetPasswordSchema } from "@/lib/validators";
import { consumePasswordResetToken } from "@/lib/password-reset";
import { jsonError } from "@/lib/http";
import { ensureAllowedOrigin } from "@/lib/request-security";
import { checkRateLimit, RATE_LIMITS, getClientIP } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const originError = ensureAllowedOrigin(request);
    if (originError) return originError;

    const clientIP = getClientIP(request);
    const ipLimit = await checkRateLimit(
      `reset-password:ip:${clientIP}`,
      RATE_LIMITS.passwordResetConsume.max,
      RATE_LIMITS.passwordResetConsume.window
    );

    if (!ipLimit.success) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later.", retryAfter: ipLimit.resetInSeconds },
        { status: 429, headers: { "Retry-After": String(ipLimit.resetInSeconds) } }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Invalid request.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { token, password } = parsed.data;

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await consumePasswordResetToken(token, passwordHash);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: "Password updated. You can now log in." });
  } catch (error) {
    return jsonError("Unable to reset your password.", 500, error);
  }
}
