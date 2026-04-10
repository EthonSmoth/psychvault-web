import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/validators";
import { sendContactEmail } from "@/lib/email";
import { jsonError } from "@/lib/http";
import { checkRateLimit, RATE_LIMITS, getClientIP } from "@/lib/rate-limit";

export async function POST(request: Request) {
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
      return NextResponse.json({ error: "Invalid contact request.", details: parsed.error.flatten() }, { status: 400 });
    }

    await sendContactEmail(parsed.data);

    return NextResponse.json({ message: "Contact message sent." }, { status: 201 });
  } catch (error) {
    return jsonError("Unable to send contact message.", 500, error);
  }
}
