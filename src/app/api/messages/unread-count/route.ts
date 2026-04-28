import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isEmailVerified } from "@/lib/require-email-verification";
import { getUnreadConversationCount } from "@/server/actions/message-actions";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId || !(await isEmailVerified(userId))) {
    return NextResponse.json({ count: 0 }, { headers: { "Cache-Control": "no-store" } });
  }

  const count = await getUnreadConversationCount(userId);
  return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } });
}
