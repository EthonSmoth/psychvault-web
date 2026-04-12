import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/validators";
import { sendContactEmail } from "@/lib/email";
import { jsonError } from "@/lib/http";
import { ensureAllowedOrigin } from "@/lib/request-security";
import { checkRateLimit, RATE_LIMITS, getClientIP } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const originError = ensureAllowedOrigin(request);

  if (originError) {
    return originError;
  }

  const clientIP = getClientIP(request);
  const rateLimitKey = `contact:${clientIP}`;

  const rateLimitResult = await checkRateLimit(
    rateLimitKey,
    RATE_LIMITS.contact.max,
    RATE_LIMITS.contact.window
  );

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "Too many contact form submissions. Please try again later.",
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
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.flatten();
      const firstFieldError = Object.values(details.fieldErrors)
        .flat()
        .find((message): message is string => Boolean(message));

      return NextResponse.json(
        {
          error: firstFieldError || "Invalid contact request.",
        },
        { status: 400 }
      );
    }

    const emailRateLimit = await checkRateLimit(
      `contact-email:${parsed.data.email.trim().toLowerCase()}`,
      RATE_LIMITS.contact.max,
      RATE_LIMITS.contact.window
    );

    if (!emailRateLimit.success) {
      return NextResponse.json(
        {
          error: "Too many contact form submissions. Please try again later.",
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

    await sendContactEmail(parsed.data);

    return NextResponse.json({ message: "Contact message sent." }, { status: 201 });
  } catch (error) {
    return jsonError("Unable to send contact message.", 500, error);
  }
}
