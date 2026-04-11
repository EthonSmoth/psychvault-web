import { NextResponse } from "next/server";
import { getPublicCacheControl } from "@/server/cache/public-cache";
import { getPublishedResourcesBrowseData } from "@/server/queries/public-content";

// Returns a sanitized list of published resources for public integrations.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resources = await getPublishedResourcesBrowseData({
    q: searchParams.get("q") || undefined,
    category: searchParams.get("category") || undefined,
    tag: searchParams.get("tag") || undefined,
    price: searchParams.get("price") || undefined,
    store: searchParams.get("store") || undefined,
    sort: searchParams.get("sort") || undefined,
  });

  return NextResponse.json(
    { resources },
    {
      headers: {
        "Cache-Control": getPublicCacheControl(),
      },
    }
  );
}

// Retires the older JSON writer so creator changes must go through the moderated UI flow.
export async function POST() {
  return NextResponse.json(
    {
      error:
        "This legacy write endpoint has been retired. Use the authenticated creator dashboard instead.",
    },
    { status: 410 }
  );
}
