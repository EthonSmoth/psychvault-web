import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isEmailVerified } from "@/lib/require-email-verification";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { sanitizeUserText } from "@/lib/input-safety";
import { ensureAllowedOrigin } from "@/lib/request-security";
import { checkRateLimit, RATE_LIMITS, getClientIP } from "@/lib/rate-limit";
import { createMessage, findConversationForUser } from "@/server/actions/message-actions";
import { z } from "zod";

const messageSchema = z.object({
  body: z.string().min(1).max(5000),
});

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const originError = ensureAllowedOrigin(request);

    if (originError) {
      return originError;
    }

    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (!(await isEmailVerified(userId))) {
      return NextResponse.json(
        { error: "Please verify your email before sending messages." },
        { status: 403 }
      );
    }

    const clientIP = getClientIP(request);
    const [userRateLimit, ipRateLimit] = await Promise.all([
      checkRateLimit(
        `message-send:user:${userId}`,
        RATE_LIMITS.messageSend.max,
        RATE_LIMITS.messageSend.window
      ),
      checkRateLimit(
        `message-send:ip:${clientIP}`,
        RATE_LIMITS.messageSend.max,
        RATE_LIMITS.messageSend.window
      ),
    ]);

    if (!userRateLimit.success || !ipRateLimit.success) {
      const retryAfter = Math.max(
        userRateLimit.resetInSeconds,
        ipRateLimit.resetInSeconds
      );

      return NextResponse.json(
        {
          error: "Too many messages sent. Please slow down and try again shortly.",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
          },
        }
      );
    }

    const { conversationId } = await params;
    const conversation = await findConversationForUser(conversationId, userId);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid message payload." }, { status: 400 });
    }

    const messageBody = sanitizeUserText(parsed.data.body, {
      maxLength: 5000,
      preserveNewlines: true,
    });

    if (!messageBody) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }

    await createMessage(conversationId, userId, messageBody);

    return NextResponse.json({ message: "Message sent." }, { status: 201 });
  } catch (error) {
    return jsonError("Unable to send message.", 500, error);
  }
}
