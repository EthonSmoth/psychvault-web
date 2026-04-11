import { NextResponse } from "next/server";
import { getPublicCacheControl } from "@/server/cache/public-cache";
import { getPublishedStoresBrowseData } from "@/server/queries/public-content";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sort = searchParams.get("sort");
  const stores = await getPublishedStoresBrowseData({
    query: searchParams.get("q") || undefined,
    sort:
      sort === "alphabetical" || sort === "resources" || sort === "newest"
        ? sort
        : undefined,
    page: searchParams.get("page") || undefined,
  });

  return NextResponse.json(
    stores,
    {
      headers: {
        "Cache-Control": getPublicCacheControl(),
      },
    }
  );
}

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
