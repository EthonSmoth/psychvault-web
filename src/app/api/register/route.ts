import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createAndSendEmailVerification } from "@/lib/email-verification";
import { registerSchema } from "@/lib/validators";
import { logger } from "@/lib/logger";
import { jsonError } from "@/lib/http";
import { checkRateLimit, RATE_LIMITS, getClientIP } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const clientIP = getClientIP(request);
  const rateLimitKey = `registration:${clientIP}`;

  const rateLimitResult = await checkRateLimit(
    rateLimitKey,
    RATE_LIMITS.registration.max,
    RATE_LIMITS.registration.window
  );

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "Too many registration attempts. Please try again later.",
        retryAfter: rateLimitResult.resetInSeconds
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimitResult.resetInSeconds),
        },
      }
    );
  }

  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload.", details: parsed.error.flatten() }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      if (!existing.emailVerified) {
        await createAndSendEmailVerification({
          userId: existing.id,
          email: existing.email,
          name: existing.name,
        });

        return NextResponse.json(
          { error: "An account with this email already exists but is not verified yet. We sent a new verification email." },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: "Email already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const user = await db.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash
      }
    });

    await createAndSendEmailVerification({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json({ id: user.id, verificationSent: true }, { status: 201 });
  } catch (error) {
    logger.error("Failed to register user", error);
    return jsonError();
  }
}
