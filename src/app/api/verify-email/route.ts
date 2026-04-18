import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { ensureAllowedOrigin } from "@/lib/request-security";
import { checkRateLimit, RATE_LIMITS, getClientIP } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const originError = ensureAllowedOrigin(req);

    if (originError) {
      return originError;
    }

    const clientIP = getClientIP(req);
    const rateLimitResult = await checkRateLimit(
      `verify-email:${clientIP}`,
      RATE_LIMITS.verifyEmailAttempt.max,
      RATE_LIMITS.verifyEmailAttempt.window
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many verification attempts. Please try again later.",
          retryAfter: rateLimitResult.resetInSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.resetInSeconds),
          },
        }
      );
    }

    const body = await req.json().catch(() => null);
    const token = typeof body?.token === "string" ? body.token.trim() : "";

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required." },
        { status: 400 }
      );
    }

    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Invalid verification token." },
        { status: 400 }
      );
    }

    if (verificationToken.expires.getTime() < Date.now()) {
      await db.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: verificationToken.identifier,
            token: verificationToken.token,
          },
        },
      });

      return NextResponse.json(
        { error: "Verification token has expired." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: verificationToken.identifier },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No matching user found for this verification token." },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
      },
    });

    await db.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: verificationToken.token,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Email verified successfully.",
    });
  } catch (error) {
    return jsonError("Unable to verify email right now.", 500, error);
  }
}
