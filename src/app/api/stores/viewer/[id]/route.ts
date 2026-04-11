import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateCSRFToken } from "@/lib/csrf";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  const session = await auth();
  const { id } = await params;

  const store = await db.store.findUnique({
    where: { id },
    select: {
      id: true,
      isPublished: true,
      ownerId: true,
    },
  });

  if (!store || !store.isPublished) {
    return NextResponse.json(
      { error: "Store not found." },
      {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json(
      {
        authenticated: false,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const [user, follow] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        emailVerified: true,
      },
    }),
    db.follow.findUnique({
      where: {
        followerId_storeId: {
          followerId: session.user.id,
          storeId: id,
        },
      },
      select: {
        followerId: true,
      },
    }),
  ]);

  if (!user) {
    return NextResponse.json(
      {
        authenticated: false,
      },
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
      viewer: {
        userId: user.id,
        emailVerified: Boolean(user.emailVerified),
        isOwner: store.ownerId === user.id,
        isFollowing: Boolean(follow),
        csrfToken: generateCSRFToken(user.id),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
