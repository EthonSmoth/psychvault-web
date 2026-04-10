import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markConversationRead, findConversationForUser } from "@/server/actions/message-actions";
import { jsonError } from "@/lib/http";

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
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
