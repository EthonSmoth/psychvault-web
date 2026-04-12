import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markConversationRead, findConversationForUser } from "@/server/actions/message-actions";
import { jsonError } from "@/lib/http";
import { ensureAllowedOrigin } from "@/lib/request-security";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

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

    const clientIP = getClientIP(request);
    const [userRateLimit, ipRateLimit] = await Promise.all([
      checkRateLimit(
        `message-read:user:${userId}`,
        RATE_LIMITS.messageRead.max,
        RATE_LIMITS.messageRead.window
      ),
      checkRateLimit(
        `message-read:ip:${clientIP}`,
        RATE_LIMITS.messageRead.max,
        RATE_LIMITS.messageRead.window
      ),
    ]);

    if (!userRateLimit.success || !ipRateLimit.success) {
      const retryAfter = Math.max(
        userRateLimit.resetInSeconds,
        ipRateLimit.resetInSeconds
      );

      return NextResponse.json(
        {
          error: "Too many requests. Please slow down and try again shortly.",
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

    await markConversationRead(conversationId, userId);
    return NextResponse.json({ message: "Conversation marked as read." }, { status: 200 });
  } catch (error) {
    return jsonError("Unable to mark conversation as read.", 500, error);
  }
}
