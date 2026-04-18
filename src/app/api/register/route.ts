import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import { trySendVerificationEmail } from "@/lib/email";
import { jsonError } from "@/lib/http";
import { sanitizeUserText } from "@/lib/input-safety";
import { ensureAllowedOrigin } from "@/lib/request-security";
import { checkRateLimit, RATE_LIMITS, getClientIP } from "@/lib/rate-limit";

function normalizeEmail(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function POST(req: Request) {
  try {
    const originError = ensureAllowedOrigin(req);

    if (originError) {
      return originError;
    }

    const clientIP = getClientIP(req);
    const rateLimitResult = await checkRateLimit(
      `registration:${clientIP}`,
      RATE_LIMITS.registration.max,
      RATE_LIMITS.registration.window
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many signup attempts. Please try again later.",
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

    const name =
      typeof body?.name === "string"
        ? sanitizeUserText(body.name, { maxLength: 80 })
        : "";
    const email = normalizeEmail(
      typeof body?.email === "string" ? body.email : undefined
    );
    const password = typeof body?.password === "string" ? body.password : "";

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const emailRateLimit = await checkRateLimit(
      `registration-email:${email}`,
      RATE_LIMITS.registrationPerEmail.max,
      RATE_LIMITS.registrationPerEmail.window
    );

    if (!emailRateLimit.success) {
      return NextResponse.json(
        {
          error: "Too many signup attempts. Please try again later.",
          retryAfter: emailRateLimit.resetInSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(emailRateLimit.resetInSeconds),
          },
        }
      );
    }

    const existingUser =
      (await db.user.findUnique({ where: { email }, select: { id: true } })) ??
      (await db.user.findFirst({
        where: {
          email: {
            equals: email,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
        },
      }));

    if (existingUser) {
      return NextResponse.json(
        { error: "We couldn't create that account. Try logging in instead." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        emailVerified: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    const verificationToken = randomToken();
    const verificationExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await db.verificationToken.create({
      data: {
        identifier: user.email,
        token: verificationToken,
        expires: verificationExpiresAt,
      },
    });

    const verificationUrl = `${getBaseUrl()}/verify-email?token=${encodeURIComponent(
      verificationToken
    )}`;

    const sendResult = await trySendVerificationEmail({
      email: user.email,
      name: user.name,
      verificationUrl,
    });

    const emailStatus: "sent" | "skipped" | "failed" = sendResult.ok
      ? "sent"
      : sendResult.skipped
        ? "skipped"
        : "failed";

    return NextResponse.json(
      {
        ok: true,
        message:
          emailStatus === "sent"
            ? "Account created. Please check your email to verify your account."
            : "Account created. Verification email could not be sent right now.",
        emailStatus,
      },
      { status: 201 }
    );
  } catch (error) {
    return jsonError("Something went wrong while creating your account.", 500, error);
  }
}
