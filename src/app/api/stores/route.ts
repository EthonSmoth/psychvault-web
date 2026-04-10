import { NextResponse } from "next/server";

// Retires the legacy JSON writer so stores must save through the moderated creator flow.
export async function POST() {
  return NextResponse.json(
    {
      error:
        "This legacy store write endpoint has been retired. Use the authenticated creator dashboard instead.",
    },
    { status: 410 }
  );
}
