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

  const resource = await db.resource.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      creatorId: true,
      store: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!resource || resource.status !== "PUBLISHED") {
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

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      emailVerified: true,
    },
  });

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

  const isOwner = resource.creatorId === user.id || resource.store?.ownerId === user.id;
  const [purchase, review] = await Promise.all([
    isOwner
      ? Promise.resolve({ id: "owner" })
      : db.purchase.findUnique({
          where: {
            buyerId_resourceId: {
              buyerId: user.id,
              resourceId: resource.id,
            },
          },
          select: {
            id: true,
          },
        }),
    db.review.findUnique({
      where: {
        buyerId_resourceId: {
          buyerId: user.id,
          resourceId: resource.id,
        },
      },
      select: {
        rating: true,
        body: true,
      },
    }),
  ]);

  return NextResponse.json(
    {
      authenticated: true,
      viewer: {
        userId: user.id,
        emailVerified: Boolean(user.emailVerified),
        isOwner,
        hasPurchased: Boolean(purchase),
        existingReview: review,
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
