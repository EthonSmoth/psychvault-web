import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSignedDownloadUrl } from "@/lib/storage";

type RouteContext = {
  params: Promise<{
    resourceId: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  const { resourceId } = await params;

  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    include: {
      store: {
        select: {
          ownerId: true,
          slug: true,
        },
      },
      files: {
        where: {
          kind: "MAIN_DOWNLOAD",
        },
        orderBy: {
          createdAt: "asc",
        },
        take: 1,
      },
    },
  });

  if (!resource) {
    return NextResponse.json(
      { error: "Resource not found." },
      {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  if (!session?.user?.id) {
    const loginUrl = new URL("/login", process.env.NEXT_PUBLIC_APP_URL || request.url);
    loginUrl.searchParams.set("redirectTo", `/resources/${resource.slug}`);
    return NextResponse.redirect(loginUrl, 303);
  }

  const userId = session.user.id;
  const isOwner = resource.store?.ownerId === userId;

  const purchase = await db.purchase.findUnique({
    where: {
      buyerId_resourceId: {
        buyerId: userId,
        resourceId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!isOwner && !purchase) {
    return NextResponse.json(
      { error: "You do not have access to this download." },
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const mainFile = resource.files[0];

  if (!mainFile?.fileUrl) {
    return NextResponse.json(
      { error: "No downloadable file is attached to this resource yet." },
      {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const signedUrl = await createSignedDownloadUrl(mainFile.fileUrl);

  if (!signedUrl) {
    return NextResponse.json(
      { error: "The downloadable file could not be prepared securely." },
      {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  return NextResponse.redirect(signedUrl, 303);
}
