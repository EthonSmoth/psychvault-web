import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json(
      { authenticated: false },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email,
        role: session.user.role ?? "BUYER",
        emailVerified: Boolean(session.user.emailVerified),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
