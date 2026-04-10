import { NextResponse } from "next/server";

// Retires the legacy publish endpoint so resources must publish through moderated server actions.
export async function POST() {
  return NextResponse.json(
    {
      error:
        "This legacy publish endpoint has been retired. Publish resources from the creator dashboard instead.",
    },
    { status: 410 }
  );
}
