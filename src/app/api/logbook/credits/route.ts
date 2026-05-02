import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const record = await db.parseCredit.findUnique({
    where: { userId: session.user.id },
    select: { credits: true },
  });

  return NextResponse.json({ credits: record?.credits ?? 0 });
}
